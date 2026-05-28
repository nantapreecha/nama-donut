import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay } from "@/lib/dateUtils";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get("date");
  const date = dateParam ? new Date(dateParam) : startOfDay(new Date());

  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  const stocks = await prisma.dailyStock.findMany({
    where: { date },
  });

  const stockMap = new Map(stocks.map((s) => [s.productId, s]));

  const result = products.map((p) => {
    const s = stockMap.get(p.id);
    const produced = s?.produced ?? 0;
    const reserved = s?.reserved ?? 0;
    const walkIn = s?.walkIn ?? 0;
    const available = produced - reserved - walkIn;
    return {
      productId: p.id,
      name: p.name,
      produced,
      reserved,
      walkIn,
      available: Math.max(0, available),
    };
  });

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const { productId, produced, date: dateParam } = await req.json();
  const date = dateParam ? new Date(dateParam) : startOfDay(new Date());

  const stock = await prisma.dailyStock.upsert({
    where: { date_productId: { date, productId } },
    update: { produced },
    create: { date, productId, produced },
  });

  return NextResponse.json(stock);
}
