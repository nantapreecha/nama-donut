import { NextResponse } from "next/server";

export async function GET() {
  const res = NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL ?? "http://localhost:3000"));
  // Clear all possible NextAuth v5 session cookies
  const cookieNames = [
    "authjs.session-token",
    "__Secure-authjs.session-token",
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
    "authjs.csrf-token",
    "__Host-authjs.csrf-token",
    "next-auth.csrf-token",
    "__Host-next-auth.csrf-token",
  ];
  for (const name of cookieNames) {
    res.cookies.set(name, "", { maxAge: 0, path: "/" });
  }
  return res;
}
