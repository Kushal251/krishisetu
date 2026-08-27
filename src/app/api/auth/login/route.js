import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { comparePassword } from "../../../../../lib/bcrypt";
import { generateToken } from "../../../../../lib/jwt";

export async function POST(req) {
  try {
    const { phone, password } = await req.json();

    const user = await prisma.user.findUnique({
      where: { phone },
      include: {
        seller: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: "Invalid phone number" },
        { status: 401 }
      );
    }

    const valid = await comparePassword(password, user.password);

    if (!valid) {
      return NextResponse.json(
        { message: "Invalid password" },
        { status: 401 }
      );
    }

    const token = generateToken(user);

  const response =  NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        sellerType: user.seller?.sellerType || null,
      },
    });
    response.cookies.set("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return response;
  } catch (error) {
    return NextResponse.json(
      { message: "Login failed", error: error.message },
      { status: 500 }
    );
  }
}