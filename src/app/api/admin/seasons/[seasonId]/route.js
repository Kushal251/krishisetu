import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../../../../lib/prisma";
import { verifyToken } from "../../../../../../lib/jwt";

export async function PATCH(request, { params }) {
  try {
    const session = verifyToken((await cookies()).get("token")?.value);
    const admin = session?.id && await prisma.user.findUnique({ where: { id: session.id }, select: { role: true } });
    if (admin?.role !== "ADMIN") return NextResponse.json({ message: "Admin access required." }, { status: 403 });
    const { seasonId } = await params;
    const { action } = await request.json();
    if (!["ACTIVATE", "CLOSE"].includes(action)) return NextResponse.json({ message: "Choose ACTIVATE or CLOSE." }, { status: 400 });
    const season = await prisma.season.findUnique({ where: { id: seasonId } });
    if (!season) return NextResponse.json({ message: "Season not found." }, { status: 404 });
    await prisma.$transaction(async (tx) => {
      if (action === "ACTIVATE") {
        await tx.season.updateMany({ where: { status: "ACTIVE", id: { not: seasonId } }, data: { status: "CLOSED" } });
        await tx.season.update({ where: { id: seasonId }, data: { status: "ACTIVE" } });
      } else {
        await tx.season.update({ where: { id: seasonId }, data: { status: "CLOSED" } });
      }
    });
    return NextResponse.json({ success: true });
  } catch (error) { console.error("Season update failed", error); return NextResponse.json({ message: "Could not update season." }, { status: 500 }); }
}
