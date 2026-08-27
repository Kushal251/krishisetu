import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../../../lib/prisma";
import { verifyToken } from "../../../../../lib/jwt";

async function getOperatorCenter(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, centerId: true },
  });
  return user;
}

// GET /api/center/warehouses — list warehouses for operator's center
export async function GET() {
  try {
    const userId = verifyToken((await cookies()).get("token")?.value);
    if (!userId) return NextResponse.json({ message: "Please log in." }, { status: 401 });

    const user = await getOperatorCenter(userId);
    if (user?.role !== "CENTER" && user?.role !== "ADMIN")
      return NextResponse.json({ message: "Access denied." }, { status: 403 });

    // Admin can use query param centerId; operator uses their assigned center
    const centerId = user.centerId;
    if (!centerId)
      return NextResponse.json({ message: "No center assigned." }, { status: 400 });

    const warehouses = await prisma.warehouse.findMany({
      where: { centerId },
      orderBy: { name: "asc" },
      include: {
        _count: { select: { inventoryLots: true } },
      },
    });

    return NextResponse.json({ warehouses });
  } catch (error) {
    console.error("Warehouses list failed", error);
    return NextResponse.json({ message: "Could not load warehouses." }, { status: 500 });
  }
}

// POST /api/center/warehouses — create warehouse (admin creates, operator can also create)
export async function POST(request) {
  try {
    const userId = verifyToken((await cookies()).get("token")?.value);
    if (!userId) return NextResponse.json({ message: "Please log in." }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, centerId: true },
    });

    if (user?.role !== "CENTER" && user?.role !== "ADMIN")
      return NextResponse.json({ message: "Access denied." }, { status: 403 });

    const { name, totalCapacity, centerId: bodyCenter } = await request.json();

    // Operators can only create warehouses for their center
    const resolvedCenterId = user.role === "ADMIN" ? (bodyCenter || user.centerId) : user.centerId;

    if (!resolvedCenterId)
      return NextResponse.json({ message: "No center specified." }, { status: 400 });
    if (!name?.trim())
      return NextResponse.json({ message: "Warehouse name is required." }, { status: 400 });
    if (!totalCapacity || parseFloat(totalCapacity) <= 0)
      return NextResponse.json({ message: "Capacity must be greater than 0." }, { status: 400 });

    const warehouse = await prisma.warehouse.create({
      data: {
        centerId: resolvedCenterId,
        name: name.trim(),
        totalCapacity: parseFloat(totalCapacity),
      },
    });

    return NextResponse.json({ warehouse }, { status: 201 });
  } catch (error) {
    console.error("Warehouse create failed", error);
    return NextResponse.json({ message: "Could not create warehouse." }, { status: 500 });
  }
}
