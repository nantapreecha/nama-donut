import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay } from "@/lib/dateUtils";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get("date");
  const date = dateParam ? startOfDay(new Date(dateParam)) : startOfDay(new Date());

  const batches = await prisma.stockBatch.findMany({
    where: { stockDate: date },
    include: {
      history: { orderBy: { createdAt: "desc" }, take: 20 },
    },
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
    history: b.history,
  }));

  return NextResponse.json(result);
}

// POST — set initial stock หรือ add (เติม) ขึ้นอยู่กับ mode
export async function POST(req: Request) {
  const { stockDate: dateParam, orderType, roundTime, doughType, amount, mode, note, createdBy } = await req.json();
  const stockDate = dateParam ? startOfDay(new Date(dateParam)) : startOfDay(new Date());

  // mode "set" = ตั้งค่าเริ่มต้น (replace), mode "add" = เติมเพิ่ม
  const isAdd = mode === "add";

  const existing = await prisma.stockBatch.findUnique({
    where: { stockDate_orderType_roundTime_doughType: { stockDate, orderType, roundTime, doughType } },
  });

  const newQty = isAdd ? (existing?.qty ?? 0) + amount : amount;

  const batch = await prisma.stockBatch.upsert({
    where: { stockDate_orderType_roundTime_doughType: { stockDate, orderType, roundTime, doughType } },
    update: { qty: newQty },
    create: { stockDate, orderType, roundTime, doughType, qty: newQty },
    include: { history: { orderBy: { createdAt: "desc" }, take: 20 } },
  });

  // บันทึก history เสมอ
  await prisma.stockHistory.create({
    data: {
      stockBatchId: batch.id,
      amount: isAdd ? amount : amount - (existing?.qty ?? 0),
      note: note ?? (isAdd ? `เติม ${amount} ชิ้น` : `ตั้งต้น ${amount} ชิ้น`),
      createdBy: createdBy ?? null,
    },
  });

  return NextResponse.json({ ...batch, available: Math.max(0, batch.qty - batch.sold) });
}
