import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../../../../../lib/prisma";
import { verifyToken } from "../../../../../../../lib/jwt";

export async function GET(request, { params }) {
  try {
    const session = verifyToken((await cookies()).get("token")?.value);
    const admin = session?.id && await prisma.user.findUnique({ where: { id: session.id }, select: { role: true } });
    if (admin?.role !== "ADMIN") return NextResponse.json({ message: "Admin access required." }, { status: 403 });
    const { centerId } = await params;
    const [purchases, sales, centerTradePurchases, centerTradeSales] = await Promise.all([
      prisma.booking.findMany({ where: { centerId, status: "COMPLETED" }, include: { seller: { select: { user: { select: { name: true } } } }, inspection: true }, orderBy: { createdAt: "desc" } }),
      prisma.buyerOrder.findMany({ where: { status: { not: "CANCELLED" }, listing: { centerId } }, include: { buyer: { select: { businessName: true } }, listing: { select: { grade: true } } }, orderBy: { createdAt: "desc" } }),
      prisma.centerTradeOrder.findMany({ where: { buyerCenterId: centerId }, include: { sellerCenter: { select: { name: true } }, listing: { select: { grade: true } } }, orderBy: { createdAt: "desc" } }),
      prisma.centerTradeOrder.findMany({ where: { sellerCenterId: centerId }, include: { buyerCenter: { select: { name: true } }, listing: { select: { grade: true } } }, orderBy: { createdAt: "desc" } }),
    ]);
    return NextResponse.json({ purchases, sales, centerTradePurchases, centerTradeSales });
  } catch { return NextResponse.json({ message: "Could not load center history." }, { status: 500 }); }
}
