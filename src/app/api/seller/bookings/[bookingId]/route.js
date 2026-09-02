import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../../../../lib/prisma";
import { verifyToken } from "../../../../../../lib/jwt";

export async function PATCH(request, { params }) {
  try {
    const session = verifyToken((await cookies()).get("token")?.value);
    const user = session?.id && await prisma.user.findUnique({ where: { id: session.id }, include: { seller: true } });
    if (!user || !["SELLER", "ADMIN"].includes(user.role) || (user.role === "SELLER" && !user.seller)) return NextResponse.json({ message: "Seller or admin access required." }, { status: 403 });
    const { bookingId } = await params;
    const { action } = await request.json();
    const booking = await prisma.booking.findFirst({ where: { id: bookingId, ...(user.role === "ADMIN" ? {} : { sellerId: user.seller.id }) }, include: { inspection: true, center: { select: { name: true } } } });
    if (!booking?.inspection || booking.status !== "GRADED" || booking.inspection.sellerDecision !== "PENDING")
      return NextResponse.json({ message: "There is no pending grade offer for this booking." }, { status: 400 });

    if (action === "ACCEPT_OFFER") {
      await prisma.$transaction(async (tx) => {
        await tx.qualityInspection.update({ where: { bookingId }, data: { sellerDecision: "ACCEPTED", sellerDecisionAt: new Date() } });
        const operators = await tx.user.findMany({ where: { role: { in: ["CENTER", "ADMIN"] }, centerId: booking.centerId }, select: { id: true } });
        if (operators.length) await tx.notification.createMany({ data: operators.map((operator) => ({ userId: operator.id, title: "Seller offer accepted", message: `${booking.quantity} quintal soybean is ready to purchase. Confirm the purchase and set buyer availability dates.` })) });
      });
      return NextResponse.json({ message: "Offer accepted. Waiting for the center to confirm purchase and storage." });
    }
    if (action === "REQUEST_RETEST") {
      await prisma.$transaction([
        prisma.qualityInspection.update({ where: { bookingId }, data: { sellerDecision: "RETEST_REQUESTED", sellerDecisionAt: new Date() } }),
        prisma.booking.update({ where: { id: bookingId }, data: { status: "INSPECTION" } }),
      ]);
      return NextResponse.json({ message: "Re-test requested. The center will test your soybean again." });
    }
    return NextResponse.json({ message: "Choose a valid decision." }, { status: 400 });
  } catch (error) {
    console.error("Seller booking decision failed", error);
    return NextResponse.json({ message: "Could not update booking decision." }, { status: 500 });
  }
}
