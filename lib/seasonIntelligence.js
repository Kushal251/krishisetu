import { prisma } from "./prisma";
import { getForecastSeason, getStaticWeather } from "./staticWeather";

const ARRIVAL_STATUSES = ["ARRIVED", "INSPECTION", "GRADED", "COMPLETED"];
const DEMAND_STATUSES = ["ORDERED", "PHYSICAL_CHECK_PENDING", "PHYSICAL_CHECKED", "CONFIRMED", "PAID"];
const YIELD_PER_ACRE = { SOYBEAN: 8, WHEAT: 18, RICE: 20, MAIZE: 20, COTTON: 7, PULSES: 7 };
const DEFAULT_RELIABILITY = 0.75;

const number = (value) => Number(value || 0);
const sum = (items, pick) => items.reduce((total, item) => total + number(pick(item)), 0);
const districtKey = (value) => String(value || "").trim().toLowerCase();
const cropKey = (value) => String(value || "").trim().toUpperCase();
const inAcres = (area, unit) => number(area) * (String(unit).toUpperCase() === "HECTARE" ? 2.47105 : 1);
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

function fallbackYieldFactor(condition) {
  if (condition === "Heavy Rain") return 0.84;
  if (condition === "Rainy") return 0.95;
  if (condition === "Hot") return 0.8;
  if (condition === "Cool") return 0.97;
  return 1;
}

function reliabilityFor(centerId, buyerOrders, tradeOrders) {
  const buyerResolved = buyerOrders.filter((order) => order.listing.centerId === centerId && ["PAID", "CANCELLED"].includes(order.status));
  const tradeResolved = tradeOrders.filter((order) => order.sellerCenterId === centerId && ["PAID", "CANCELLED"].includes(order.status));
  const resolved = buyerResolved.length + tradeResolved.length;
  const successful = buyerResolved.filter((order) => order.status === "PAID").length + tradeResolved.filter((order) => order.status === "PAID").length;
  return { score: resolved ? successful / resolved : DEFAULT_RELIABILITY, completed: successful, resolved };
}

export function estimateDistanceKm(originDistrict, originState, destinationDistrict, destinationState) {
  if (districtKey(originDistrict) && districtKey(originDistrict) === districtKey(destinationDistrict)) return 15;
  if (districtKey(originState) && districtKey(originState) === districtKey(destinationState)) return 75;
  return 250;
}

