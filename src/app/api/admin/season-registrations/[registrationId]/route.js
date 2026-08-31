import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../../../../lib/prisma";
import { verifyToken } from "../../../../../../lib/jwt";

export async function PATCH(request, { params }) {
  try {
    const session = verifyToken((await cookies()).get("token")?.value);
    const admin = session?.id && await prisma.user.findUnique({ where: { id: session.id }, select: { role: true } });
    if (admin?.role !== "ADMIN") return NextResponse.json({ message: "Admin access required." }, { status: 403 });
    const { registrationId } = await params;
    const { action, remarks = "" } = await request.json();
    if (!["VERIFY", "REJECT"].includes(action)) return NextResponse.json({ message: "Choose VERIFY or REJECT." }, { status: 400 });
    const registration = await prisma.seasonRegistration.findUnique({ where: { id: registrationId }, include: { farmer: { include: { seller: { select: { userId: true } } } } } });
    if (!registration || registration.status !== "SUBMITTED") return NextResponse.json({ message: "Only submitted registrations can be reviewed." }, { status: 400 });
    const verified = action === "VERIFY", message = verified ? "Your seasonal crop declaration has been verified." : `Your seasonal crop declaration was rejected.${remarks ? ` Remark: ${String(remarks).trim()}` : " Please update and submit again."}`;
    await prisma.$transaction([prisma.seasonRegistration.update({ where: { id: registrationId }, data: { status: verified ? "VERIFIED" : "REJECTED", verifiedAt: verified ? new Date() : null, remarks: String(remarks).trim().slice(0, 500) } }), prisma.notification.create({ data: { userId: registration.farmer.seller.userId, title: verified ? "Season declaration verified" : "Season declaration rejected", message } })]);
    return NextResponse.json({ success: true });
  } catch (error) { console.error("Season review failed", error); return NextResponse.json({ message: "Could not review registration." }, { status: 500 }); }
}
