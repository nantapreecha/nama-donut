import { NextRequest } from "next/server";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();

  // สร้าง Set-Cookie headers สำหรับลบ cookie ทุกตัว
  const deletedHeaders: string[] = allCookies.map((c) => {
    const isSecure = c.name.startsWith("__Secure-") || c.name.startsWith("__Host-");
    const base = `${c.name}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`;
    return isSecure ? `${base}; Secure` : base;
  });

  // Return HTML ที่ redirect ไป /login
  const html = `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=/login"></head><body>กำลังออกจากระบบ...</body></html>`;

  return new Response(html, {
    status: 200,
    headers: [
      ["Content-Type", "text/html"],
      ...deletedHeaders.map((h) => ["Set-Cookie", h] as [string, string]),
    ],
  });
}
