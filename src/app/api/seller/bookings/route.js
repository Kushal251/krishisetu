import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../../../lib/prisma";
import { verifyToken } from "../../../../../lib/jwt";
import { comparePassword } from "../../../../../lib/bcrypt";
import { markMissedBookings } from "../../../../../lib/booking";
import { Prisma } from "@prisma/client";

const MAX_BOOKING_QUANTITY = 99_999_999.99;

export async function GET() {
  try {
    const session = verifyToken((await cookies()).get("token")?.value);
    if (!session?.id) return NextResponse.json({ message: "Please log in." }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { id: session.id }, include: { seller: true } });
    if (user?.role !== "SELLER" || !user.seller)
      return NextResponse.json({ message: "Only seller accounts can view bookings." }, { status: 403 });
    await markMissedBookings();

    const bookings = await prisma.booking.findMany({
      where: { sellerId: user.seller.id },
      include: { center: { select: { name: true, district: true, state: true, address: true, phone: true } }, inspection: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ bookings });
  } catch (error) {
    console.error("Booking list failed", error);
    return NextResponse.json({ message: "Could not load bookings." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = verifyToken((await cookies()).get("token")?.value);
    if (!session?.id) return NextResponse.json({ message: "Please log in." }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { id: session.id }, include: { seller: true } });
    if (user?.role !== "SELLER" || !user.seller)
      return NextResponse.json({ message: "Only seller accounts can book a center slot." }, { status: 403 });

    const { centerId, visitDate, slotStart, quantity, password } = await request.json();
    const selectedDate = visitDate || slotStart;
    const start = new Date(`${selectedDate}T00:00:00.000Z`);
    const end = new Date(`${selectedDate}T23:59:59.999Z`);
    const numericQuantity = Number(quantity);
    if (!centerId || !password || Number.isNaN(start.valueOf()) || start < new Date(new Date().setUTCHours(0, 0, 0, 0)))
      return NextResponse.json({ message: "Select a valid visit date and enter your password." }, { status: 400 });
    if (!Number.isFinite(numericQuantity) || numericQuantity <= 0 || numericQuantity > MAX_BOOKING_QUANTITY)
      return NextResponse.json({ message: "Enter a soybean quantity between 0.01 and 99,999,999.99 quintal." }, { status: 400 });
    if (!(await comparePassword(password, user.password)))
      return NextResponse.json({ message: "Incorrect password." }, { status: 401 });

    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Center" WHERE "id" = ${centerId} FOR UPDATE`);
      const center = await tx.center.findFirst({ where: { id: centerId, status: "ACTIVE", cropPrices: { some: { crop: "SOYBEAN" } } }, select: { totalCapacity: true } });
      if (!center) return { error: "This center is unavailable or has no soybean price." };
      const dailyCapacity = Number(center.totalCapacity);
      if (numericQuantity > dailyCapacity) return { error: `This center can handle up to ${dailyCapacity} quintal in one day. Please reduce quantity or choose another center.` };
      const existing = await tx.booking.findFirst({ where: { sellerId: user.seller.id, centerId, status: { notIn: ["CANCELLED", "NO_SHOW"] }, slotStart: { lte: end }, slotEnd: { gte: start } }, select: { id: true } });
      if (existing) return { error: "You already have an active booking at this center for this date." };
      const dailyUsage = await tx.booking.aggregate({ where: { centerId, status: { notIn: ["CANCELLED", "NO_SHOW"] }, slotStart: { lte: end }, slotEnd: { gte: start } }, _sum: { quantity: true } });
      const remainingQuantity = dailyCapacity - Number(dailyUsage._sum.quantity || 0);
      if (numericQuantity > remainingQuantity) return { error: `Only ${remainingQuantity.toFixed(2)} quintal capacity remains on this date. Choose another suggested date or reduce quantity.` };
      const booking = await tx.booking.create({ data: { sellerId: user.seller.id, centerId, crop: "SOYBEAN", quantity: numericQuantity, slotStart: start, slotEnd: end }, include: { center: { select: { name: true } } } });
      return { booking, remainingQuantity: remainingQuantity - numericQuantity };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (result.error) return NextResponse.json({ message: result.error }, { status: 409 });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error?.code === "P2034")
      return NextResponse.json({ message: "Capacity changed while booking. Please review the suggested dates and try again." }, { status: 409 });
    console.error("Booking create failed", error);
    return NextResponse.json({ message: "Could not create booking." }, { status: 500 });
  }
}
