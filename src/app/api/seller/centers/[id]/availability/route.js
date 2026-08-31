import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../../../../../lib/prisma";
import { verifyToken } from "../../../../../../../lib/jwt";

export async function GET(request, { params }) {
  try {
    const session = verifyToken((await cookies()).get("token")?.value);
    if (!session?.id) return NextResponse.json({ message: "Please log in." }, { status: 401 });
    const { id: centerId } = await params;
    const bookings = await prisma.booking.findMany({
      where: { centerId, status: { notIn: ["CANCELLED", "NO_SHOW"] }, slotEnd: { gte: new Date() } },
      select: { slotStart: true, slotEnd: true },
      orderBy: { slotStart: "asc" },
    });
    return NextResponse.json({ unavailableSlots: bookings });
  } catch (error) {
    console.error("Availability load failed", error);
    return NextResponse.json({ message: "Could not load availability." }, { status: 500 });
  }
}
