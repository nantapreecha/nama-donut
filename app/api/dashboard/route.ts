import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay } from "@/lib/dateUtils";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get("date");
  const date = dateParam ? startOfDay(new Date(dateParam)) : startOfDay(new Date());
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);

  const [batches, orders] = await Promise.all([
    prisma.stockBatch.findMany({
      where: { stockDate: date },
      orderBy: [{ roundTime: "asc" }, { doughType: "asc" }],
    }),
    prisma.order.findMany({
      where: { pickupDate: { gte: date, lt: nextDay }, status: { not: "CANCELLED" } },
      include: { customer: true },
      orderBy: [{ roundTime: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const totalSold = batches.reduce((s, b) => s + b.sold, 0);
  const pendingOrdersCount = orders.filter((o) => o.status === "PENDING").length;

  // Group stock by roundTime (สต๊อกกองเดียวต่อรอบ)
  const slotMap = new Map<string, {
    roundTime: string;
    pumpkin: { qty: number; sold: number };
    mochi: { qty: number; sold: number };
  }>();
  for (const b of batches) {
    if (!slotMap.has(b.roundTime)) slotMap.set(b.roundTime, { roundTime: b.roundTime, pumpkin: { qty: 0, sold: 0 }, mochi: { qty: 0, sold: 0 } });
    const slot = slotMap.get(b.roundTime)!;
    if (b.doughType === "PUMPKIN") slot.pumpkin = { qty: b.qty, sold: b.sold };
    if (b.doughType === "MOCHI") slot.mochi = { qty: b.qty, sold: b.sold };
  }
  const stockSummary = Array.from(slotMap.values()).sort((a, b) => a.roundTime.localeCompare(b.roundTime));

  return NextResponse.json({ totalSold, pendingOrdersCount, stockSummary, orders, date: date.toISOString() });
}
