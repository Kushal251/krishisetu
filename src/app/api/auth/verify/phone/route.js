// app/api/auth/verify-phone/route.js

export async function POST(req) {
  const { otp } = await req.json();

  if (otp !== "1234") {
    return Response.json({ message: "Invalid OTP" }, { status: 400 });
  }

  return Response.json({
    verified: true,
    message: "Phone verified",
  });
}