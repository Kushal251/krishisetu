import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../../../../../lib/prisma";
import { verifyToken } from "../../../../../../../lib/jwt";
import { markMissedBookings } from "../../../../../../../lib/booking";

const DAY_MS = 24 * 60 * 60 * 1000;
const dayStart = (value) => new Date(`${value}T00:00:00.000Z`);
const dateKey = (value) => value.toISOString().slice(0, 10);

export async function GET(request, { params }) {
  try {
    const session = verifyToken((await cookies()).get("token")?.value);
    if (!session?.id) return NextResponse.json({ message: "Please log in." }, { status: 401 });
    const { id: centerId } = await params;
    const requestedDate = new URL(request.url).searchParams.get("date");
    const start = requestedDate ? dayStart(requestedDate) : new Date();
    if (Number.isNaN(start.valueOf())) return NextResponse.json({ message: "Choose a valid date." }, { status: 400 });
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start.getTime() + (5 * DAY_MS));
    end.setUTCHours(23, 59, 59, 999);

    await markMissedBookings();
    const center = await prisma.center.findUnique({ where: { id: centerId }, select: { totalCapacity: true, status: true } });
    if (!center || center.status !== "ACTIVE") return NextResponse.json({ message: "This center is not available." }, { status: 404 });
    const bookings = await prisma.booking.findMany({
      where: { centerId, status: { notIn: ["CANCELLED", "NO_SHOW"] }, slotStart: { lte: end }, slotEnd: { gte: start } },
      select: { quantity: true, slotStart: true, slotEnd: true },
    });
    const dailyCapacity = Number(center.totalCapacity);
    const days = Array.from({ length: 6 }, (_, index) => {
      const day = new Date(start.getTime() + (index * DAY_MS));
      const dayEnd = new Date(day.getTime() + DAY_MS - 1);
      const bookedQuantity = bookings.reduce((total, booking) => booking.slotStart <= dayEnd && booking.slotEnd >= day ? total + Number(booking.quantity) : total, 0);
      const remainingQuantity = Math.max(0, dailyCapacity - bookedQuantity);
      return { date: dateKey(day), bookedQuantity, remainingQuantity, isBusy: remainingQuantity <= 0 };
    });
    return NextResponse.json({ dailyCapacity, days });
  } catch (error) {
    console.error("Availability load failed", error);
    return NextResponse.json({ message: "Could not load availability." }, { status: 500 });
  }
}
