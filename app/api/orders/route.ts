import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay } from "@/lib/dateUtils";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get("date");
  const status = searchParams.get("status");
  const date = dateParam ? new Date(dateParam) : startOfDay(new Date());
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);

  const where: any = {
    pickupDate: { gte: date, lt: nextDay },
  };
  if (status) where.status = status;

  const orders = await prisma.order.findMany({
    where,
    include: {
      customer: true,
      timeSlot: true,
      items: { include: { product: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(orders);
}

export async function POST(req: Request) {
  const { customerId, timeSlotId, pickupDate, channel, note, items } = await req.json();

  const today = startOfDay(new Date());
  const pickup = pickupDate ? new Date(pickupDate) : today;

  // Check stock for each item
  for (const item of items) {
    const stock = await prisma.dailyStock.findUnique({
      where: { date_productId: { date: today, productId: item.productId } },
    });
    const produced = stock?.produced ?? 0;
    const reserved = stock?.reserved ?? 0;
    const walkIn = stock?.walkIn ?? 0;
    const available = produced - reserved - walkIn;
    if (available < item.quantity) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      return NextResponse.json(
        { error: `${product?.name ?? item.productId} เหลือแค่ ${Math.max(0, available)} ชิ้น` },
        { status: 400 }
      );
    }
  }

  // Check timeslot capacity
  if (timeSlotId) {
    const slot = await prisma.timeSlot.findUnique({ where: { id: timeSlotId } });
    if (slot && slot.maxOrders > 0) {
      const count = await prisma.order.count({
        where: { timeSlotId, pickupDate: pickup, status: { not: "CANCELLED" } },
      });
      if (count >= slot.maxOrders) {
        return NextResponse.json({ error: "รอบนี้เต็มแล้ว" }, { status: 400 });
      }
    }
  }

  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        customerId,
        timeSlotId,
        pickupDate: pickup,
        channel,
        note,
        items: { create: items.map((i: any) => ({ productId: i.productId, quantity: i.quantity })) },
      },
      include: { customer: true, timeSlot: true, items: { include: { product: true } } },
    });

    // Reserve stock
    for (const item of items) {
      await tx.dailyStock.upsert({
        where: { date_productId: { date: today, productId: item.productId } },
        update: { reserved: { increment: item.quantity } },
        create: { date: today, productId: item.productId, reserved: item.quantity },
      });
    }

    return newOrder;
  });

  return NextResponse.json(order);
}
