import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../../../../../lib/prisma";
import { verifyToken } from "../../../../../../../lib/jwt";

export async function POST(request, { params }) {
  try {
    const session = verifyToken((await cookies()).get("token")?.value);
    const admin = session?.id && await prisma.user.findUnique({ where: { id: session.id }, select: { role: true } });
    if (admin?.role !== "ADMIN") return NextResponse.json({ message: "Admin access required." }, { status: 403 });
    const { seasonId } = await params;
    const body = await request.json();
    const district = String(body.district || "").trim();
    const condition = String(body.condition || "").trim();
    const rainfallMm = Number(body.rainfallMm);
    const temperatureC = Number(body.temperatureC);
    const yieldFactor = Number(body.yieldFactor);
    const qualityFactor = Number(body.qualityFactor || 1);
    const transportFactor = Number(body.transportFactor || 1);
    if (!district || !condition || !Number.isFinite(rainfallMm) || rainfallMm < 0 || !Number.isFinite(temperatureC) || !Number.isFinite(yieldFactor) || yieldFactor < 0.3 || yieldFactor > 1.5 || !Number.isFinite(qualityFactor) || qualityFactor < 0.5 || qualityFactor > 1.5 || !Number.isFinite(transportFactor) || transportFactor < 0.5 || transportFactor > 2) {
      return NextResponse.json({ message: "Enter valid district, weather and factors. Yield must be 0.3–1.5." }, { status: 400 });
    }
    const season = await prisma.season.findUnique({ where: { id: seasonId }, select: { id: true } });
    if (!season) return NextResponse.json({ message: "Season not found." }, { status: 404 });
    const existing = await prisma.seasonWeatherProfile.findFirst({ where: { seasonId, district: { equals: district, mode: "insensitive" } }, select: { id: true } });
    const values = { condition, rainfallMm, temperatureC, yieldFactor, qualityFactor, transportFactor, note: String(body.note || "").trim().slice(0, 500) || null };
    const profile = existing
      ? await prisma.seasonWeatherProfile.update({ where: { id: existing.id }, data: { ...values, district } })
      : await prisma.seasonWeatherProfile.create({ data: { seasonId, district, ...values } });
    return NextResponse.json({ profile, message: "Season weather profile saved." });
  } catch (error) {
    console.error("Season weather update failed", error);
    return NextResponse.json({ message: "Could not save season weather profile." }, { status: 500 });
  }
}
