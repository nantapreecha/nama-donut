import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay } from "@/lib/dateUtils";

// Walk-in sale: deduct from stock directly
export async function POST(req: Request) {
  const { items } = await req.json();
  const today = startOfDay(new Date());

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

  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      await tx.dailyStock.upsert({
        where: { date_productId: { date: today, productId: item.productId } },
        update: { walkIn: { increment: item.quantity } },
        create: { date: today, productId: item.productId, walkIn: item.quantity },
      });
    }
  });

  return NextResponse.json({ ok: true });
}
