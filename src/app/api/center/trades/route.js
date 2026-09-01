import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../../../lib/prisma";
import { verifyToken } from "../../../../../lib/jwt";
import { centerTradeInclude, getCenterTradeActor } from "../../../../../lib/centerTrade";

export async function GET(request) {
  try {
    const session = verifyToken((await cookies()).get("token")?.value);
    const adminCenterId = new URL(request.url).searchParams.get("centerId");
    const actor = await getCenterTradeActor(session?.id, adminCenterId);
    if (!actor) return NextResponse.json({ message: "Center operator access required." }, { status: 403 });
    const trades = await prisma.centerTradeOrder.findMany({
      where: { OR: [{ buyerCenterId: actor.centerId }, { sellerCenterId: actor.centerId }] },
      include: centerTradeInclude,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ trades, centerId: actor.centerId });
  } catch (error) {
    console.error("Center trades failed", error);
    return NextResponse.json({ message: "Could not load center trades." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = verifyToken((await cookies()).get("token")?.value);
    const { listingId, quantity, centerId } = await request.json();
    const actor = await getCenterTradeActor(session?.id, centerId);
    if (!actor) return NextResponse.json({ message: "Center operator access required." }, { status: 403 });
    const requestedQty = Number(quantity);
    if (!listingId || !Number.isFinite(requestedQty) || requestedQty <= 0)
      return NextResponse.json({ message: "Enter a valid quantity." }, { status: 400 });

    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "CenterListing" WHERE "id" = ${listingId} FOR UPDATE`);
      const listing = await tx.centerListing.findFirst({ where: { id: listingId, isActive: true, availableUntil: { gte: new Date() } } });
      if (!listing || listing.centerId === actor.centerId) return { error: "This center stock is not available for purchase." };
      const remaining = Number(listing.availableQty) - Number(listing.reservedQty);
      if (requestedQty > remaining) return { error: `Only ${remaining.toFixed(2)} quintal is currently available.` };
      const trade = await tx.centerTradeOrder.create({ data: { buyerCenterId: actor.centerId, sellerCenterId: listing.centerId, listingId, requestedQty } });
      await tx.centerListing.update({ where: { id: listingId }, data: { reservedQty: { increment: requestedQty } } });
      const sellerOperators = await tx.user.findMany({ where: { role: "CENTER", centerId: listing.centerId }, select: { id: true } });
      if (sellerOperators.length) await tx.notification.createMany({ data: sellerOperators.map(({ id }) => ({ userId: id, title: "New center purchase request", message: "Another center has reserved your soybean listing. Review the request and grant physical-check permission." })) });
      return { trade };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (result.error) return NextResponse.json({ message: result.error }, { status: 409 });
    return NextResponse.json({ message: "Purchase request sent. Request physical-check permission when your team is ready.", trade: result.trade }, { status: 201 });
  } catch (error) {
    if (error?.code === "P2034") return NextResponse.json({ message: "Availability changed. Please try again." }, { status: 409 });
    console.error("Center trade create failed", error);
    return NextResponse.json({ message: "Could not create center trade request." }, { status: 500 });
  }
}
