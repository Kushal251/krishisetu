import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../../../lib/prisma";
import { verifyToken } from "../../../../../lib/jwt";

export async function GET(request) {
  try {
    const session = verifyToken((await cookies()).get("token")?.value);
    const admin = session?.id && await prisma.user.findUnique({ where: { id: session.id }, select: { role: true } });
    if (admin?.role !== "ADMIN") return NextResponse.json({ message: "Admin access required." }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "PENDING";
    const buyerType = searchParams.get("buyerType");
    const state = searchParams.get("state")?.trim();
    const city = searchParams.get("city")?.trim();
    const requests = await prisma.buyerVerificationRequest.findMany({
      where: {
        ...(status !== "ALL" ? { status } : {}),
        buyer: {
          ...(buyerType && buyerType !== "ALL" ? { buyerType } : {}),
          ...(state ? { state: { contains: state, mode: "insensitive" } } : {}),
          ...(city ? { city: { contains: city, mode: "insensitive" } } : {}),
        },
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true, status: true, note: true, adminNote: true, createdAt: true, reviewedAt: true,
        buyer: {
          select: {
            buyerType: true, businessName: true, gstin: true, panNumber: true, address: true, city: true, state: true, pinCode: true, verificationStatus: true,
            user: { select: { name: true, phone: true, email: true } },
          },
        },
      },
    });
    return NextResponse.json({ requests });
  } catch (error) {
    console.error("Buyer verification queue failed", error);
    return NextResponse.json({ message: "Could not load buyer verification requests." }, { status: 500 });
  }
}
