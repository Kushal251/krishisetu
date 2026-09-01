import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../../../../lib/prisma";
import { verifyToken } from "../../../../../../lib/jwt";
import { getCenterTradeActor } from "../../../../../../lib/centerTrade";

const activeStatuses = ["ORDERED", "PHYSICAL_CHECK_PENDING", "PHYSICAL_CHECKED", "CONFIRMED"];

async function notifyCenter(tx, centerId, title, message) {
  const operators = await tx.user.findMany({ where: { role: "CENTER", centerId }, select: { id: true } });
  if (operators.length) await tx.notification.createMany({ data: operators.map(({ id }) => ({ userId: id, title, message })) });
}

export async function PATCH(request, { params }) {
  try {
    const session = verifyToken((await cookies()).get("token")?.value);
    const { orderId } = await params;
    const { action, quantity, proposedPrice, negotiationNote, reason, centerId } = await request.json();
    const actor = await getCenterTradeActor(session?.id, centerId);
    if (!actor) return NextResponse.json({ message: "Center operator access required." }, { status: 403 });

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.centerTradeOrder.findUnique({ where: { id: orderId }, include: { listing: true } });
      if (!order) return { error: "Trade request not found.", status: 404 };
      const isBuyer = order.buyerCenterId === actor.centerId;
      const isSeller = order.sellerCenterId === actor.centerId;
      if (!isBuyer && !isSeller) return { error: "You cannot manage this trade request.", status: 403 };

      if (action === "REQUEST_PHYSICAL_CHECK") {
        if (!isBuyer || order.status !== "ORDERED") return { error: "Physical check cannot be requested now." };
        await tx.centerTradeOrder.update({ where: { id: orderId }, data: { status: "PHYSICAL_CHECK_PENDING" } });
        await notifyCenter(tx, order.sellerCenterId, "Physical check requested", "The purchasing center requested permission to physically inspect this soybean stock.");
        return { message: "Physical-check permission requested from the selling center." };
      }

      if (action === "GRANT_PHYSICAL_CHECK") {
        if (!isSeller || order.status !== "PHYSICAL_CHECK_PENDING") return { error: "No physical-check request is pending." };
        await tx.centerTradeOrder.update({ where: { id: orderId }, data: { status: "PHYSICAL_CHECKED" } });
        await notifyCenter(tx, order.buyerCenterId, "Physical check approved", "Inspect the stock and then submit your final quantity and price offer, or cancel the request.");
        return { message: "Physical check approved for the purchasing center." };
      }

      if (action === "SUBMIT_OFFER") {
        if (!isBuyer || order.status !== "PHYSICAL_CHECKED") return { error: "Complete physical check before submitting an offer." };
        const nextQty = Number(quantity); const nextPrice = Number(proposedPrice);
        if (!Number.isFinite(nextQty) || nextQty <= 0 || !Number.isFinite(nextPrice) || nextPrice <= 0) return { error: "Enter a valid final quantity and price." };
        await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "CenterListing" WHERE "id" = ${order.listingId} FOR UPDATE`);
        const listing = await tx.centerListing.findUnique({ where: { id: order.listingId } });
        const currentQty = Number(order.finalQty ?? order.requestedQty);
        const available = Number(listing.availableQty) - Number(listing.reservedQty) + currentQty;
        if (nextQty > available) return { error: `Only ${available.toFixed(2)} quintal can be offered.` };
        const difference = nextQty - currentQty;
        if (difference) await tx.centerListing.update({ where: { id: order.listingId }, data: { reservedQty: difference > 0 ? { increment: difference } : { decrement: Math.abs(difference) } } });
        await tx.centerTradeOrder.update({ where: { id: orderId }, data: { finalQty: nextQty, proposedPrice: nextPrice, negotiationNote: String(negotiationNote || "").trim().slice(0, 1000) || null, status: "CONFIRMED" } });
        await notifyCenter(tx, order.sellerCenterId, "Center trade offer received", "The buying center completed inspection and sent a final quantity and price offer for approval.");
        return { message: "Your negotiated quantity and price offer was sent to the selling center." };
      }

      if (action === "CANCEL") {
        if (!isBuyer || !activeStatuses.includes(order.status)) return { error: "This trade request cannot be cancelled." };
        await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "CenterListing" WHERE "id" = ${order.listingId} FOR UPDATE`);
        const reservedQty = Number(order.finalQty ?? order.requestedQty);
        await tx.centerTradeOrder.update({ where: { id: orderId }, data: { status: "CANCELLED", cancelReason: String(reason || "Cancelled by purchasing center").trim().slice(0, 500) } });
        await tx.centerListing.update({ where: { id: order.listingId }, data: { reservedQty: { decrement: reservedQty } } });
        await notifyCenter(tx, order.sellerCenterId, "Center trade cancelled", "The purchasing center cancelled its request and the reserved soybean stock is available again.");
        return { message: "Trade request cancelled and reserved stock released." };
      }

      if (action === "REJECT_SALE") {
        if (!isSeller || !activeStatuses.includes(order.status)) return { error: "This trade request cannot be rejected." };
        await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "CenterListing" WHERE "id" = ${order.listingId} FOR UPDATE`);
        const reservedQty = Number(order.finalQty ?? order.requestedQty);
        await tx.centerTradeOrder.update({ where: { id: orderId }, data: { status: "CANCELLED", cancelReason: String(reason || "Declined by selling center").trim().slice(0, 500) } });
        await tx.centerListing.update({ where: { id: order.listingId }, data: { reservedQty: { decrement: reservedQty } } });
        await notifyCenter(tx, order.buyerCenterId, "Center trade declined", "The selling center declined the trade request. The reserved stock has been released.");
        return { message: "Trade request declined and stock released." };
      }

      if (action === "ACCEPT_SALE") {
        if (!isSeller || order.status !== "CONFIRMED" || !order.proposedPrice) return { error: "A final quantity and price offer is required before accepting the sale." };
        await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "CenterListing" WHERE "id" = ${order.listingId} FOR UPDATE`);
        await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Center" WHERE "id" IN (${order.sellerCenterId}, ${order.buyerCenterId}) FOR UPDATE`);
        const [listing, buyerCenter, sellerCenter] = await Promise.all([
          tx.centerListing.findUnique({ where: { id: order.listingId } }),
          tx.center.findUnique({ where: { id: order.buyerCenterId } }),
          tx.center.findUnique({ where: { id: order.sellerCenterId } }),
        ]);
        const settledQty = Number(order.finalQty ?? order.requestedQty);
        const sourceAvailable = Number(listing.availableQty);
        const sourceReserved = Number(listing.reservedQty);
        if (settledQty > sourceAvailable || settledQty > sourceReserved) return { error: "The source stock changed. Ask the purchasing center to submit a new offer." };
        if (Number(buyerCenter.usedCapacity) + settledQty > Number(buyerCenter.totalCapacity)) return { error: "Purchasing center does not have enough free storage capacity." };
        const now = new Date(); const expiry = new Date(now); expiry.setDate(expiry.getDate() + 30);
        await tx.centerTradeOrder.update({ where: { id: orderId }, data: { status: "PAID", settledAt: now } });
        await tx.centerListing.update({ where: { id: order.listingId }, data: { availableQty: sourceAvailable - settledQty, reservedQty: Math.max(0, sourceReserved - settledQty), isActive: sourceAvailable - settledQty > 0 } });
        await tx.center.update({ where: { id: order.sellerCenterId }, data: { usedCapacity: Math.max(0, Number(sellerCenter.usedCapacity) - settledQty) } });
        await tx.center.update({ where: { id: order.buyerCenterId }, data: { usedCapacity: Number(buyerCenter.usedCapacity) + settledQty } });
        const marketSalePrice = Number(order.proposedPrice) * 1.08 + Number(listing.storageCharge) + Number(listing.handlingCharge);
        const transferredListing = await tx.centerListing.create({ data: { centerId: order.buyerCenterId, crop: listing.crop, grade: listing.grade, availableQty: settledQty, pricePerQuintal: marketSalePrice, storageCharge: listing.storageCharge, handlingCharge: listing.handlingCharge, gstRate: listing.gstRate, availableUntil: expiry, pickupStart: now, pickupEnd: expiry } });
        await tx.$executeRaw(Prisma.sql`UPDATE "CenterListing" SET "costPrice" = ${order.proposedPrice} WHERE "id" = ${transferredListing.id}`);
        await notifyCenter(tx, order.buyerCenterId, "Center trade settled", "The selling center accepted your offer. Settlement is marked successful and soybean stock was added to your storage.");
        await notifyCenter(tx, order.sellerCenterId, "Center trade settled", "Your soybean stock was sold to another center. Settlement is marked successful and storage was updated.");
        return { message: "Sale accepted, settlement successful, and storage transferred to the purchasing center." };
      }
      return { error: "Choose a valid trade action." };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (result.error) return NextResponse.json({ message: result.error }, { status: result.status || 400 });
    return NextResponse.json(result);
  } catch (error) {
    if (error?.code === "P2034") return NextResponse.json({ message: "Stock changed. Please try again." }, { status: 409 });
    console.error("Center trade update failed", error);
    return NextResponse.json({ message: "Could not update center trade." }, { status: 500 });
  }
}
