import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();

  const origin = req.nextUrl.origin;
  const res = NextResponse.redirect(new URL("/login", origin));

  for (const c of allCookies) {
    res.cookies.set(c.name, "", { maxAge: 0, path: "/" });
  }
  return res;
}
