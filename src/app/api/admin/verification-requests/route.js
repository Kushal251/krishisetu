import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../../../lib/prisma";
import { verifyToken } from "../../../../../lib/jwt";

export async function GET(request) {
  try {
    const session = verifyToken((await cookies()).get("token")?.value);
    const admin = session?.id && await prisma.user.findUnique({ where: { id: session.id }, select: { role: true } });
    if (admin?.role !== "ADMIN") return NextResponse.json({ message: "Admin access required." }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const state = searchParams.get("state")?.trim();
    const district = searchParams.get("district")?.trim();
    const village = searchParams.get("village")?.trim();
    const sellerType = searchParams.get("sellerType");
    const status = searchParams.get("status") || "PENDING";

    const requests = await prisma.verificationRequest.findMany({
      where: {
        ...(status !== "ALL" ? { status } : {}),
        seller: {
          ...(sellerType && sellerType !== "ALL" ? { sellerType } : {}),
          ...(state ? { state: { contains: state, mode: "insensitive" } } : {}),
          ...(district ? { district: { contains: district, mode: "insensitive" } } : {}),
          ...(village ? { village: { contains: village, mode: "insensitive" } } : {}),
        },
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true, status: true, note: true, adminNote: true, createdAt: true, reviewedAt: true,
        seller: {
          select: {
            sellerType: true, village: true, district: true, state: true, address: true,
            bankAccount: true, ifscCode: true, verificationStatus: true,
            user: { select: { name: true, phone: true, email: true, aadhaarNumber: true } },
            farmer: { select: { landArea: true, landUnit: true, khasraNumber: true, pmKisanId: true, kccNumber: true } },
            fpo: { select: { organizationName: true, registrationNo: true, memberCount: true } },
          },
        },
      },
    });
    return NextResponse.json({ requests });
  } catch (error) {
    console.error("Verification queue failed", error);
    return NextResponse.json({ message: "Could not load verification requests." }, { status: 500 });
  }
}
