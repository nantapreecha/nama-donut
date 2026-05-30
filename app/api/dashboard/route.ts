import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay } from "@/lib/dateUtils";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get("date");
  const date = dateParam ? startOfDay(new Date(dateParam)) : startOfDay(new Date());
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);

  const [batches, pendingOrders] = await Promise.all([
    prisma.stockBatch.findMany({
      where: { stockDate: date },
      orderBy: [{ orderType: "asc" }, { roundTime: "asc" }, { doughType: "asc" }],
    }),
    prisma.order.count({
      where: { pickupDate: { gte: date, lt: nextDay }, status: "PENDING" },
    }),
  ]);

  const totalSold = batches.reduce((s, b) => s + b.sold, 0);

  // Group by orderType + roundTime
  type SlotKey = string;
  const slotMap = new Map<SlotKey, { orderType: string; roundTime: string; pumpkin: { qty: number; sold: number }; mochi: { qty: number; sold: number } }>();

  for (const b of batches) {
    const key = `${b.orderType}|${b.roundTime}`;
    if (!slotMap.has(key)) {
      slotMap.set(key, { orderType: b.orderType, roundTime: b.roundTime, pumpkin: { qty: 0, sold: 0 }, mochi: { qty: 0, sold: 0 } });
    }
    const slot = slotMap.get(key)!;
    if (b.doughType === "PUMPKIN") slot.pumpkin = { qty: b.qty, sold: b.sold };
    if (b.doughType === "MOCHI") slot.mochi = { qty: b.qty, sold: b.sold };
  }

  const stockSummary = Array.from(slotMap.values()).sort((a, b) => {
    if (a.orderType !== b.orderType) return a.orderType.localeCompare(b.orderType);
    return a.roundTime.localeCompare(b.roundTime);
  });

  return NextResponse.json({ totalSold, pendingOrdersCount: pendingOrders, stockSummary, date: date.toISOString() });
}
