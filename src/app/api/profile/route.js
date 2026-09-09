import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../../lib/prisma";
import { verifyToken as readSessionToken } from "../../../../lib/jwt";

export async function GET(req) {
    try {
       const token = (await cookies()).get("token")?.value;

   
    if (!token) {
      return NextResponse.json(
        { message: "Please log in." },
        { status: 401 }
      );
    }
       
       
        const userdetail = readSessionToken(token);
        if (!userdetail) return NextResponse.json({ message: "Please log in." }, { status: 401 });

        const user = await prisma.user.findUnique({
            where: { id: userdetail.id },
            select: {
                id: true, name: true, phone: true, email: true, aadhaarNumber: true, role: true,
                phoneVerified: true, emailVerified: true, aadhaarVerified: true, createdAt: true,
                seller: {
                    select: {
                        sellerType: true, state: true, division: true, district: true, village: true, pinCode: true, address: true,
                        bankAccount: true, ifscCode: true, verificationStatus: true,
                        verificationRequests: {
                            orderBy: { createdAt: "desc" },
                            take: 1,
                            select: { status: true, createdAt: true, adminNote: true },
                        },
                        farmer: { select: { landArea: true, landUnit: true, khasraNumber: true, pmKisanId: true, kccNumber: true } },
                        fpo: { select: { organizationName: true, registrationNo: true, memberCount: true } },
                    },
                },
                buyer: {
                    select: {
                        buyerType: true, businessName: true, gstin: true, panNumber: true, address: true, state: true, division: true, district: true, village: true, pinCode: true, verificationStatus: true,
                        verificationRequests: {
                            orderBy: { createdAt: "desc" },
                            take: 1,
                            select: { status: true, createdAt: true, adminNote: true },
                        },
                    },
                },
                notifications: {
                    orderBy: { createdAt: "desc" },
                    take: 10,
                    select: { id: true, title: true, message: true, isRead: true, createdAt: true },
                },
            },
        });
        if (!user) return NextResponse.json({ message: "User not found." }, { status: 404 });
        return NextResponse.json({ user: user?.buyer ? { ...user, buyer: { ...user.buyer, city: user.buyer.village } } : user });
    } catch (error) {
        console.error("Profile request failed", error);
        return NextResponse.json({ message: "Could not load profile." }, { status: 500 });
    }
}
