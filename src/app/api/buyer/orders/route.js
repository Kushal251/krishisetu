import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../../../lib/prisma";
import { Prisma } from "@prisma/client";
import { verifyToken } from "../../../../../lib/jwt";

export async function GET() {
  try {
    const session = verifyToken((await cookies()).get("token")?.value);
    const user = session?.id && await prisma.user.findUnique({ where: { id: session.id }, include: { buyer: true } });
    if (user?.role !== "BUYER" || !user.buyer) return NextResponse.json({ message: "Buyer access required." }, { status: 403 });
    const orders = await prisma.buyerOrder.findMany({ where: { buyerId: user.buyer.id }, include: { listing: { include: { center: { select: { name: true, address: true, district: true, state: true, phone: true } } } } }, orderBy: { createdAt: "desc" } });
    const normalizedOrders = orders.map((order) => {
      try { const offer = JSON.parse(order.inspectionNote || "{}"); return { ...order, buyerProposedPrice: offer.buyerProposedPrice ?? null, buyerNegotiationNote: offer.buyerNegotiationNote ?? null }; }
      catch { return order; }
    });
    return NextResponse.json({ orders: normalizedOrders });
  } catch { return NextResponse.json({ message: "Could not load buyer orders." }, { status: 500 }); }
}

export async function POST(request) {
  try {
    const session = verifyToken((await cookies()).get("token")?.value);
    const user = session?.id && await prisma.user.findUnique({ where: { id: session.id }, include: { buyer: true } });
    if (user?.role !== "BUYER" || !user.buyer || user.buyer.verificationStatus !== "VERIFIED") return NextResponse.json({ message: "Only verified buyers can place orders." }, { status: 403 });
    const { listingId, quantity, deliveryAddress } = await request.json(); const requestedQty = Number(quantity);
    if (!listingId || !deliveryAddress?.trim() || !Number.isFinite(requestedQty) || requestedQty <= 0) return NextResponse.json({ message: "Enter a valid quantity and delivery address." }, { status: 400 });
    const result = await prisma.$transaction(async (tx) => { await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "CenterListing" WHERE "id" = ${listingId} FOR UPDATE`); const listing = await tx.centerListing.findFirst({ where: { id: listingId, isActive: true, availableUntil: { gte: new Date() } } }); if (!listing) return { error: "This listing is no longer available." }; const remaining = Number(listing.availableQty) - Number(listing.reservedQty); if (requestedQty > remaining) return { error: `Only ${remaining.toFixed(2)} quintal is available.` }; const order = await tx.buyerOrder.create({ data: { buyerId: user.buyer.id, listingId, requestedQty, deliveryAddress: deliveryAddress.trim() } }); await tx.centerListing.update({ where: { id: listingId }, data: { reservedQty: { increment: requestedQty } } }); return { order }; }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (result.error) return NextResponse.json({ message: result.error }, { status: 409 }); return NextResponse.json(result, { status: 201 });
  } catch (error) { if (error?.code === "P2034") return NextResponse.json({ message: "Availability changed. Please try again." }, { status: 409 }); return NextResponse.json({ message: "Could not place order." }, { status: 500 }); }
}
