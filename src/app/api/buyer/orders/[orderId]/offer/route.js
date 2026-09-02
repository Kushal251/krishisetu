import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../../../../../lib/prisma";
import { verifyToken } from "../../../../../../../lib/jwt";

export async function POST(request, { params }) {
  try {
    const session = verifyToken((await cookies()).get("token")?.value);
    const user = session?.id && await prisma.user.findUnique({ where: { id: session.id }, include: { buyer: true } });
    if (!user || !["BUYER", "ADMIN"].includes(user.role) || (user.role === "BUYER" && !user.buyer)) return NextResponse.json({ message: "Buyer or admin access required." }, { status: 403 });
    const { orderId } = await params;
    const { quantity, proposedPrice, negotiationNote } = await request.json();
    const nextQty = Number(quantity); const nextPrice = Number(proposedPrice);
    if (!Number.isFinite(nextQty) || nextQty <= 0 || !Number.isFinite(nextPrice) || nextPrice <= 0) return NextResponse.json({ message: "Enter a valid quantity and price offer." }, { status: 400 });
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.buyerOrder.findFirst({ where: { id: orderId, ...(user.role === "ADMIN" ? {} : { buyerId: user.buyer.id }) }, include: { listing: true } });
      if (!order || order.status !== "PHYSICAL_CHECKED") return { error: "Your order is not ready for an offer." };
      await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "CenterListing" WHERE "id" = ${order.listingId} FOR UPDATE`);
      const listing = await tx.centerListing.findUnique({ where: { id: order.listingId } });
      const currentQty = Number(order.finalQty ?? order.requestedQty);
      const available = Number(listing.availableQty) - Number(listing.reservedQty) + currentQty;
      if (nextQty > available) return { error: `Only ${available.toFixed(2)} quintal is available.` };
      const difference = nextQty - currentQty;
      if (difference) await tx.centerListing.update({ where: { id: order.listingId }, data: { reservedQty: difference > 0 ? { increment: difference } : { decrement: Math.abs(difference) } } });
      await tx.buyerOrder.update({ where: { id: orderId }, data: { finalQty: nextQty, inspectionNote: JSON.stringify({ buyerProposedPrice: nextPrice, buyerNegotiationNote: String(negotiationNote || "").trim().slice(0, 1000) || null }), status: "CONFIRMED" } });
      return {};
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (result.error) return NextResponse.json({ message: result.error }, { status: 409 });
    return NextResponse.json({ message: "Your quantity and price offer was sent to the center for approval." });
  } catch (error) {
    if (error?.code === "P2034") return NextResponse.json({ message: "Stock changed. Please try again." }, { status: 409 });
    return NextResponse.json({ message: "Could not submit your offer." }, { status: 500 });
  }
}
