import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay } from "@/lib/dateUtils";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get("date");
  const status = searchParams.get("status");
  const date = dateParam ? startOfDay(new Date(dateParam)) : startOfDay(new Date());
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);

  const where: any = { pickupDate: { gte: date, lt: nextDay } };
  if (status) where.status = status;

  const orders = await prisma.order.findMany({
    where,
    include: { customer: true },
    orderBy: [{ roundTime: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(orders);
}

export async function POST(req: Request) {
  const { customerId, pickupDate, channel, orderType, roundTime, pumpkinQty, mochiQty, note } = await req.json();

  const pickup = pickupDate ? startOfDay(new Date(pickupDate)) : startOfDay(new Date());

  if (!roundTime) return NextResponse.json({ error: "กรุณาเลือกรอบเวลา" }, { status: 400 });
  if ((pumpkinQty ?? 0) + (mochiQty ?? 0) === 0) return NextResponse.json({ error: "กรุณาระบุจำนวนอย่างน้อย 1 ชิ้น" }, { status: 400 });

  // Check stock for pumpkin
  if (pumpkinQty > 0) {
    const batch = await prisma.stockBatch.findUnique({
      where: { stockDate_orderType_roundTime_doughType: { stockDate: pickup, orderType, roundTime, doughType: "PUMPKIN" } },
    });
    const available = Math.max(0, (batch?.qty ?? 0) - (batch?.sold ?? 0));
    if (available < pumpkinQty) {
      return NextResponse.json({ error: `แป้งฟักทองรอบ ${roundTime} เหลือแค่ ${available} ชิ้น` }, { status: 400 });
    }
  }

  // Check stock for mochi
  if (mochiQty > 0) {
    const batch = await prisma.stockBatch.findUnique({
      where: { stockDate_orderType_roundTime_doughType: { stockDate: pickup, orderType, roundTime, doughType: "MOCHI" } },
    });
    const available = Math.max(0, (batch?.qty ?? 0) - (batch?.sold ?? 0));
    if (available < mochiQty) {
      return NextResponse.json({ error: `แป้งโมจิรอบ ${roundTime} เหลือแค่ ${available} ชิ้น` }, { status: 400 });
    }
  }

  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        customerId,
        pickupDate: pickup,
        channel,
        orderType: orderType ?? "WALKIN",
        roundTime,
        pumpkinQty: pumpkinQty ?? 0,
        mochiQty: mochiQty ?? 0,
        note,
      },
      include: { customer: true },
    });

    // Deduct stock from StockBatch
    if (pumpkinQty > 0) {
      await tx.stockBatch.upsert({
        where: { stockDate_orderType_roundTime_doughType: { stockDate: pickup, orderType, roundTime, doughType: "PUMPKIN" } },
        update: { sold: { increment: pumpkinQty } },
        create: { stockDate: pickup, orderType, roundTime, doughType: "PUMPKIN", qty: 0, sold: pumpkinQty },
      });
    }
    if (mochiQty > 0) {
      await tx.stockBatch.upsert({
        where: { stockDate_orderType_roundTime_doughType: { stockDate: pickup, orderType, roundTime, doughType: "MOCHI" } },
        update: { sold: { increment: mochiQty } },
        create: { stockDate: pickup, orderType, roundTime, doughType: "MOCHI", qty: 0, sold: mochiQty },
      });
    }

    return newOrder;
  });

  return NextResponse.json(order);
}
