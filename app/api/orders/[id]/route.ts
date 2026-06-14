import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay } from "@/lib/dateUtils";
import { auth } from "@/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id } = await params;
  const { status, isPaid } = await req.json();

  const updated = await prisma.$transaction(async (tx) => {
    // อ่าน order ภายใน transaction เพื่อกันคืนสต๊อกซ้ำจาก request พร้อมกัน
    const order = await tx.order.findUnique({ where: { id } });
    if (!order) return null;

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (isPaid !== undefined) updateData.isPaid = isPaid;

    // ยกเลิก: เฉพาะตอนเปลี่ยนจากสถานะอื่น → CANCELLED เท่านั้น (ยกเลิกแล้วยกเลิกซ้ำไม่คืนอีก)
    const isCancelling = status === "CANCELLED" && order.status !== "CANCELLED";
    if (isCancelling) {
      updateData.cancelledAt = new Date();
      updateData.cancelledBy = session?.user?.name ?? null;

      // คืน stock กลับเข้ารอบเวลาเดิมของออเดอร์นั้น
      const pickup = order.pickupDate ?? startOfDay(new Date());
      if (order.roundTime) {
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
    }

    return tx.order.update({
      where: { id },
      data: updateData,
      include: { customer: true },
    });
  });

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}
