import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay } from "@/lib/dateUtils";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { status } = await req.json();

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const today = startOfDay(new Date());

  const updated = await prisma.$transaction(async (tx) => {
    const updatedOrder = await tx.order.update({
      where: { id },
      data: { status },
      include: { customer: true, timeSlot: true, items: { include: { product: true } } },
    });

    if (status === "CANCELLED" && order.status !== "CANCELLED") {
      for (const item of order.items) {
        await tx.dailyStock.updateMany({
          where: { date: today, productId: item.productId },
          data: { reserved: { decrement: item.quantity } },
        });
      }
    }

    if (status === "COMPLETED" && order.status !== "COMPLETED") {
      for (const item of order.items) {
        await tx.dailyStock.updateMany({
          where: { date: today, productId: item.productId },
          data: {
            reserved: { decrement: item.quantity },
            walkIn: { increment: item.quantity },
          },
        });
      }
    }

    return updatedOrder;
  });

  return NextResponse.json(updated);
}
