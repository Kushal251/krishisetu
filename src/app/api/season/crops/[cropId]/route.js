import { NextResponse } from "next/server";
import { canEditRegistration, cropOptions, getVerifiedFarmer, inAcres } from "../../../../../../lib/season";
import { prisma } from "../../../../../../lib/prisma";

async function ownedCrop(cropId) {
  const farmerUser = await getVerifiedFarmer();
  if (!farmerUser) return { error: "Only verified farmers can edit crops.", status: 403 };
  const crop = await prisma.cropDeclaration.findUnique({ where: { id: cropId }, include: { registration: { include: { crops: true } } } });
  if (!crop || crop.registration.farmerId !== farmerUser.seller.farmer.id) return { error: "Crop declaration not found.", status: 404 };
  if (!canEditRegistration(crop.registration.status)) return { error: "Submitted registrations cannot be edited.", status: 400 };
  return { crop, farmerUser };
}

export async function PUT(request, { params }) {
  try {
    const { cropId } = await params;
    const result = await ownedCrop(cropId);
    if (result.error) return NextResponse.json({ message: result.error }, { status: result.status });
    const body = await request.json();
    const { cropName, variety, area, unit, sowingDate, irrigation, seedSource, expectedHarvestDate } = body;
    if (!cropOptions.includes(cropName) || !(Number(area) > 0) || !["ACRE", "HECTARE"].includes(unit) || !sowingDate || !irrigation || !expectedHarvestDate) return NextResponse.json({ message: "Complete all required crop details." }, { status: 400 });
    const totalOthers = result.crop.registration.crops.filter((crop) => crop.id !== cropId).reduce((total, crop) => total + inAcres(crop.area, crop.unit), 0);
    if (totalOthers + inAcres(area, unit) > inAcres(result.farmerUser.seller.farmer.landArea, result.farmerUser.seller.farmer.landUnit) + 0.0001) return NextResponse.json({ message: "Total declared crop area cannot exceed land owned." }, { status: 400 });
    const crop = await prisma.cropDeclaration.update({ where: { id: cropId }, data: { cropName, variety: variety?.trim() || null, area: Number(area), unit, sowingDate: new Date(sowingDate), irrigation: irrigation.trim(), seedSource: seedSource?.trim() || null, expectedHarvestDate: new Date(expectedHarvestDate) } });
    return NextResponse.json({ crop });
  } catch (error) { console.error("Crop update failed", error); return NextResponse.json({ message: "Could not update crop." }, { status: 500 }); }
}

export async function DELETE(request, { params }) {
  try {
    const { cropId } = await params;
    const result = await ownedCrop(cropId);
    if (result.error) return NextResponse.json({ message: result.error }, { status: result.status });
    await prisma.cropDeclaration.delete({ where: { id: cropId } });
    return NextResponse.json({ success: true });
  } catch (error) { console.error("Crop deletion failed", error); return NextResponse.json({ message: "Could not delete crop." }, { status: 500 }); }
}
