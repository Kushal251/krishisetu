import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../../../lib/prisma";
import { verifyToken } from "../../../../../lib/jwt";
import { getSeasonalCenterSignals } from "../../../../../lib/seasonIntelligence";

// GET /api/center/dashboard — KPIs for the center operator
export async function GET() {
  try {
    const session = verifyToken((await cookies()).get("token")?.value);
    if (!session?.id) return NextResponse.json({ message: "Please log in." }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { role: true, centerId: true },
    });

    if (!["CENTER", "ADMIN"].includes(user?.role))
      return NextResponse.json({ message: "Center operator access required." }, { status: 403 });
    const fallbackCenter = user.role === "ADMIN" && !user.centerId ? await prisma.center.findFirst({ where: { status: "ACTIVE" }, orderBy: { createdAt: "asc" }, select: { id: true } }) : null;
    const centerId = user.centerId || fallbackCenter?.id;
    if (!centerId) return NextResponse.json({ message: "Create an active center before opening center operations." }, { status: 400 });

    // Today's date range
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [center, todayBookings, pendingInspection, pendingPurchases, listings, seasonal] = await Promise.all([
      // Center capacity info
      prisma.center.findUnique({
        where: { id: centerId },
        select: { name: true, totalCapacity: true, usedCapacity: true, status: true },
      }),

      // Today's bookings (all statuses except CANCELLED/NO_SHOW)
      prisma.booking.count({
        where: {
          centerId,
          slotStart: { gte: todayStart, lte: todayEnd },
          status: { notIn: ["CANCELLED", "NO_SHOW"] },
        },
      }),

      // Bookings waiting for inspection (ARRIVED status)
      prisma.booking.count({
        where: { centerId, status: "ARRIVED" },
      }),

      prisma.booking.findMany({
        where: { centerId, status: "GRADED", inspection: { is: { sellerDecision: "ACCEPTED" } } },
        select: { id: true, quantity: true, seller: { select: { user: { select: { name: true, phone: true } } } }, inspection: { select: { grade: true, gradePrice: true } } },
        orderBy: { createdAt: "asc" },
      }),

      prisma.centerListing.findMany({
        where: { centerId, isActive: true, availableQty: { gt: 0 } },
        select: { id: true, grade: true, availableQty: true, reservedQty: true, pricePerQuintal: true, availableUntil: true, pickupStart: true, pickupEnd: true },
        orderBy: { availableUntil: "asc" },
      }),

      getSeasonalCenterSignals({ crop: "SOYBEAN" }),

    ]);

    const totalCapacity = parseFloat(center.totalCapacity);
    const usedCapacity  = parseFloat(center.usedCapacity);
    const utilizationPct = totalCapacity > 0
      ? Math.round((usedCapacity / totalCapacity) * 100)
      : 0;

    const seasonSignal = seasonal.signals.get(centerId);
    const recommendedTradeQty = Math.min(Math.max(0, Number(seasonSignal?.shortageQuintal || 0)), Math.max(0, totalCapacity - usedCapacity));
    return NextResponse.json({
      center: {
        name: center.name,
        status: center.status,
        totalCapacity,
        usedCapacity,
        availableCapacity: totalCapacity - usedCapacity,
        utilizationPct,
      },
      kpis: {
        todayBookings,
        pendingInspection,
        utilizationPct,
        availableCapacity: totalCapacity - usedCapacity,
      },
      pendingPurchases,
      listings,
      intelligence: seasonSignal ? {
        ...seasonSignal,
        expectedSeasonSupply: seasonSignal.expectedSeasonSupplyQuintal,
        declaredIncoming: seasonSignal.weatherAdjustedDeclaredSupplyQuintal,
        currentDemand: seasonSignal.currentDemandQuintal,
        projectedDemand: seasonSignal.projectedDemandQuintal,
        shortage: seasonSignal.shortageQuintal,
        surplus: seasonSignal.surplusQuintal,
        previousSeasonSupply: seasonSignal.previousSeasonSupplyQuintal,
        previousSeasonDemand: seasonSignal.previousSeasonDemandQuintal,
        recommendedTradeQty,
        recommendedTradeQtyQuintal: recommendedTradeQty,
        decision: recommendedTradeQty > 0 ? "BUY" : seasonSignal.surplusQuintal > 0 ? "SELL" : "HOLD",
        message: recommendedTradeQty > 0 ? `Projected local demand may exceed supply. Source up to ${recommendedTradeQty.toFixed(2)} quintal from another center.` : seasonSignal.surplusQuintal > 0 ? `Projected supply is ${Number(seasonSignal.surplusQuintal).toFixed(2)} quintal above local demand. Avoid unnecessary purchase and consider selling surplus.` : "Projected demand and supply are balanced. Monitor new bookings and orders.",
      } : null,
    });
  } catch (error) {
    console.error("Center dashboard failed", error);
    return NextResponse.json({ message: "Could not load dashboard." }, { status: 500 });
  }
}
