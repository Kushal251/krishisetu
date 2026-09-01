import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../../../../lib/prisma";
import { verifyToken } from "../../../../../../lib/jwt";

export async function PATCH(request, { params }) {
  try {
    const session = verifyToken((await cookies()).get("token")?.value);
    const admin = session?.id && await prisma.user.findUnique({ where: { id: session.id }, select: { role: true } });
    if (admin?.role !== "ADMIN") return NextResponse.json({ message: "Admin access required." }, { status: 403 });
    const { orderId } = await params;
    const { action, reason } = await request.json();

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.buyerOrder.findUnique({ where: { id: orderId }, include: { buyer: { select: { userId: true } }, listing: { include: { center: { select: { id: true, usedCapacity: true } } } } } });
      if (!order) return { error: "Order not found.", status: 404 };
      await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "CenterListing" WHERE "id" = ${order.listingId} FOR UPDATE`);

      if (action === "GRANT_PHYSICAL_CHECK") {
        if (order.status !== "PHYSICAL_CHECK_PENDING") return { error: "Physical check is not pending for this order." };
        await tx.buyerOrder.update({ where: { id: orderId }, data: { status: "PHYSICAL_CHECKED" } });
        await tx.notification.create({ data: { userId: order.buyer.userId, title: "Physical check approved", message: "The center approved your physical check. Inspect the stock, then submit your quantity and price offer or cancel." } });
        return { message: "Physical check permission granted to buyer." };
      }

      if (action === "CONFIRM_SALE") {
        const buyerOffer = order.inspectionNote ? JSON.parse(order.inspectionNote) : null;
        if (order.status !== "CONFIRMED" || !buyerOffer?.buyerProposedPrice) return { error: "A buyer quantity and price offer is required before the center can complete the sale." };
        const soldQty = Number(order.finalQty ?? order.requestedQty);
        await tx.buyerOrder.update({ where: { id: orderId }, data: { status: "PAID", paymentConfirmedAt: new Date() } });
        await tx.center.update({ where: { id: order.listing.center.id }, data: { usedCapacity: Math.max(0, Number(order.listing.center.usedCapacity) - soldQty) } });
        await tx.notification.create({ data: { userId: order.buyer.userId, title: "Purchase settlement successful", message: "The center confirmed the sale. Payment settlement is marked successful; no payment gateway is used in this system." } });
        return { message: "Center accepted the buyer offer and payment settlement is marked successful." };
      }

      if (action === "REJECT_SALE") {
        if (!["ORDERED", "PHYSICAL_CHECK_PENDING", "PHYSICAL_CHECKED", "CONFIRMED"].includes(order.status)) return { error: "This order cannot be rejected now." };
        const reservedQty = order.finalQty ?? order.requestedQty;
        await tx.buyerOrder.update({ where: { id: orderId }, data: { status: "CANCELLED", cancelReason: String(reason || "Rejected by center").trim().slice(0, 500) } });
        await tx.centerListing.update({ where: { id: order.listingId }, data: { reservedQty: { decrement: reservedQty } } });
        await tx.notification.create({ data: { userId: order.buyer.userId, title: "Center declined the sale", message: `Your order was declined.${reason ? ` Reason: ${String(reason).slice(0, 500)}` : ""}` } });
        return { message: "Order rejected and stock released." };
      }
      return { error: "Choose a valid center action." };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (result.error) return NextResponse.json({ message: result.error }, { status: result.status || 400 });
    return NextResponse.json(result);
  } catch (error) {
    if (error?.code === "P2034") return NextResponse.json({ message: "Stock changed. Please try again." }, { status: 409 });
    console.error("Admin buyer order update failed", error);
    return NextResponse.json({ message: "Could not update buyer order." }, { status: 500 });
  }
}
