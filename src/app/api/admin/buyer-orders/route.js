import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../../../lib/prisma";
import { verifyToken } from "../../../../../lib/jwt";

export async function GET() {
  try {
    const session = verifyToken((await cookies()).get("token")?.value);
    const admin = session?.id && await prisma.user.findUnique({ where: { id: session.id }, select: { role: true } });
    if (admin?.role !== "ADMIN") return NextResponse.json({ message: "Admin access required." }, { status: 403 });
    const orders = await prisma.buyerOrder.findMany({
      include: {
        buyer: { select: { buyerType: true, businessName: true, gstin: true, address: true, city: true, state: true, pinCode: true, user: { select: { name: true, phone: true, email: true } } } },
        listing: { include: { center: { select: { id: true, name: true, address: true, district: true, state: true, phone: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
    const normalizedOrders = orders.map((order) => {
      try {
        const offer = JSON.parse(order.inspectionNote || "{}");
        return { ...order, buyerProposedPrice: offer.buyerProposedPrice ?? null, buyerNegotiationNote: offer.buyerNegotiationNote ?? null };
      } catch { return order; }
    });
    return NextResponse.json({ orders: normalizedOrders });
  } catch (error) {
    console.error("Admin buyer orders failed", error);
    return NextResponse.json({ message: "Could not load buyer orders." }, { status: 500 });
  }
}
