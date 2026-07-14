import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  // all=1 → รวมรอบที่ปิดอยู่ด้วย (ใช้ในหน้าตั้งค่า) ปกติคืนเฉพาะรอบที่เปิด
  const includeAll = searchParams.get("all") === "1";
  const slots = await prisma.timeSlot.findMany({
    where: includeAll ? {} : { isActive: true },
    orderBy: { startTime: "asc" },
  });
  return NextResponse.json(slots);
}

export async function POST(req: Request) {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { label, startTime, maxOrders } = await req.json();
  const slot = await prisma.timeSlot.create({
    data: { label, startTime, endTime: "", maxOrders: maxOrders ?? 0 },
  });
  return NextResponse.json(slot);
}
