import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../../../../../lib/prisma";
import { verifyToken } from "../../../../../../../lib/jwt";

export async function PATCH(request, { params }) {
  try {
    const session = verifyToken((await cookies()).get("token")?.value);
    const admin = session?.id && await prisma.user.findUnique({ where: { id: session.id }, select: { role: true } });
    if (admin?.role !== "ADMIN") return NextResponse.json({ message: "Admin access required." }, { status: 403 });
    const { listingId } = await params;
    const { centerId, pricePerQuintal } = await request.json();
    const price = Number(pricePerQuintal);
    if (!centerId || !Number.isFinite(price) || price <= 0) return NextResponse.json({ message: "Enter a valid selling price." }, { status: 400 });
    const listing = await prisma.centerListing.findFirst({ where: { id: listingId, centerId, isActive: true } });
    if (!listing) return NextResponse.json({ message: "Active center listing not found." }, { status: 404 });
    const costRows = await prisma.$queryRaw`SELECT "costPrice" FROM "CenterListing" WHERE "id" = ${listingId}`;
    const costPrice = Number(costRows[0]?.costPrice || 0);
    const recommendedFloor = costPrice * 1.05 + Number(listing.storageCharge) + Number(listing.handlingCharge);
    if (price < recommendedFloor) return NextResponse.json({ message: `Selling price must be at least ₹${recommendedFloor.toFixed(2)} per quintal to cover purchase cost, charges, and the minimum 5% center margin.` }, { status: 400 });
    const updated = await prisma.centerListing.update({ where: { id: listingId }, data: { pricePerQuintal: price }, select: { id: true, pricePerQuintal: true } });
    return NextResponse.json({ listing: updated, recommendedFloor, message: "Market selling price updated." });
  } catch (error) {
    console.error("Center listing price update failed", error);
    return NextResponse.json({ message: "Could not update market selling price." }, { status: 500 });
  }
}
