import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../../../lib/prisma";
import { verifyToken } from "../../../../../lib/jwt";

export async function GET(request) {
  try {
    const adminId = verifyToken((await cookies()).get("token")?.value);
    const admin = adminId && await prisma.user.findUnique({ where: { id: adminId }, select: { role: true } });
    if (admin?.role !== "ADMIN") return NextResponse.json({ message: "Admin access required." }, { status: 403 });
    const { searchParams } = new URL(request.url);
    const state = searchParams.get("state")?.trim(), district = searchParams.get("district")?.trim(), village = searchParams.get("village")?.trim(), status = searchParams.get("status"), seasonId = searchParams.get("seasonId"), crop = searchParams.get("crop")?.trim();
    const registrations = await prisma.seasonRegistration.findMany({
      where: { ...(status && status !== "ALL" ? { status } : {}), ...(seasonId && seasonId !== "ALL" ? { seasonId } : {}), ...(crop ? { crops: { some: { cropName: { contains: crop, mode: "insensitive" } } } } : {}), farmer: { seller: { ...(state ? { state: { contains: state, mode: "insensitive" } } : {}), ...(district ? { district: { contains: district, mode: "insensitive" } } : {}), ...(village ? { village: { contains: village, mode: "insensitive" } } : {}) } } },
      orderBy: { updatedAt: "desc" },
      include: {
        season: true,
        crops: true,
        farmer: {
          include: {
            seller: {
              include: {
                user: { select: { id: true, name: true, phone: true, email: true } },
              },
            },
          },
        },
      },
    });
    return NextResponse.json({ registrations });
  } catch (error) { console.error("Season registrations failed", error); return NextResponse.json({ message: "Could not load registrations." }, { status: 500 }); }
}
