import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { hashPassword } from "../../../../../lib/bcrypt";

const SELLER_TYPES = ["FARMER", "FPO", "TRADER", "COOPERATIVE"];

const requiredText = (value) => typeof value === "string" && value.trim().length > 0;

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      name, phone, aadhaarNumber, password, role, sellerType,
      village, district, state, address, bankAccount, ifscCode,
      landArea, landUnit, khasraNumber, pmKisanId, kccNumber,
      organizationName, registrationNo, memberCount, email
    } = body;

    if (role !== "SELLER" || !SELLER_TYPES.includes(sellerType)) {
      return NextResponse.json({ message: "Please select a valid seller type." }, { status: 400 });
    }
    

    const commonValues = [name, phone, aadhaarNumber, password, village, district, state, address, bankAccount, ifscCode];
    if (!commonValues.every(requiredText)) {
      return NextResponse.json({ message: "Please complete all required personal, address, and bank details." }, { status: 400 });
    }
    if (!/^\d{10}$/.test(phone)) {
      return NextResponse.json({ message: "Phone number must contain exactly 10 digits." }, { status: 400 });
    }
    if (!/^\d{12}$/.test(aadhaarNumber)) {
      return NextResponse.json({ message: "Aadhaar number must contain exactly 12 digits." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ message: "Password must be at least 8 characters." }, { status: 400 });
    }
    if (sellerType === "FARMER" && (!(Number(landArea) > 0) || !requiredText(landUnit))) {
      return NextResponse.json({ message: "Enter a valid land area and land unit for the farmer profile." }, { status: 400 });
    }
    if (sellerType === "FPO" && (!requiredText(organizationName) || !requiredText(registrationNo) || !Number.isInteger(Number(memberCount)) || Number(memberCount) < 1)) {
      return NextResponse.json({ message: "Enter valid FPO organisation, registration, and member details." }, { status: 400 });
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ phone }, { aadhaarNumber }] },
      select: { id: true },
    });
    if (existingUser) {
      return NextResponse.json({ message: "An account already exists with this phone or Aadhaar number." }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name: name.trim(), phone, aadhaarNumber, password: passwordHash, role,
        ...(email?.trim() ? { email: email.trim().toLowerCase() } : {}),
        // Do not mark identity checks as verified until real verification APIs complete them.
        seller: {
          create: {
            sellerType, village: village.trim(), district: district.trim(), state: state.trim(),
            address: address.trim(), bankAccount: bankAccount.trim(), ifscCode: ifscCode.trim().toUpperCase(),
            farmer: sellerType === "FARMER" ? {
              create: { landArea: Number(landArea), landUnit, khasraNumber: khasraNumber || null, pmKisanId: pmKisanId || null, kccNumber: kccNumber || null },
            } : undefined,
            fpo: sellerType === "FPO" ? {
              create: { organizationName: organizationName.trim(), registrationNo: registrationNo.trim(), memberCount: Number(memberCount) },
            } : undefined,
          },
        },
      },
      select: { id: true },
    });

    return NextResponse.json({ success: true, userId: user.id }, { status: 201 });
  } catch (error) {
    if (error?.code === "P2002") {
      return NextResponse.json({ message: "An account or FPO with these unique details already exists." }, { status: 409 });
    }
    console.error("Registration failed:", error);
    return NextResponse.json({ message: "Registration failed. Please try again." }, { status: 500 });
  }
}
