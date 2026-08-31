import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../../../lib/prisma";
import { verifyToken } from "../../../../../lib/jwt";

export async function GET() {
  try {
    const session = verifyToken((await cookies()).get("token")?.value);
    const user = session?.id && await prisma.user.findUnique({ where: { id: session.id }, select: { role: true } });
    if (user?.role !== "ADMIN") return NextResponse.json({ message: "Admin access required." }, { status: 403 });
    const bookings = await prisma.booking.findMany({
      include: { center: { select: { name: true, district: true, state: true } }, seller: { include: { user: { select: { name: true, phone: true } } } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ bookings });
  } catch (error) {
    console.error("Admin booking list failed", error);
    return NextResponse.json({ message: "Could not load bookings." }, { status: 500 });
  }
}
