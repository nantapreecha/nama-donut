import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay, getTimeSlots } from "@/lib/dateUtils";

// GET /api/stock?date=2024-01-01
// Returns all StockBatch for the date with available qty
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get("date");
  const date = dateParam ? startOfDay(new Date(dateParam)) : startOfDay(new Date());

  const batches = await prisma.stockBatch.findMany({
    where: { stockDate: date },
    orderBy: [{ orderType: "asc" }, { roundTime: "asc" }, { doughType: "asc" }],
  });

  const result = batches.map((b) => ({
    id: b.id,
    stockDate: b.stockDate,
    orderType: b.orderType,
    roundTime: b.roundTime,
    doughType: b.doughType,
    qty: b.qty,
    sold: b.sold,
    available: Math.max(0, b.qty - b.sold),
  }));

  return NextResponse.json(result);
}

// POST /api/stock — upsert StockBatch
export async function POST(req: Request) {
  const { stockDate: dateParam, orderType, roundTime, doughType, qty } = await req.json();
  const stockDate = dateParam ? startOfDay(new Date(dateParam)) : startOfDay(new Date());

  const batch = await prisma.stockBatch.upsert({
    where: { stockDate_orderType_roundTime_doughType: { stockDate, orderType, roundTime, doughType } },
    update: { qty },
    create: { stockDate, orderType, roundTime, doughType, qty },
  });

  return NextResponse.json(batch);
}
