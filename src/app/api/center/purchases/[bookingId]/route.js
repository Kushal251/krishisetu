import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../../../../lib/prisma";
import { verifyToken } from "../../../../../../lib/jwt";

export async function PATCH(request, { params }) {
  try {
    const session = verifyToken((await cookies()).get("token")?.value);
    const actor = session?.id && await prisma.user.findUnique({ where: { id: session.id }, select: { id: true, role: true, centerId: true } });

    const { bookingId } = await params;
    const body = await request.json();
    const centerId = actor?.role === "ADMIN" ? body.centerId : actor?.centerId;
    if (!centerId || !["ADMIN", "CENTER"].includes(actor?.role)) return NextResponse.json({ message: "Center operator or admin access required." }, { status: 403 });
    const buyerPrice = Number(body.buyerPrice);
    const availableUntil = new Date(body.availableUntil);
    const pickupStart = new Date(body.pickupStart);
    const pickupEnd = new Date(body.pickupEnd);
    if (!Number.isFinite(buyerPrice) || buyerPrice <= 0 || Number.isNaN(availableUntil.getTime()) || Number.isNaN(pickupStart.getTime()) || Number.isNaN(pickupEnd.getTime()) || availableUntil < new Date() || pickupEnd < pickupStart) return NextResponse.json({ message: "Enter a valid buyer price, deadline, and pickup date range." }, { status: 400 });

    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({ where: { id: bookingId, centerId }, include: { inspection: true, seller: { select: { userId: true } }, center: { select: { totalCapacity: true, usedCapacity: true } } } });
      if (!booking?.inspection || booking.status !== "GRADED" || booking.inspection.sellerDecision !== "ACCEPTED") return { error: "This purchase is no longer awaiting center confirmation." };
      if (Number(booking.center.usedCapacity) + Number(booking.quantity) > Number(booking.center.totalCapacity)) return { error: "Not enough storage capacity available for this purchase." };
      const minimumSellingPrice = Number(booking.inspection.gradePrice) * 1.05;
      if (buyerPrice < minimumSellingPrice) return { error: `Set a selling price of at least ₹${minimumSellingPrice.toFixed(2)} per quintal to cover purchase cost and a 5% center margin.` };

      await tx.qualityInspection.update({ where: { bookingId }, data: { finalizedAt: new Date() } });
      await tx.booking.update({ where: { id: bookingId }, data: { status: "COMPLETED" } });
      await tx.center.update({ where: { id: centerId }, data: { usedCapacity: { increment: booking.quantity } } });
      const listing = await tx.centerListing.create({ data: { centerId, crop: "SOYBEAN", grade: booking.inspection.grade, availableQty: booking.quantity, pricePerQuintal: buyerPrice, availableUntil, pickupStart, pickupEnd } });
      await tx.$executeRaw(Prisma.sql`UPDATE "CenterListing" SET "costPrice" = ${booking.inspection.gradePrice} WHERE "id" = ${listing.id}`);
      await tx.notification.create({ data: { userId: booking.seller.userId, title: "Center purchase confirmed", message: "The center confirmed purchase. Your settlement is marked complete; no payment gateway is used in this system." } });
      return { listing };
    }, { isolationLevel: "Serializable" });
    if (result.error) return NextResponse.json({ message: result.error }, { status: 409 });
    return NextResponse.json({ success: true, listing: result.listing, message: "Purchase confirmed, settlement completed, and soybean stock added to center storage." });
  } catch (error) {
    if (error?.code === "P2034") return NextResponse.json({ message: "Storage changed. Please try again." }, { status: 409 });
    console.error("Center purchase confirmation failed", error);
    return NextResponse.json({ message: "Could not confirm center purchase." }, { status: 500 });
  }
}
