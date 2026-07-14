import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const data = await req.json();
  const slot = await prisma.timeSlot.update({ where: { id }, data });
  return NextResponse.json(slot);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  // ลบถาวร — ปลดออเดอร์เก่าที่อ้างรอบนี้ก่อน (ออเดอร์ยังอยู่ครบ เพราะเก็บ roundTime ในตัวเอง)
  await prisma.$transaction([
    prisma.order.updateMany({ where: { timeSlotId: id }, data: { timeSlotId: null } }),
    prisma.timeSlot.delete({ where: { id } }),
  ]);
  return NextResponse.json({ ok: true });
}
