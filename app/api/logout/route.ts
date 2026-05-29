import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  // Clear all NextAuth session cookies
  const allCookies = cookieStore.getAll();
  const res = NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL ?? "http://localhost:3000"));
  for (const cookie of allCookies) {
    if (cookie.name.includes("next-auth") || cookie.name.includes("authjs")) {
      res.cookies.delete(cookie.name);
    }
  }
  return res;
}
