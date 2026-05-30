import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay } from "@/lib/dateUtils";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { status } = await req.json();

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const pickup = order.pickupDate ?? startOfDay(new Date());

  const updated = await prisma.$transaction(async (tx) => {
    const updatedOrder = await tx.order.update({
      where: { id },
      data: { status },
      include: { customer: true },
    });

    // คืน stock เมื่อยกเลิก
    if (status === "CANCELLED" && order.status !== "CANCELLED" && order.roundTime) {
      if (order.pumpkinQty > 0) {
        await tx.stockBatch.updateMany({
          where: { stockDate: pickup, orderType: order.orderType, roundTime: order.roundTime, doughType: "PUMPKIN" },
          data: { sold: { decrement: order.pumpkinQty } },
        });
      }
      if (order.mochiQty > 0) {
        await tx.stockBatch.updateMany({
          where: { stockDate: pickup, orderType: order.orderType, roundTime: order.roundTime, doughType: "MOCHI" },
          data: { sold: { decrement: order.mochiQty } },
        });
      }
    }

    return updatedOrder;
  });

  return NextResponse.json(updated);
}
