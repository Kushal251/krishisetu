import { NextResponse } from "next/server";
import { canEditRegistration, cropOptions, getOrCreateCurrentRegistration, inAcres } from "../../../../../lib/season";
import { prisma } from "../../../../../lib/prisma";

export async function POST(request) {
  try {
    const result = await getOrCreateCurrentRegistration();
    if (result.error) return NextResponse.json({ message: result.error }, { status: result.status });
    if (!result.registration) return NextResponse.json({ message: "There is no active season right now." }, { status: 400 });
    if (!canEditRegistration(result.registration.status)) return NextResponse.json({ message: "Submitted registrations cannot be edited." }, { status: 400 });
    const { cropName, variety, area, unit, sowingDate, irrigation, seedSource, expectedHarvestDate } = await request.json();
    if (!cropOptions.includes(cropName) || !(Number(area) > 0) || !["ACRE", "HECTARE"].includes(unit) || !sowingDate || !irrigation || !expectedHarvestDate) return NextResponse.json({ message: "Complete all required crop details." }, { status: 400 });
    if (new Date(expectedHarvestDate) <= new Date(sowingDate)) return NextResponse.json({ message: "Harvest date must be after sowing date." }, { status: 400 });
    const alreadyDeclared = result.registration.crops.reduce((total, crop) => total + inAcres(crop.area, crop.unit), 0);
    const ownedLand = inAcres(result.farmerUser.seller.farmer.landArea, result.farmerUser.seller.farmer.landUnit);
    if (alreadyDeclared + inAcres(area, unit) > ownedLand + 0.0001) return NextResponse.json({ message: "Total declared crop area cannot exceed land owned in your profile." }, { status: 400 });
    const crop = await prisma.cropDeclaration.create({ data: { registrationId: result.registration.id, cropName, variety: variety?.trim() || null, area: Number(area), unit, sowingDate: new Date(sowingDate), irrigation: irrigation.trim(), seedSource: seedSource?.trim() || null, expectedHarvestDate: new Date(expectedHarvestDate) } });
    return NextResponse.json({ crop }, { status: 201 });
  } catch (error) {
    console.error("Crop creation failed", error);
    return NextResponse.json({ message: "Could not save crop declaration." }, { status: 500 });
  }
}
