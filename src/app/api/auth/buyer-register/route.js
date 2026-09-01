import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { hashPassword } from "../../../../../lib/bcrypt";

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, password, buyerType, businessName, gstin, panNumber, address, city, state } = body;
    const phone = String(body.phone || "").replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
    const pinCode = String(body.pinCode || "").replace(/\D/g, "");
    if (!name?.trim() || !email?.trim() || !password || !businessName?.trim() || !gstin?.trim() || !panNumber?.trim() || !address?.trim() || !city?.trim() || !state?.trim()) return NextResponse.json({ message: "Please complete every buyer and business field." }, { status: 400 });
    if (!/^\d{10}$/.test(phone)) return NextResponse.json({ message: "Enter a valid 10-digit mobile number." }, { status: 400 });
    if (!/^\d{6}$/.test(pinCode)) return NextResponse.json({ message: "Enter a valid 6-digit PIN code." }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return NextResponse.json({ message: "Enter a valid business email address." }, { status: 400 });
    if (!["PROCESSOR", "WHOLESALER", "RETAILER", "EXPORTER"].includes(buyerType)) return NextResponse.json({ message: "Choose a valid buyer type." }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ message: "Password must be at least 8 characters." }, { status: 400 });
    const user = await prisma.user.create({ data: { name: name.trim(), phone, email: email.trim().toLowerCase(), password: await hashPassword(password), role: "BUYER", buyer: { create: { buyerType, businessName: businessName.trim(), gstin: gstin.trim().toUpperCase(), panNumber: panNumber.trim().toUpperCase(), address: address.trim(), city: city.trim(), state: state.trim(), pinCode, verificationRequests: { create: { note: "Automatically submitted when the buyer account was created." } } } } }, select: { id: true } });
    return NextResponse.json({ success: true, userId: user.id }, { status: 201 });
  } catch (error) { if (error?.code === "P2002") return NextResponse.json({ message: "An account or GSTIN already exists." }, { status: 409 }); return NextResponse.json({ message: "Could not create buyer account." }, { status: 500 }); }
}
