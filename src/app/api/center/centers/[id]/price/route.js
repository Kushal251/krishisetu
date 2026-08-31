import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../../../../../lib/prisma";
import { verifyToken } from "../../../../../../../lib/jwt";

export async function POST(request, { params }) {
  try {
    const session = verifyToken((await cookies()).get("token")?.value);
    const user = session?.id && await prisma.user.findUnique({ where: { id: session.id }, select: { role: true } });
    if (user?.role !== "ADMIN") return NextResponse.json({ message: "Admin access required." }, { status: 403 });

    const { id: centerId } = await params;
    const { price } = await request.json();
    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice) || numericPrice <= 0)
      return NextResponse.json({ message: "Enter a valid soybean price." }, { status: 400 });

    const cropPrice = await prisma.cropPrice.upsert({
      where: { centerId_crop: { centerId, crop: "SOYBEAN" } },
      update: { price: numericPrice, unit: "quintal" },
      create: { centerId, crop: "SOYBEAN", price: numericPrice, unit: "quintal" },
    });
    return NextResponse.json({ cropPrice });
  } catch (error) {
    console.error("Center price update failed", error);
    return NextResponse.json({ message: "Could not update soybean price." }, { status: 500 });
  }
}
