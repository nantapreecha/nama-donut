import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();

  // ใช้ x-forwarded-host สำหรับ Railway/proxy environment
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const origin = `${proto}://${host}`;

  const res = NextResponse.redirect(new URL("/login", origin));

  for (const c of allCookies) {
    res.cookies.set(c.name, "", { maxAge: 0, path: "/" });
  }
  return res;
}
