import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../../../lib/prisma";
import { verifyToken } from "../../../../../lib/jwt";

async function requireAdmin() {
  const session = verifyToken((await cookies()).get("token")?.value);
  if (!session?.id) return null;
  return prisma.user.findUnique({ where: { id: session.id }, select: { id: true, role: true } });
}

// GET /api/center/centers — list all centers (any authenticated user)
export async function GET(request) {
  try {
    const session = verifyToken((await cookies()).get("token")?.value);
    if (!session?.id) return NextResponse.json({ message: "Please log in." }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const state    = searchParams.get("state")?.trim();
    const district = searchParams.get("district")?.trim();
    const status   = searchParams.get("status");

    const centers = await prisma.center.findMany({
      where: {
        ...(status && status !== "ALL" ? { status } : {}),
        ...(state    ? { state:    { contains: state,    mode: "insensitive" } } : {}),
        ...(district ? { district: { contains: district, mode: "insensitive" } } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        cropPrices: { where: { crop: "SOYBEAN" }, select: { crop: true, price: true, unit: true, updatedAt: true } },
        _count: { select: { bookings: true, operators: true } },
      },
    });

    return NextResponse.json({ centers });
  } catch (error) {
    console.error("Centers list failed", error);
    return NextResponse.json({ message: "Could not load centers." }, { status: 500 });
  }
}

// POST /api/center/centers — create a center (admin only)
export async function POST(request) {
  try {
    const admin = await requireAdmin();
    if (admin?.role !== "ADMIN")
      return NextResponse.json({ message: "Admin access required." }, { status: 403 });

    const { code, name, state, district, village, pinCode, address, latitude, longitude,
            phone, email, totalCapacity } = await request.json();

    if (!code?.trim() || !name?.trim() || !state?.trim() || !district?.trim() ||
        !pinCode?.trim() || !address?.trim() || !phone?.trim() || !totalCapacity) {
      return NextResponse.json({ message: "All required fields must be filled." }, { status: 400 });
    }
    if (!/^\d{6}$/.test(pinCode.trim())) {
      return NextResponse.json({ message: "PIN code must be exactly 6 digits." }, { status: 400 });
    }

    const center = await prisma.center.create({
      data: {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        state: state.trim(),
        district: district.trim(),
        village: village?.trim() || null,
        pinCode: pinCode.trim(),
        address: address.trim(),
        latitude:  latitude  ? parseFloat(latitude)  : null,
        longitude: longitude ? parseFloat(longitude) : null,
        phone: phone.trim(),
        email: email?.trim() || null,
        totalCapacity: parseFloat(totalCapacity),
      },
    });

    return NextResponse.json({ center }, { status: 201 });
  } catch (error) {
    if (error?.code === "P2002")
      return NextResponse.json({ message: "A center with this code already exists." }, { status: 409 });
    console.error("Center create failed", error);
    return NextResponse.json({ message: "Could not create center." }, { status: 500 });
  }
}
