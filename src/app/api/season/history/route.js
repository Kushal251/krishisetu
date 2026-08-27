import { NextResponse } from "next/server";
import { getVerifiedFarmer } from "../../../../../lib/season";
import { prisma } from "../../../../../lib/prisma";

export async function GET() {
  try {
    const farmerUser = await getVerifiedFarmer();
    if (!farmerUser) return NextResponse.json({ message: "Only verified farmers can view seasonal history." }, { status: 403 });
    const registrations = await prisma.seasonRegistration.findMany({ where: { farmerId: farmerUser.seller.farmer.id }, orderBy: { createdAt: "desc" }, include: { season: true, crops: { orderBy: { createdAt: "asc" } } } });
    return NextResponse.json({ registrations });
  } catch (error) {
    console.error("Season history failed", error);
    return NextResponse.json({ message: "Could not load seasonal history." }, { status: 500 });
  }
}
