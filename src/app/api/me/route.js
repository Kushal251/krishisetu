// app/api/me/route.ts
import { cookies } from "next/headers";
import { verifyToken } from "../../../../lib/jwt";

export async function GET() {
  const token = (await cookies()).get("token")?.value;

  if (!token) {
    return Response.json({ user: null }, { status: 401 });
  }

  const user = verifyToken(token);

  return Response.json({ user });
}