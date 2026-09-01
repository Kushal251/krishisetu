import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../../../lib/prisma";
import { verifyToken } from "../../../../../lib/jwt";

// GET /api/center/dashboard — KPIs for the center operator
export async function GET() {
  try {
    const session = verifyToken((await cookies()).get("token")?.value);
    if (!session?.id) return NextResponse.json({ message: "Please log in." }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { role: true, centerId: true },
    });

    if (user?.role !== "CENTER")
      return NextResponse.json({ message: "Center operator access required." }, { status: 403 });
    if (!user.centerId)
      return NextResponse.json({ message: "You are not assigned to any center yet." }, { status: 400 });

    const centerId = user.centerId;

    // Today's date range
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [center, todayBookings, pendingInspection, pendingPurchases, listings] = await Promise.all([
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

    ]);

    const totalCapacity = parseFloat(center.totalCapacity);
    const usedCapacity  = parseFloat(center.usedCapacity);
    const utilizationPct = totalCapacity > 0
      ? Math.round((usedCapacity / totalCapacity) * 100)
      : 0;

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
    });
  } catch (error) {
    console.error("Center dashboard failed", error);
    return NextResponse.json({ message: "Could not load dashboard." }, { status: 500 });
  }
}
