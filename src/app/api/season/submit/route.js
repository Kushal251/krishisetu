import { NextResponse } from "next/server";
import { canEditRegistration, getOrCreateCurrentRegistration } from "../../../../../lib/season";
import { prisma } from "../../../../../lib/prisma";

export async function POST() {
  try {
    const result = await getOrCreateCurrentRegistration();
    if (result.error) return NextResponse.json({ message: result.error }, { status: result.status });
    if (!result.registration || !canEditRegistration(result.registration.status)) return NextResponse.json({ message: "This registration cannot be submitted." }, { status: 400 });
    if (result.registration.crops.length === 0) return NextResponse.json({ message: "Add at least one crop before submitting." }, { status: 400 });
    const registration = await prisma.seasonRegistration.update({ where: { id: result.registration.id }, data: { status: "SUBMITTED", submittedAt: new Date(), remarks: null } });
    return NextResponse.json({ registration });
  } catch (error) { console.error("Season submission failed", error); return NextResponse.json({ message: "Could not submit registration." }, { status: 500 }); }
}
