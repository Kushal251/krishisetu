import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../../../../lib/prisma";
import { verifyToken } from "../../../../../../lib/jwt";
import { getCenterTradeActor } from "../../../../../../lib/centerTrade";

export async function GET(request) {
  try {
    const session = verifyToken((await cookies()).get("token")?.value);
    const adminCenterId = new URL(request.url).searchParams.get("centerId");
    const actor = await getCenterTradeActor(session?.id, adminCenterId);
    if (!actor) return NextResponse.json({ message: "Center operator access required." }, { status: 403 });

    const listings = await prisma.centerListing.findMany({
      where: { centerId: { not: actor.centerId }, isActive: true, availableUntil: { gte: new Date() }, availableQty: { gt: 0 } },
      include: { center: { select: { id: true, name: true, district: true, state: true, address: true, phone: true } } },
      orderBy: { availableUntil: "asc" },
    });
    return NextResponse.json({ listings });
  } catch (error) {
    console.error("Center trade marketplace failed", error);
    return NextResponse.json({ message: "Could not load center marketplace." }, { status: 500 });
  }
}
