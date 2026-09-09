import { prisma } from "./prisma";
import { getForecastSeason, getStaticWeather } from "./staticWeather";
import { estimateDistanceKm, getSeasonalCenterSignals } from "./seasonIntelligence";

const ACTIVE_ORDER_STATUSES = ["ORDERED", "PHYSICAL_CHECK_PENDING", "PHYSICAL_CHECKED", "CONFIRMED", "PAID"];
const ML_TIMEOUT_MS = 12_000;

const number = (value) => Number(value || 0);
const sum = (items, pick) => items.reduce((total, item) => total + number(pick(item)), 0);

function heuristicPrediction(record) {
  const demandPressure = record.recentDemandQuintal - record.currentSupplyQuintal;
  const weatherMultiplier = record.weather === "Heavy Rain" ? 0.985 : record.weather === "Rainy" ? 0.995 : 1;
  const demandMultiplier = Math.min(1.12, Math.max(0.9, 1 + demandPressure / Math.max(record.currentSupplyQuintal, 100) * 0.035));
  const predictedPrice = record.previousPricePerQuintal * weatherMultiplier * demandMultiplier;
  return {
    centerId: record.centerId,
    predictedDemandQuintal: Math.max(0, record.recentDemandQuintal * 0.65 + record.incomingSupplyQuintal * 0.2 + 5),
    predictedPricePerQuintal: Math.max(0, predictedPrice),
  };
}

