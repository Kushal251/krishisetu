import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../../../lib/prisma";
import { verifyToken } from "../../../../../lib/jwt";
import { getMarketForecast } from "../../../../../lib/marketForecast";

export async function GET(request) {
  try {
    const session = verifyToken((await cookies()).get("token")?.value);
    if (!session?.id) return NextResponse.json({ message: "Login required." }, { status: 401 });
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { role: true, seller: { select: { district: true, state: true } }, buyer: { select: { district: true, state: true } }, center: { select: { district: true, state: true } } },
    });
    if (!user) return NextResponse.json({ message: "Account not found." }, { status: 404 });

    const quantityQuintal = Number(new URL(request.url).searchParams.get("quantity") || 10);
    if (!Number.isFinite(quantityQuintal) || quantityQuintal <= 0 || quantityQuintal > 100000)
      return NextResponse.json({ message: "Quantity must be between 0.01 and 100,000 quintal." }, { status: 400 });

    const forecast = await getMarketForecast({ crop: "SOYBEAN", quantityQuintal, originDistrict: user.seller?.district || user.buyer?.district || user.center?.district || "", originState: user.seller?.state || user.buyer?.state || user.center?.state || "" });
    return NextResponse.json(forecast);
  } catch (error) {
    console.error("Market forecast failed", error);
    return NextResponse.json({ message: "Market forecast could not be generated." }, { status: 500 });
  }
}
