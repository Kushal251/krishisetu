import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { hashPassword } from "../../../../../lib/bcrypt";

export async function POST(req) {
  try {
    const {
      phone,
      aadhaarNumber,
      otp,
      newPassword,
      confirmPassword,
    } = await req.json();

    if (otp !== "1234") {
      return NextResponse.json(
        { message: "Invalid OTP" },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { message: "Passwords do not match" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        phone,
        aadhaarNumber,
        role: "SELLER",
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    const hashed = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Password updated successfully",
    });

  } catch (error) {
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  }
}