async function callMlService(records) {
  const serviceUrl = process.env.ML_SERVICE_URL || "http://127.0.0.1:8000";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ML_TIMEOUT_MS);
  try {
    const response = await fetch(`${serviceUrl.replace(/\/$/, "")}/predict/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ records }),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`ML service returned ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function getMarketForecast({ crop = "SOYBEAN", quantityQuintal = 10, originDistrict = "", originState = "" } = {}) {
  const now = new Date();
  const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const centers = await prisma.center.findMany({
    where: { status: "ACTIVE", cropPrices: { some: { crop } } },
    select: {
      id: true, name: true, district: true, state: true,
      cropPrices: { where: { crop }, select: { price: true, updatedAt: true }, take: 1 },
      priceHistory: { where: { crop, recordedAt: { gte: since } }, select: { price: true, recordedAt: true }, orderBy: { recordedAt: "desc" }, take: 30 },
      listings: {
        where: { crop },
        select: {
          availableQty: true, reservedQty: true, isActive: true, grade: true, availableUntil: true,
          orders: { where: { createdAt: { gte: since }, status: { in: ACTIVE_ORDER_STATUSES } }, select: { requestedQty: true, finalQty: true, status: true } },
        },
      },
      bookings: { where: { crop, slotStart: { gte: since }, status: { notIn: ["CANCELLED", "NO_SHOW"] } }, select: { quantity: true, status: true } },
      tradeSales: { where: { createdAt: { gte: since }, status: { in: ACTIVE_ORDER_STATUSES } }, select: { requestedQty: true, finalQty: true, status: true } },
    },
    orderBy: { name: "asc" },
  });

  const seasonal = await getSeasonalCenterSignals({ crop, now });
  const records = centers.map((center) => {
    const seasonSignal = seasonal.signals.get(center.id);
    const currentListings = center.listings.filter((listing) => listing.isActive && listing.availableUntil >= now);
    const currentSupplyQuintal = sum(currentListings, (listing) => Math.max(0, number(listing.availableQty) - number(listing.reservedQty)));
    const incomingSupplyQuintal = sum(center.bookings.filter((booking) => !["COMPLETED"].includes(booking.status)), (booking) => booking.quantity);
    const buyerDemand = sum(center.listings.flatMap((listing) => listing.orders), (order) => order.finalQty || order.requestedQty);
    const centerDemand = sum(center.tradeSales, (order) => order.finalQty || order.requestedQty);
    const grades = currentListings.map((listing) => listing.grade);
    const qualityGrade = grades.includes("A") ? "A" : grades.includes("B") ? "B" : grades.includes("C") ? "C" : "B";
    const weather = seasonSignal?.weather || getStaticWeather(center.district, now);
    const previousPricePerQuintal = number(center.priceHistory[0]?.price || center.cropPrices[0]?.price);
    return {
      centerId: center.id,
      crop: crop === "SOYBEAN" ? "Soybean" : crop,
      district: center.district,
      month: now.getUTCMonth() + 1,
      season: seasonSignal?.season?.name ? `${String(seasonSignal.season.name)[0]}${String(seasonSignal.season.name).slice(1).toLowerCase()} Harvest` : getForecastSeason(now),
      weather: weather.condition,
      rainfallMm: weather.rainfallMm,
      temperatureC: weather.temperatureC,
      qualityGrade,
      currentSupplyQuintal,
      incomingSupplyQuintal: Math.max(incomingSupplyQuintal, number(seasonSignal?.weatherAdjustedDeclaredSupplyQuintal)),
      recentDemandQuintal: Math.max(buyerDemand + centerDemand, number(seasonSignal?.projectedDemandQuintal)),
      previousPricePerQuintal,
      stockQuintal: currentSupplyQuintal,
    };
  });

  let predictionPayload;
  try {
    predictionPayload = await callMlService(records);
  } catch (error) {
    console.warn("ML service unavailable; using deterministic forecast fallback", error.message);
    predictionPayload = { mode: "heuristic", modelVersion: "fallback-v1", predictions: records.map(heuristicPrediction) };
  }

  const predictionByCenter = new Map(predictionPayload.predictions.map((prediction) => [prediction.centerId, prediction]));
  const results = centers.map((center, index) => {
    const prediction = predictionByCenter.get(center.id) || heuristicPrediction(records[index]);
    const seasonSignal = seasonal.signals.get(center.id);
    const distanceKm = estimateDistanceKm(originDistrict, originState, center.district, center.state);
    const transportCost = (distanceKm * 45 + quantityQuintal * 40) * number(seasonSignal?.weather?.transportFactor || 1);
    const rawModelPricePerQuintal = number(prediction.predictedPricePerQuintal);
    const declaredCenterPricePerQuintal = number(center.cropPrices[0]?.price);
    const payablePricePerQuintal = Math.min(rawModelPricePerQuintal || declaredCenterPricePerQuintal, declaredCenterPricePerQuintal);
    const grossRevenue = quantityQuintal * payablePricePerQuintal;
    const mandiFee = grossRevenue * 0.01;
    const netAmount = grossRevenue - transportCost - mandiFee;
    return {
      centerId: center.id,
      centerName: center.name,
      district: center.district,
      state: center.state,
      distanceKm,
      currentSupplyQuintal: records[index].currentSupplyQuintal,
      recentDemandQuintal: records[index].recentDemandQuintal,
      predictedDemandQuintal: number(prediction.predictedDemandQuintal),
      predictedPricePerQuintal: payablePricePerQuintal,
      rawModelPricePerQuintal,
      priceCappedAtCenterRate: rawModelPricePerQuintal > declaredCenterPricePerQuintal,
      currentPricePerQuintal: declaredCenterPricePerQuintal,
      grossRevenue,
      transportCost,
      mandiFee,
      netAmount,
      reliabilityPct: seasonSignal?.reliabilityPct ?? 75,
      seasonIntelligence: seasonSignal || null,
      recommendationScore: netAmount + (seasonSignal?.reliabilityPct || 75) * 25 + number(seasonSignal?.shortageQuintal) * 10,
      weather: { condition: records[index].weather, rainfallMm: records[index].rainfallMm, temperatureC: records[index].temperatureC, source: seasonSignal?.weather?.source || "STATIC_DISTRICT_MONTH_PROFILE", yieldFactor: seasonSignal?.weather?.yieldFactor || 1, note: seasonSignal?.weather?.note || null },
    };
  }).sort((a, b) => b.recommendationScore - a.recommendationScore);

  return { crop, quantityQuintal, generatedAt: now.toISOString(), mode: predictionPayload.mode, modelVersion: predictionPayload.modelVersion, results };
}
