import { cookies } from "next/headers";
import { verifyToken } from "@/lib/jwt";

export async function getCurrentUser() {
  const token = (await cookies()).get("token")?.value;

  if (!token) return null;

  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}
// Or inside any API route:
// import { cookies } from "next/headers";
// import { verifyToken } from "@/lib/jwt";

// const token = (await cookies()).get("token")?.value;

// if (!token) {
//   return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
// }

// const user = verifyToken(token);