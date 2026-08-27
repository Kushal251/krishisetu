// app/api/auth/verify-aadhaar/route.js

export async function POST(req) {
  const { aadhaarNumber, otp } = await req.json();

  if (aadhaarNumber.length !== 12) {
    return Response.json({ message: "Invalid Aadhaar" }, { status: 400 });
  }

  if (otp !== "1234") {
    return Response.json({ message: "Invalid OTP" }, { status: 400 });
  }

  return Response.json({
    verified: true,
    message: "Aadhaar verified",
  });
}