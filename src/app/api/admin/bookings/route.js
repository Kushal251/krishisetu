import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../../../lib/prisma";
import { verifyToken } from "../../../../../lib/jwt";
import { markMissedBookings } from "../../../../../lib/booking";

export async function GET() {
  try {
    const session = verifyToken((await cookies()).get("token")?.value);
    const user = session?.id && await prisma.user.findUnique({ where: { id: session.id }, select: { role: true } });
    if (user?.role !== "ADMIN") return NextResponse.json({ message: "Admin access required." }, { status: 403 });
    await markMissedBookings();
    const bookings = await prisma.booking.findMany({
      include: {
        center: { select: { id: true, name: true, district: true, state: true, address: true, phone: true } },
        inspection: true,
        seller: {
          select: {
            sellerType: true, village: true, district: true, state: true, address: true, verificationStatus: true,
            user: { select: { name: true, phone: true, email: true, aadhaarNumber: true } },
            farmer: { select: { landArea: true, landUnit: true, khasraNumber: true } },
            fpo: { select: { organizationName: true, registrationNo: true, memberCount: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ bookings });
  } catch (error) {
    console.error("Admin booking list failed", error);
    return NextResponse.json({ message: "Could not load bookings." }, { status: 500 });
  }
}
