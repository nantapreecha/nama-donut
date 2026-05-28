import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay } from "@/lib/dateUtils";

export async function GET() {
  const today = startOfDay(new Date());
  const nextDay = new Date(today);
  nextDay.setDate(nextDay.getDate() + 1);

  const [stocks, pendingOrders, products] = await Promise.all([
    prisma.dailyStock.findMany({ where: { date: today }, include: { product: true } }),
    prisma.order.findMany({
      where: { pickupDate: { gte: today, lt: nextDay }, status: "PENDING" },
      include: { customer: true, timeSlot: true, items: { include: { product: true } } },
    }),
    prisma.product.findMany({ where: { isActive: true } }),
  ]);

  const stockMap = new Map(stocks.map((s) => [s.productId, s]));

  const stockSummary = products.map((p) => {
    const s = stockMap.get(p.id);
    const produced = s?.produced ?? 0;
    const reserved = s?.reserved ?? 0;
    const walkIn = s?.walkIn ?? 0;
    const sold = reserved + walkIn;
    const available = produced - sold;
    return { productId: p.id, name: p.name, produced, reserved, walkIn, sold, available: Math.max(0, available) };
  });

  const totalSold = stockSummary.reduce((sum, s) => sum + s.sold, 0);
  const lowStock = stockSummary.filter((s) => s.available > 0 && s.available <= 5);
  const outOfStock = stockSummary.filter((s) => s.produced > 0 && s.available === 0);

  return NextResponse.json({
    totalSold,
    pendingOrdersCount: pendingOrders.length,
    stockSummary,
    pendingOrders,
    lowStock,
    outOfStock,
  });
}
