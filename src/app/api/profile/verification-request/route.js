import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../../../lib/prisma";
import { verifyToken } from "../../../../../lib/jwt";

export async function POST(request) {
  try {
    const session = verifyToken((await cookies()).get("token")?.value);
    if (!session?.id) return NextResponse.json({ message: "Please log in." }, { status: 401 });

    const { note = "" } = await request.json();
    const seller = await prisma.seller.findUnique({ where: { userId: session.id }, select: { id: true, verificationStatus: true } });
    if (!seller) return NextResponse.json({ message: "Only sellers can request verification." }, { status: 403 });
    if (seller.verificationStatus === "VERIFIED") return NextResponse.json({ message: "Your profile is already verified." }, { status: 400 });

    const pendingRequest = await prisma.verificationRequest.findFirst({ where: { sellerId: seller.id, status: "PENDING" }, select: { id: true } });
    if (pendingRequest) return NextResponse.json({ message: "Your request is already pending with the admin." }, { status: 409 });

    const verificationRequest = await prisma.verificationRequest.create({ data: { sellerId: seller.id, note: typeof note === "string" ? note.trim().slice(0, 500) : "" } });
    return NextResponse.json({ success: true, request: verificationRequest }, { status: 201 });
  } catch (error) {
    console.error("Verification request failed", error);
    return NextResponse.json({ message: "Could not submit verification request." }, { status: 500 });
  }
}
