import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const orderType = searchParams.get("orderType");
  const slots = await prisma.timeSlot.findMany({
    where: {
      isActive: true,
      ...(orderType ? { orderType: orderType as any } : {}),
    },
    orderBy: { startTime: "asc" },
  });
  return NextResponse.json(slots);
}

export async function POST(req: Request) {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const data = await req.json();
  const slot = await prisma.timeSlot.create({ data });
  return NextResponse.json(slot);
}
