import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../../../../lib/prisma";
import { verifyToken } from "../../../../../../lib/jwt";

async function requireAdmin() {
  const session = verifyToken((await cookies()).get("token")?.value);
  if (!session?.id) return null;
  return prisma.user.findUnique({ where: { id: session.id }, select: { id: true, role: true } });
}

// GET /api/center/centers/[id] — center detail
export async function GET(request, { params }) {
  try {
    const session = verifyToken((await cookies()).get("token")?.value);
    if (!session?.id) return NextResponse.json({ message: "Please log in." }, { status: 401 });
    const viewer = await prisma.user.findUnique({ where: { id: session.id }, select: { role: true } });
    const { id: centerId } = await params;
    const center = await prisma.center.findUnique({
      where: { id: centerId },
      include: {
        cropPrices: { where: { crop: "SOYBEAN" }, select: { crop: true, price: true, unit: true, updatedAt: true } },
        ...(viewer?.role === "ADMIN" ? {
          listings: { where: { isActive: true, availableQty: { gt: 0 } }, select: { id: true, grade: true, availableQty: true, reservedQty: true, pricePerQuintal: true, storageCharge: true, handlingCharge: true, gstRate: true, availableUntil: true, pickupStart: true, pickupEnd: true }, orderBy: { availableUntil: "asc" } },
          bookings: { where: { status: "GRADED", inspection: { is: { sellerDecision: "ACCEPTED" } } }, select: { id: true, quantity: true, seller: { select: { user: { select: { name: true, phone: true } } } }, inspection: { select: { grade: true, gradePrice: true } } }, orderBy: { createdAt: "asc" } },
          operators: { select: { id: true, name: true, phone: true, email: true, role: true } },
          _count: { select: { bookings: true } },
        } : {}),
      },
    });

    if (!center) return NextResponse.json({ message: "Center not found." }, { status: 404 });
    if (viewer?.role === "ADMIN") {
      const costs = await prisma.$queryRaw`SELECT "id", "costPrice" FROM "CenterListing" WHERE "centerId" = ${centerId}`;
      const costByListingId = new Map(costs.map((row) => [row.id, row.costPrice]));
      center.listings = center.listings.map((listing) => ({ ...listing, costPrice: costByListingId.get(listing.id) ?? 0 }));
    }
    return NextResponse.json({ center });
  } catch (error) {
    console.error("Center detail failed", error);
    return NextResponse.json({ message: "Could not load center." }, { status: 500 });
  }
}

// PATCH /api/center/centers/[id] — update center (admin only)
export async function PATCH(request, { params }) {
  try {
    const admin = await requireAdmin();
    if (admin?.role !== "ADMIN")
      return NextResponse.json({ message: "Admin access required." }, { status: 403 });
     const { id: centerId } = await params;
    const body = await request.json();
    const { name, state, district, village, pinCode, address, latitude, longitude,
            phone, email, totalCapacity, status } = body;

    const data = {};
    if (name         !== undefined) data.name         = name.trim();
    if (state        !== undefined) data.state        = state.trim();
    if (district     !== undefined) data.district     = district.trim();
    if (village      !== undefined) data.village      = village?.trim() || null;
    if (pinCode      !== undefined) data.pinCode      = pinCode.trim();
    if (address      !== undefined) data.address      = address.trim();
    if (phone        !== undefined) data.phone        = phone.trim();
    if (email        !== undefined) data.email        = email?.trim() || null;
    if (latitude     !== undefined) data.latitude     = latitude  ? parseFloat(latitude)  : null;
    if (longitude    !== undefined) data.longitude    = longitude ? parseFloat(longitude) : null;
    if (totalCapacity !== undefined) data.totalCapacity = parseFloat(totalCapacity);
    if (status       !== undefined) data.status       = status;

    const center = await prisma.center.update({ where: { id: centerId }, data });
    return NextResponse.json({ center });
  } catch (error) {
    if (error?.code === "P2025")
      return NextResponse.json({ message: "Center not found." }, { status: 404 });
    console.error("Center update failed", error);
    return NextResponse.json({ message: "Could not update center." }, { status: 500 });
  }
}
