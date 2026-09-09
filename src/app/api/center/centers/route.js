import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../../../lib/prisma";
import { verifyToken } from "../../../../../lib/jwt";
import { getMarketForecast } from "../../../../../lib/marketForecast";
import { resolveMpLocation } from "../../../../../lib/mpLocations";

async function requireAdmin() {
  const session = verifyToken((await cookies()).get("token")?.value);
  if (!session?.id) return null;
  return prisma.user.findUnique({ where: { id: session.id }, select: { id: true, role: true } });
}

// GET /api/center/centers — list all centers (any authenticated user)
export async function GET(request) {
  try {
    const session = verifyToken((await cookies()).get("token")?.value);
    if (!session?.id) return NextResponse.json({ message: "Please log in." }, { status: 401 });
    const viewer = await prisma.user.findUnique({ where: { id: session.id }, select: { id: true, role: true, seller: { select: { id: true, district: true, state: true } }, buyer: { select: { district: true, state: true } }, center: { select: { district: true, state: true } } } });
    if (!viewer) return NextResponse.json({ message: "Account not found." }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const state    = searchParams.get("state")?.trim();
    const district = searchParams.get("district")?.trim();
    const status   = searchParams.get("status");
    const recommend = searchParams.get("recommend") === "true";
    const requestedQuantity = Number(searchParams.get("quantity") || 10);
    const quantityQuintal = Number.isFinite(requestedQuantity) && requestedQuantity > 0 ? Math.min(requestedQuantity, 100000) : 10;

    const centers = await prisma.center.findMany({
      where: {
        ...(status && status !== "ALL" ? { status } : {}),
        ...(state    ? { state:    { contains: state,    mode: "insensitive" } } : {}),
        ...(district ? { district: { contains: district, mode: "insensitive" } } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        cropPrices: { where: { crop: "SOYBEAN" }, select: { crop: true, price: true, unit: true, updatedAt: true } },
        _count: { select: { bookings: true, operators: true } },
      },
    });

    if (!recommend) return NextResponse.json({ centers });
    const forecast = await getMarketForecast({
      crop: "SOYBEAN",
      quantityQuintal,
      originDistrict: viewer.seller?.district || viewer.buyer?.district || viewer.center?.district || "",
      originState: viewer.seller?.state || viewer.buyer?.state || viewer.center?.state || "",
    });
    const forecastByCenter = new Map(forecast.results.map((item) => [item.centerId, item]));
    const priorBookings = viewer.seller ? await prisma.booking.findMany({ where: { sellerId: viewer.seller.id, status: "COMPLETED" }, select: { centerId: true } }) : [];
    const successfulCenters = new Set(priorBookings.map((booking) => booking.centerId));
    const ranked = centers.map((center) => {
      const insight = forecastByCenter.get(center.id);
      const priorBoost = successfulCenters.has(center.id) ? 8 : 0;
      const score = Math.round(Math.min(99, 30 + Number(insight?.reliabilityPct || 75) * 0.3 + Math.min(20, Number(insight?.predictedDemandQuintal || 0) / Math.max(quantityQuintal, 1) * 3) + priorBoost + Math.max(0, Number(insight?.netAmount || 0)) / Math.max(quantityQuintal * 10000, 1)));
      return { ...center, recommendation: { rank: 0, score, priorSuccessfulSale: priorBoost > 0, predictedPricePerQuintal: insight?.predictedPricePerQuintal || Number(center.cropPrices[0]?.price || 0), predictedDemandQuintal: insight?.predictedDemandQuintal || 0, expectedNetAmount: insight?.netAmount || 0, estimatedNetAmount: insight?.netAmount || 0, transportCost: insight?.transportCost || 0, distanceKm: insight?.distanceKm || 250, reliabilityPct: insight?.reliabilityPct || 75, seasonalSupplyQuintal: insight?.seasonIntelligence?.expectedSeasonSupplyQuintal || 0, expectedSeasonSupply: insight?.seasonIntelligence?.expectedSeasonSupplyQuintal || 0, seasonalDemandQuintal: insight?.seasonIntelligence?.projectedDemandQuintal || 0, projectedDemand: insight?.seasonIntelligence?.projectedDemandQuintal || 0, weather: insight?.weather || null } };
    }).sort((a, b) => b.recommendation.score - a.recommendation.score).map((center, index) => ({ ...center, recommendation: { ...center.recommendation, rank: index + 1 } }));
    return NextResponse.json({ centers: ranked, preference: { quantityQuintal }, forecast: { mode: forecast.mode, modelVersion: forecast.modelVersion } });
  } catch (error) {
    console.error("Centers list failed", error);
    return NextResponse.json({ message: "Could not load centers." }, { status: 500 });
  }
}

// POST /api/center/centers — create a center (admin only)
export async function POST(request) {
  try {
    const admin = await requireAdmin();
    if (admin?.role !== "ADMIN")
      return NextResponse.json({ message: "Admin access required." }, { status: 403 });

    const { code, name, state, division, district, village, address, latitude, longitude,
            phone, email, totalCapacity } = await request.json();

    if (!code?.trim() || !name?.trim() || !address?.trim() || !phone?.trim() || !totalCapacity) {
      return NextResponse.json({ message: "All required fields must be filled." }, { status: 400 });
    }
    const location = resolveMpLocation({ state, division, district, village });
    if (!location) return NextResponse.json({ message: "Choose a valid Madhya Pradesh sambhag, district, and village." }, { status: 400 });

    const center = await prisma.center.create({
      data: {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        ...location,
        address: address.trim(),
        latitude:  latitude  ? parseFloat(latitude)  : null,
        longitude: longitude ? parseFloat(longitude) : null,
        phone: phone.trim(),
        email: email?.trim() || null,
        totalCapacity: parseFloat(totalCapacity),
      },
    });

    return NextResponse.json({ center }, { status: 201 });
  } catch (error) {
    if (error?.code === "P2002")
      return NextResponse.json({ message: "A center with this code already exists." }, { status: 409 });
    console.error("Center create failed", error);
    return NextResponse.json({ message: "Could not create center." }, { status: 500 });
  }
}
