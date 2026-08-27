import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../../../lib/prisma";
import { verifyToken } from "../../../../../lib/jwt";

async function requireAdmin() {
  const id = verifyToken((await cookies()).get("token")?.value);
  if (!id) return null;
  return prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
}

export async function GET() {
  const admin = await requireAdmin();
  if (admin?.role !== "ADMIN") return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  const seasons = await prisma.season.findMany({ orderBy: { startDate: "desc" }, include: { _count: { select: { registrations: true } } } });
  return NextResponse.json({ seasons });
}

export async function POST(request) {
  try {
    const admin = await requireAdmin();
    if (admin?.role !== "ADMIN") return NextResponse.json({ message: "Admin access required." }, { status: 403 });
    const { name, year, startDate, endDate } = await request.json();
    if (!["KHARIF", "RABI", "ZAID"].includes(name) || !year?.trim() || !startDate || !endDate || new Date(endDate) <= new Date(startDate)) return NextResponse.json({ message: "Enter valid season details." }, { status: 400 });
    const season = await prisma.season.create({ data: { name, year: year.trim(), startDate: new Date(startDate), endDate: new Date(endDate) } });
    return NextResponse.json({ season }, { status: 201 });
  } catch (error) {
    if (error?.code === "P2002") return NextResponse.json({ message: "This season and year already exist." }, { status: 409 });
    return NextResponse.json({ message: "Could not create season." }, { status: 500 });
  }
}
