import { NextResponse } from "next/server";
import { getOrCreateCurrentRegistration } from "../../../../../lib/season";

export async function GET() {
  try {
    const result = await getOrCreateCurrentRegistration();
    if (result.error) return NextResponse.json({ message: result.error }, { status: result.status });
    return NextResponse.json({ season: result.season, registration: result.registration, farmer: result.farmerUser.seller.farmer, seller: result.farmerUser.seller });
  } catch (error) {
    console.error("Season registration lookup failed", error);
    return NextResponse.json({ message: "Could not load seasonal registration." }, { status: 500 });
  }
}
