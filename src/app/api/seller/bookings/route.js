import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../../../lib/prisma";
import { verifyToken } from "../../../../../lib/jwt";
import { comparePassword } from "../../../../../lib/bcrypt";

export async function GET() {
  try {
    const session = verifyToken((await cookies()).get("token")?.value);
    if (!session?.id) return NextResponse.json({ message: "Please log in." }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { id: session.id }, include: { seller: true } });
    if (user?.role !== "SELLER" || !user.seller)
      return NextResponse.json({ message: "Only seller accounts can view bookings." }, { status: 403 });

    const bookings = await prisma.booking.findMany({
      where: { sellerId: user.seller.id },
      include: { center: { select: { name: true, district: true, state: true, address: true, phone: true } } },
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

    const { centerId, slotStart, slotEnd, quantity, password } = await request.json();
    const start = new Date(slotStart);
    const end = new Date(slotEnd);
    const numericQuantity = Number(quantity);
    if (!centerId || !password || Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || end < start)
      return NextResponse.json({ message: "Select a valid date range and enter your password." }, { status: 400 });
    if (!Number.isFinite(numericQuantity) || numericQuantity <= 0)
      return NextResponse.json({ message: "Enter the soybean quantity to bring." }, { status: 400 });
    if (!(await comparePassword(password, user.password)))
      return NextResponse.json({ message: "Incorrect password." }, { status: 401 });

    const center = await prisma.center.findFirst({ where: { id: centerId, status: "ACTIVE", cropPrices: { some: { crop: "SOYBEAN" } } } });
    if (!center) return NextResponse.json({ message: "This center is unavailable or has no soybean price." }, { status: 400 });

    const conflict = await prisma.booking.findFirst({
      where: { centerId, status: { notIn: ["CANCELLED", "NO_SHOW"] }, slotStart: { lte: end }, slotEnd: { gte: start } },
      select: { id: true },
    });
    if (conflict) return NextResponse.json({ message: "Those dates are no longer available. Please choose another range." }, { status: 409 });

    const booking = await prisma.booking.create({
      data: { sellerId: user.seller.id, centerId, crop: "SOYBEAN", quantity: numericQuantity, slotStart: start, slotEnd: end },
      include: { center: { select: { name: true } } },
    });
    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    console.error("Booking create failed", error);
    return NextResponse.json({ message: "Could not create booking." }, { status: 500 });
  }
}
