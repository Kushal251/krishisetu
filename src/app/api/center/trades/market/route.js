import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../../../../lib/prisma";
import { verifyToken } from "../../../../../../lib/jwt";
import { getCenterTradeActor } from "../../../../../../lib/centerTrade";
import { getMarketForecast } from "../../../../../../lib/marketForecast";
import { estimateDistanceKm, getSeasonalCenterSignals } from "../../../../../../lib/seasonIntelligence";

export async function GET(request) {
  try {
    const session = verifyToken((await cookies()).get("token")?.value);
    const adminCenterId = new URL(request.url).searchParams.get("centerId");
    const actor = await getCenterTradeActor(session?.id, adminCenterId);
    if (!actor) return NextResponse.json({ message: "Center operator access required." }, { status: 403 });

    const [listings, buyerCenter, seasonal, priorTrades] = await Promise.all([
      prisma.centerListing.findMany({
      where: { centerId: { not: actor.centerId }, isActive: true, availableUntil: { gte: new Date() }, availableQty: { gt: 0 } },
      include: { center: { select: { id: true, name: true, district: true, state: true, address: true, phone: true } } },
      }),
      prisma.center.findUnique({ where: { id: actor.centerId }, select: { id: true, name: true, district: true, state: true } }),
      getSeasonalCenterSignals({ crop: "SOYBEAN" }),
      prisma.centerTradeOrder.findMany({ where: { buyerCenterId: actor.centerId, status: "PAID" }, select: { sellerCenterId: true } }),
    ]);
    const buyerSignal = seasonal.signals.get(actor.centerId);
    const recommendedTradeQty = Math.max(0, Number(buyerSignal?.shortageQuintal || 0));
    const comparisonQuantity = Math.max(10, recommendedTradeQty || 10);
    const forecast = await getMarketForecast({ crop: "SOYBEAN", quantityQuintal: comparisonQuantity, originDistrict: buyerCenter.district, originState: buyerCenter.state });
    const forecastByCenter = new Map(forecast.results.map((item) => [item.centerId, item]));
    const successfulSuppliers = new Set(priorTrades.map((trade) => trade.sellerCenterId));
    const rankedListings = listings.map((listing) => {
      const available = Number(listing.availableQty) - Number(listing.reservedQty);
      const insight = forecastByCenter.get(listing.centerId);
      const supplierSignal = seasonal.signals.get(listing.centerId);
      const suggestedQuantity = Math.min(available, recommendedTradeQty || comparisonQuantity);
      const distanceKm = estimateDistanceKm(buyerCenter.district, buyerCenter.state, listing.center.district, listing.center.state);
      const transportCost = (distanceKm * 45 + suggestedQuantity * 40) * Number(supplierSignal?.weather?.transportFactor || 1);
      const landedCostPerQuintal = Number(listing.pricePerQuintal) + transportCost / Math.max(suggestedQuantity, 1);
      const priorSuccess = successfulSuppliers.has(listing.centerId);
      const reliabilityPct = supplierSignal?.reliabilityPct || insight?.reliabilityPct || 75;
      const score = Math.round(Math.min(99, 35 + reliabilityPct * 0.3 + Math.min(20, available / Math.max(comparisonQuantity, 1) * 8) + (priorSuccess ? 10 : 0) - Math.max(0, landedCostPerQuintal - Number(insight?.predictedPricePerQuintal || listing.pricePerQuintal)) / 100));
      return { ...listing, recommendation: { rank: 0, score, suggestedQuantityQuintal: suggestedQuantity, suggestedQuantity, distanceKm, transportCost, landedCostPerQuintal, reliabilityPct, priorSuccess, supplierSurplusQuintal: supplierSignal?.surplusQuintal || 0, supplierSurplus: supplierSignal?.surplusQuintal || 0, weatherCondition: supplierSignal?.weather?.condition || "Normal", predictedPricePerQuintal: insight?.predictedPricePerQuintal || Number(listing.pricePerQuintal), reasons: [`${reliabilityPct}% supplier reliability`, priorSuccess ? "Previous successful trade" : null, supplierSignal?.surplusQuintal > 0 ? `${supplierSignal.surplusQuintal.toFixed(1)} q seasonal surplus` : "Live stock available"].filter(Boolean) } };
    }).sort((a, b) => b.recommendation.score - a.recommendation.score).map((listing, index) => ({ ...listing, recommendation: { ...listing.recommendation, rank: index + 1 } }));
    const action = recommendedTradeQty > 0 ? "BUY" : buyerSignal?.surplusQuintal > 0 ? "SELL" : "HOLD";
    const message = action === "BUY" ? `Projected local demand exceeds expected supply. Source up to ${recommendedTradeQty.toFixed(2)} quintal.` : action === "SELL" ? "Expected supply is above local demand. Avoid unnecessary purchase and offer surplus to buyers or other centers." : "Expected supply and demand are balanced. Monitor new declarations and orders.";
    return NextResponse.json({ listings: rankedListings, decision: { centerName: buyerCenter.name, season: buyerSignal?.season || null, currentStock: buyerSignal?.currentStockQuintal || 0, expectedSeasonSupply: buyerSignal?.expectedSeasonSupplyQuintal || 0, expectedSeasonSupplyQuintal: buyerSignal?.expectedSeasonSupplyQuintal || 0, projectedDemand: buyerSignal?.projectedDemandQuintal || 0, projectedLocalDemandQuintal: buyerSignal?.projectedDemandQuintal || 0, previousSeasonSupply: buyerSignal?.previousSeasonSupplyQuintal || 0, previousSeasonSupplyQuintal: buyerSignal?.previousSeasonSupplyQuintal || 0, previousSeasonDemand: buyerSignal?.previousSeasonDemandQuintal || 0, previousSeasonDemandQuintal: buyerSignal?.previousSeasonDemandQuintal || 0, declaredIncoming: buyerSignal?.weatherAdjustedDeclaredSupplyQuintal || 0, declaredIncomingSupplyQuintal: buyerSignal?.weatherAdjustedDeclaredSupplyQuintal || 0, shortage: buyerSignal?.shortageQuintal || 0, shortageQuintal: buyerSignal?.shortageQuintal || 0, surplus: buyerSignal?.surplusQuintal || 0, surplusQuintal: buyerSignal?.surplusQuintal || 0, recommendedTradeQty, recommendedTradeQtyQuintal: recommendedTradeQty, action, message, weather: buyerSignal?.weather || null }, forecast: { mode: forecast.mode, modelVersion: forecast.modelVersion } });
  } catch (error) {
    console.error("Center trade marketplace failed", error);
    return NextResponse.json({ message: "Could not load center marketplace." }, { status: 500 });
  }
}
