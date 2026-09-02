import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../../../../../lib/prisma";
import { verifyToken } from "../../../../../../../lib/jwt";

async function requireAdmin() {
  const session = verifyToken((await cookies()).get("token")?.value);
  if (!session?.id) return null;
  return prisma.user.findUnique({ where: { id: session.id }, select: { id: true, role: true } });
}

// POST /api/center/centers/[id]/operators
// Body: { userId } — assigns a CENTER or ADMIN user as operator of this center
export async function POST(request, { params }) {
  try {
    const { id: centerId } = await params;
    const admin = await requireAdmin();
    if (admin?.role !== "ADMIN")
      return NextResponse.json({ message: "Admin access required." }, { status: 403 });

    const { userId } = await request.json();
    if (!userId?.trim())
      return NextResponse.json({ message: "userId is required." }, { status: 400 });

    // Center operators can be dedicated CENTER users or administrators.
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, name: true },
    });
    if (!user)
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    if (!["CENTER", "ADMIN"].includes(user.role))
      return NextResponse.json({ message: "Only CENTER or ADMIN users can be assigned as operators." }, { status: 400 });

    // Verify center exists
    const center = await prisma.center.findUnique({ where: { id: centerId }, select: { id: true } });
    if (!center)
      return NextResponse.json({ message: "Center not found." }, { status: 404 });

    // Link user to this center
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { centerId },
      select: { id: true, name: true, phone: true, email: true, centerId: true },
    });

    return NextResponse.json({ operator: updated }, { status: 201 });
  } catch (error) {
    console.error("Assign operator failed", error);
    return NextResponse.json({ message: "Could not assign operator." }, { status: 500 });
  }
}

// DELETE /api/center/centers/[id]/operators
// Body: { userId } — removes operator from center
export async function DELETE(request, { params }) {
  try {
    const { id: centerId } = await params;
    const admin = await requireAdmin();
    if (admin?.role !== "ADMIN")
      return NextResponse.json({ message: "Admin access required." }, { status: 403 });

    const { userId } = await request.json();
    if (!userId?.trim())
      return NextResponse.json({ message: "userId is required." }, { status: 400 });

    // Unlink user from this center only if they belong to this center
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { centerId: true } });
    if (!user || user.centerId !== centerId)
      return NextResponse.json({ message: "This user is not an operator of this center." }, { status: 400 });

    await prisma.user.update({ where: { id: userId }, data: { centerId: null } });
    return NextResponse.json({ message: "Operator removed." });
  } catch (error) {
    console.error("Remove operator failed", error);
    return NextResponse.json({ message: "Could not remove operator." }, { status: 500 });
  }
}
