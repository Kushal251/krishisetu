import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../../../lib/prisma";
import { verifyToken } from "../../../../../lib/jwt";
import { getMarketForecast } from "../../../../../lib/marketForecast";

const number = (value) => Number(value || 0);

export async function GET(request) {
  try {
    const session = verifyToken((await cookies()).get("token")?.value);
    const user = session?.id && await prisma.user.findUnique({ where: { id: session.id }, include: { buyer: true, center: true } });
    if (!user || !["BUYER", "ADMIN"].includes(user.role)) return NextResponse.json({ message: "Buyer or admin access required." }, { status: 403 });
    const params = new URL(request.url).searchParams;
    const requestedQuantity = Number(params.get("quantity") || 10);
    const preferredQuantity = Number.isFinite(requestedQuantity) && requestedQuantity > 0 ? Math.min(100000, requestedQuantity) : 10;
    const preferredGrade = ["A", "B", "C"].includes(params.get("grade")) ? params.get("grade") : "A";
    const now = new Date();
    const [listings, centers, priorOrders, forecast] = await Promise.all([
      prisma.centerListing.findMany({
        where: { crop: "SOYBEAN", isActive: true, availableUntil: { gte: now }, availableQty: { gt: 0 } },
        include: { center: { select: { id: true, name: true, district: true, state: true, address: true, phone: true } } },
      }),
      prisma.center.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, name: true, district: true, state: true, address: true, phone: true, cropPrices: { where: { crop: "SOYBEAN" }, select: { price: true, unit: true, updatedAt: true } } },
      }),
      user.buyer ? prisma.buyerOrder.findMany({ where: { buyerId: user.buyer.id, status: "PAID" }, select: { listing: { select: { centerId: true } } } }) : [],
      getMarketForecast({ crop: "SOYBEAN", quantityQuintal: preferredQuantity, originDistrict: user.buyer?.district || user.center?.district || "Bhopal", originState: user.buyer?.state || user.center?.state || "Madhya Pradesh" }),
    ]);
    const forecastByCenter = new Map(forecast.results.map((item) => [item.centerId, item]));
    const successfulCenters = new Set(priorOrders.map((order) => order.listing.centerId));
    const rankedCenters = centers.map((center) => {
      const insight = forecastByCenter.get(center.id);
      const priorBoost = successfulCenters.has(center.id) ? 8 : 0;
      const matchScore = Math.round(Math.min(99, 35 + number(insight?.reliabilityPct) * 0.35 + Math.min(20, number(insight?.currentSupplyQuintal) / Math.max(preferredQuantity, 1) * 5) + priorBoost));
      return { ...center, recommendation: { matchScore, priorSuccessfulPurchase: priorBoost > 0, predictedPricePerQuintal: insight?.predictedPricePerQuintal || number(center.cropPrices[0]?.price), predictedDemandQuintal: insight?.predictedDemandQuintal || 0, currentSupplyQuintal: insight?.currentSupplyQuintal || 0, reliabilityPct: insight?.reliabilityPct || 75, distanceKm: insight?.distanceKm || 250, seasonalShortageQuintal: insight?.seasonIntelligence?.shortageQuintal || 0 } };
    }).sort((a, b) => b.recommendation.matchScore - a.recommendation.matchScore);
    const rankedListings = listings.map((listing) => {
      const insight = forecastByCenter.get(listing.centerId);
      const available = number(listing.availableQty) - number(listing.reservedQty);
      const gradeMatch = listing.grade === preferredGrade;
      const priorSuccess = successfulCenters.has(listing.centerId);
      const landedCostPerQuintal = number(listing.pricePerQuintal) + number(insight?.transportCost) / preferredQuantity;
      const stockFit = Math.min(20, available / preferredQuantity * 8);
      const score = Math.round(Math.min(99, 30 + number(insight?.reliabilityPct) * 0.3 + stockFit + (gradeMatch ? 12 : 0) + (priorSuccess ? 8 : 0) - Math.max(0, landedCostPerQuintal - number(insight?.predictedPricePerQuintal)) / 100));
      const reasons = [gradeMatch ? `Grade ${preferredGrade} match` : `Grade ${listing.grade}`, `${number(insight?.reliabilityPct || 75)}% center reliability`, available >= preferredQuantity ? "Requested stock available" : "Partial quantity only", priorSuccess ? "Previously successful center" : null].filter(Boolean);
      return { ...listing, recommendation: { score, rank: 0, reasons, availableQuintal: available, landedCostPerQuintal, predictedMarketPricePerQuintal: insight?.predictedPricePerQuintal || number(listing.pricePerQuintal), predictedDemandQuintal: insight?.predictedDemandQuintal || 0, reliabilityPct: insight?.reliabilityPct || 75, distanceKm: insight?.distanceKm || 250, gradeMatch, priorSuccess } };
    }).sort((a, b) => b.recommendation.score - a.recommendation.score).map((listing, index) => ({ ...listing, recommendation: { ...listing.recommendation, rank: index + 1 } }));
    return NextResponse.json({ listings: rankedListings, centers: rankedCenters, verificationStatus: user.buyer?.verificationStatus || "ADMIN", adminMode: user.role === "ADMIN", preference: { quantityQuintal: preferredQuantity, grade: preferredGrade }, forecast: { mode: forecast.mode, modelVersion: forecast.modelVersion } });
  } catch (error) {
    console.error("Buyer marketplace failed", error);
    return NextResponse.json({ message: "Could not load buyer marketplace." }, { status: 500 });
  }
}
