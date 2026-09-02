import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../../../../lib/prisma";
import { verifyToken } from "../../../../../../lib/jwt";

export async function PATCH(request, { params }) {
  try {
    const session = verifyToken((await cookies()).get("token")?.value);
    const user = session?.id && await prisma.user.findUnique({ where: { id: session.id }, include: { buyer: true } });
    if (!user || !["BUYER", "ADMIN"].includes(user.role) || (user.role === "BUYER" && !user.buyer)) return NextResponse.json({ message: "Buyer or admin access required." }, { status: 403 });
    const { orderId } = await params;
    const { action, reason, quantity, proposedPrice, negotiationNote } = await request.json();
    const order = await prisma.buyerOrder.findFirst({ where: { id: orderId, ...(user.role === "ADMIN" ? {} : { buyerId: user.buyer.id }) }, include: { listing: true } });
    if (!order || ["CANCELLED", "PAID"].includes(order.status)) return NextResponse.json({ message: "This order cannot be changed." }, { status: 400 });
    if (action === "REQUEST_PHYSICAL_CHECK" && order.status === "ORDERED") {
      await prisma.buyerOrder.update({ where: { id: orderId }, data: { status: "PHYSICAL_CHECK_PENDING" } });
      return NextResponse.json({ message: "Physical check permission requested. Wait for center approval." });
    }
    if (action === "SUBMIT_OFFER" && order.status === "PHYSICAL_CHECKED") {
      const nextQty = Number(quantity); const nextPrice = Number(proposedPrice);
      if (!Number.isFinite(nextQty) || nextQty <= 0 || !Number.isFinite(nextPrice) || nextPrice <= 0) return NextResponse.json({ message: "Enter a valid quantity and price offer." }, { status: 400 });
      const result = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "CenterListing" WHERE "id" = ${order.listingId} FOR UPDATE`);
        const current = await tx.buyerOrder.findUnique({ where: { id: orderId }, include: { listing: true } });
        const currentQty = Number(current.finalQty ?? current.requestedQty);
        const available = Number(current.listing.availableQty) - Number(current.listing.reservedQty) + currentQty;
        if (nextQty > available) return { error: `Only ${available.toFixed(2)} quintal is available.` };
        const difference = nextQty - currentQty;
        if (difference) await tx.centerListing.update({ where: { id: order.listingId }, data: { reservedQty: difference > 0 ? { increment: difference } : { decrement: Math.abs(difference) } } });
        await tx.buyerOrder.update({ where: { id: orderId }, data: { finalQty: nextQty, inspectionNote: JSON.stringify({ buyerProposedPrice: nextPrice, buyerNegotiationNote: String(negotiationNote || "").trim().slice(0, 1000) || null }), status: "CONFIRMED" } });
        return {};
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      if (result.error) return NextResponse.json({ message: result.error }, { status: 409 });
      return NextResponse.json({ message: "Your quantity and price offer was sent to the center for approval." });
    }
    if (action === "CANCEL") {
      const reservedQty = order.finalQty ?? order.requestedQty;
      await prisma.$transaction([prisma.buyerOrder.update({ where: { id: orderId }, data: { status: "CANCELLED", cancelReason: String(reason || "Cancelled by buyer").slice(0, 500) } }), prisma.centerListing.update({ where: { id: order.listingId }, data: { reservedQty: { decrement: reservedQty } } })]);
      return NextResponse.json({ message: "Order cancelled." });
    }
    return NextResponse.json({ message: "This action is not available yet." }, { status: 400 });
  } catch (error) {
    if (error?.code === "P2034") return NextResponse.json({ message: "Stock changed. Please try again." }, { status: 409 });
    return NextResponse.json({ message: "Could not update order." }, { status: 500 });
  }
}
