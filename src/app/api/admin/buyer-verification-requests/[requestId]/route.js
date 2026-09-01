import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../../../../lib/prisma";
import { verifyToken } from "../../../../../../lib/jwt";

export async function PATCH(request, { params }) {
  try {
    const session = verifyToken((await cookies()).get("token")?.value);
    const admin = session?.id && await prisma.user.findUnique({ where: { id: session.id }, select: { role: true } });
    if (admin?.role !== "ADMIN") return NextResponse.json({ message: "Admin access required." }, { status: 403 });

    const { requestId } = await params;
    const { action, adminNote = "" } = await request.json();
    if (!['APPROVE', 'REJECT'].includes(action)) return NextResponse.json({ message: "Choose APPROVE or REJECT." }, { status: 400 });

    const result = await prisma.$transaction(async (tx) => {
      const verification = await tx.buyerVerificationRequest.findUnique({ where: { id: requestId }, include: { buyer: { select: { userId: true } } } });
      if (!verification || verification.status !== "PENDING") return null;
      const approved = action === "APPROVE";
      const note = String(adminNote).trim().slice(0, 500);
      await tx.buyerVerificationRequest.update({ where: { id: requestId }, data: { status: approved ? "APPROVED" : "REJECTED", adminNote: note, reviewedById: session.id, reviewedAt: new Date() } });
      await tx.buyer.update({ where: { id: verification.buyerId }, data: { verificationStatus: approved ? "VERIFIED" : "REJECTED" } });
      await tx.notification.create({ data: { userId: verification.buyer.userId, title: approved ? "Buyer profile approved" : "Buyer profile rejected", message: approved ? "Your buyer profile has been verified and approved." : `Your buyer verification request was rejected.${note ? ` Reason: ${note}` : " Please update your details and apply again."}` } });
      return { approved };
    });

    if (!result) return NextResponse.json({ message: "This request has already been reviewed." }, { status: 409 });
    return NextResponse.json({ success: true, status: result.approved ? "APPROVED" : "REJECTED" });
  } catch (error) {
    console.error("Buyer verification update failed", error);
    return NextResponse.json({ message: "Could not update buyer request." }, { status: 500 });
  }
}