export async function getSeasonalCenterSignals({ crop = "SOYBEAN", now = new Date() } = {}) {
  const activeSeason = await prisma.season.findFirst({
    where: { status: "ACTIVE" },
    include: { weatherProfiles: true },
    orderBy: { startDate: "desc" },
  });
  const currentStart = activeSeason?.startDate || new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const currentEnd = activeSeason?.endDate || now;
  const previousSeason = activeSeason && await prisma.season.findFirst({
    where: { name: activeSeason.name, status: "CLOSED", startDate: { lt: activeSeason.startDate } },
    include: { weatherProfiles: true },
    orderBy: { startDate: "desc" },
  });
  const historyStart = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

  const [centers, registrations, currentBookings, previousBookings, currentBuyerOrders, previousBuyerOrders, currentTrades, previousTrades, performanceBuyerOrders, performanceTrades] = await Promise.all([
    prisma.center.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true, name: true, district: true, state: true, totalCapacity: true, usedCapacity: true,
        listings: { where: { crop, isActive: true }, select: { availableQty: true, reservedQty: true, availableUntil: true } },
      },
    }),
    activeSeason ? prisma.seasonRegistration.findMany({
      where: { seasonId: activeSeason.id, status: "VERIFIED" },
      select: { farmer: { select: { seller: { select: { district: true, state: true } } } }, crops: { select: { cropName: true, area: true, unit: true, expectedHarvestDate: true } } },
    }) : [],
    prisma.booking.findMany({ where: { crop, slotStart: { gte: currentStart, lte: currentEnd }, status: { notIn: ["CANCELLED", "NO_SHOW"] } }, select: { centerId: true, quantity: true, status: true, slotStart: true } }),
    previousSeason ? prisma.booking.findMany({ where: { crop, slotStart: { gte: previousSeason.startDate, lte: previousSeason.endDate }, status: { notIn: ["CANCELLED", "NO_SHOW"] } }, select: { centerId: true, quantity: true, status: true } }) : [],
    prisma.buyerOrder.findMany({ where: { createdAt: { gte: currentStart, lte: currentEnd }, status: { in: DEMAND_STATUSES } }, select: { requestedQty: true, finalQty: true, listing: { select: { centerId: true } } } }),
    previousSeason ? prisma.buyerOrder.findMany({ where: { createdAt: { gte: previousSeason.startDate, lte: previousSeason.endDate }, status: { in: DEMAND_STATUSES } }, select: { requestedQty: true, finalQty: true, listing: { select: { centerId: true } } } }) : [],
    prisma.centerTradeOrder.findMany({ where: { createdAt: { gte: currentStart, lte: currentEnd }, status: { in: DEMAND_STATUSES } }, select: { sellerCenterId: true, requestedQty: true, finalQty: true } }),
    previousSeason ? prisma.centerTradeOrder.findMany({ where: { createdAt: { gte: previousSeason.startDate, lte: previousSeason.endDate }, status: { in: DEMAND_STATUSES } }, select: { sellerCenterId: true, requestedQty: true, finalQty: true } }) : [],
    prisma.buyerOrder.findMany({ where: { createdAt: { gte: historyStart } }, select: { status: true, listing: { select: { centerId: true } } } }),
    prisma.centerTradeOrder.findMany({ where: { createdAt: { gte: historyStart } }, select: { sellerCenterId: true, status: true } }),
  ]);

  const centersPerDistrict = new Map();
  for (const center of centers) centersPerDistrict.set(districtKey(center.district), (centersPerDistrict.get(districtKey(center.district)) || 0) + 1);
  const declarationsByDistrict = new Map();
  for (const registration of registrations) {
    const district = registration.farmer.seller.district;
    const key = districtKey(district);
    const weatherProfile = activeSeason?.weatherProfiles.find((profile) => districtKey(profile.district) === key);
    const staticWeather = getStaticWeather(district, now);
    const yieldFactor = weatherProfile?.yieldFactor ?? fallbackYieldFactor(staticWeather.condition);
    const matchingCrops = registration.crops.filter((declared) => cropKey(declared.cropName) === cropKey(crop === "PULSES" ? "PULSES" : crop));
    const rawSupply = sum(matchingCrops, (declared) => inAcres(declared.area, declared.unit) * (YIELD_PER_ACRE[crop] || 8));
    const current = declarationsByDistrict.get(key) || { raw: 0, adjusted: 0, farmerCount: 0 };
    current.raw += rawSupply;
    current.adjusted += rawSupply * yieldFactor;
    if (matchingCrops.length) current.farmerCount += 1;
    declarationsByDistrict.set(key, current);
  }

  const duration = Math.max(1, currentEnd.getTime() - currentStart.getTime());
  const seasonProgress = clamp((now.getTime() - currentStart.getTime()) / duration, 0.1, 1);
  const signals = new Map();
  for (const center of centers) {
    const key = districtKey(center.district);
    const districtDeclarations = declarationsByDistrict.get(key) || { raw: 0, adjusted: 0, farmerCount: 0 };
    const centerShare = Math.max(1, centersPerDistrict.get(key) || 1);
    const declaredSupply = districtDeclarations.raw / centerShare;
    const weatherAdjustedSupply = districtDeclarations.adjusted / centerShare;
    const incomingBookings = currentBookings.filter((booking) => booking.centerId === center.id && booking.slotStart >= now);
    const receivedBookings = currentBookings.filter((booking) => booking.centerId === center.id && ARRIVAL_STATUSES.includes(booking.status));
    const currentIncomingSupply = sum(incomingBookings, (booking) => booking.quantity);
    const currentReceivedSupply = sum(receivedBookings, (booking) => booking.quantity);
    const previousReceivedSupply = sum(previousBookings.filter((booking) => booking.centerId === center.id && ARRIVAL_STATUSES.includes(booking.status)), (booking) => booking.quantity);
    const currentBuyerDemand = sum(currentBuyerOrders.filter((order) => order.listing.centerId === center.id), (order) => order.finalQty || order.requestedQty);
    const currentTradeDemand = sum(currentTrades.filter((order) => order.sellerCenterId === center.id), (order) => order.finalQty || order.requestedQty);
    const previousBuyerDemand = sum(previousBuyerOrders.filter((order) => order.listing.centerId === center.id), (order) => order.finalQty || order.requestedQty);
    const previousTradeDemand = sum(previousTrades.filter((order) => order.sellerCenterId === center.id), (order) => order.finalQty || order.requestedQty);
    const currentDemand = currentBuyerDemand + currentTradeDemand;
    const previousDemand = previousBuyerDemand + previousTradeDemand;
    const paceProjection = currentDemand / seasonProgress;
    const projectedDemand = previousSeason ? Math.max(currentDemand, previousDemand * 0.55 + paceProjection * 0.45) : Math.max(currentDemand, paceProjection);
    const currentStock = sum(center.listings.filter((listing) => listing.availableUntil >= now), (listing) => Math.max(0, number(listing.availableQty) - number(listing.reservedQty)));
    const expectedSeasonSupply = currentStock + Math.max(currentIncomingSupply, Math.max(0, weatherAdjustedSupply - currentReceivedSupply));
    const shortageQuintal = Math.max(0, projectedDemand - expectedSeasonSupply);
    const surplusQuintal = Math.max(0, expectedSeasonSupply - projectedDemand);
    const weatherProfile = activeSeason?.weatherProfiles.find((profile) => districtKey(profile.district) === key);
    const staticWeather = getStaticWeather(center.district, now);
    const reliability = reliabilityFor(center.id, performanceBuyerOrders, performanceTrades);
    signals.set(center.id, {
      centerId: center.id,
      season: activeSeason ? { id: activeSeason.id, name: activeSeason.name, year: activeSeason.year, progressPct: Math.round(seasonProgress * 100) } : { id: null, name: getForecastSeason(now), year: String(now.getUTCFullYear()), progressPct: null },
      previousSeason: previousSeason ? { id: previousSeason.id, name: previousSeason.name, year: previousSeason.year } : null,
      declaredSupplyQuintal: declaredSupply,
      weatherAdjustedDeclaredSupplyQuintal: weatherAdjustedSupply,
      declaredFarmerCount: Math.round(districtDeclarations.farmerCount / centerShare),
      incomingBookingsQuintal: currentIncomingSupply,
      receivedSupplyQuintal: currentReceivedSupply,
      previousSeasonSupplyQuintal: previousReceivedSupply,
      currentDemandQuintal: currentDemand,
      previousSeasonDemandQuintal: previousDemand,
      projectedDemandQuintal: projectedDemand,
      currentStockQuintal: currentStock,
      expectedSeasonSupplyQuintal: expectedSeasonSupply,
      shortageQuintal,
      surplusQuintal,
      reliabilityPct: Math.round(reliability.score * 100),
      completedTransactions: reliability.completed,
      resolvedTransactions: reliability.resolved,
      weather: weatherProfile ? {
        condition: weatherProfile.condition,
        rainfallMm: weatherProfile.rainfallMm,
        temperatureC: weatherProfile.temperatureC,
        yieldFactor: weatherProfile.yieldFactor,
        qualityFactor: weatherProfile.qualityFactor,
        transportFactor: weatherProfile.transportFactor,
        note: weatherProfile.note,
        source: "ADMIN_SEASON_PROFILE",
      } : { ...staticWeather, yieldFactor: fallbackYieldFactor(staticWeather.condition), qualityFactor: 1, transportFactor: 1 },
    });
  }
  return { activeSeason, previousSeason, signals };
}
