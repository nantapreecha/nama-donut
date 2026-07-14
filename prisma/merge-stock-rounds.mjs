// One-time migration: รวม StockBatch ที่เคยแยกกอง (WALKIN/RESERVE) ให้เหลือกองเดียวต่อ (วัน, รอบ, แป้ง)
// ต้องรันก่อน `prisma db push` เพราะ unique ใหม่ (stockDate, roundTime, doughType) จะชนกับข้อมูลเก่า
// ใช้ raw SQL ล้วน — ทำงานได้ไม่ว่า Prisma client จะ generate จาก schema เก่าหรือใหม่ และ idempotent
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  // ถ้าคอลัมน์ orderType ไม่มีแล้ว = migrate ไปแล้ว (หรือ DB ใหม่) ข้ามได้เลย
  const col = await prisma.$queryRawUnsafe(
    `SELECT 1 FROM information_schema.columns WHERE table_name = 'StockBatch' AND column_name = 'orderType'`
  );
  if (!Array.isArray(col) || col.length === 0) {
    console.log("merge-stock-rounds: nothing to do (already migrated or fresh DB)");
  } else {
    // 1) ย้าย StockHistory ของแถวซ้ำ ไปชี้แถวหลัก (id ต่ำสุดของกลุ่ม)
    await prisma.$executeRawUnsafe(`
      UPDATE "StockHistory" h SET "stockBatchId" = k.keep
      FROM (
        SELECT id, MIN(id) OVER (PARTITION BY "stockDate", "roundTime", "doughType") AS keep
        FROM "StockBatch"
      ) k
      WHERE h."stockBatchId" = k.id AND k.id <> k.keep
    `);
    // 2) รวม qty/sold เข้าแถวหลัก
    await prisma.$executeRawUnsafe(`
      UPDATE "StockBatch" b SET qty = a.q, sold = a.s
      FROM (
        SELECT MIN(id) AS keep, SUM(qty) AS q, SUM(sold) AS s
        FROM "StockBatch"
        GROUP BY "stockDate", "roundTime", "doughType"
      ) a
      WHERE b.id = a.keep
    `);
    // 3) ลบแถวซ้ำที่เหลือ
    await prisma.$executeRawUnsafe(`
      DELETE FROM "StockBatch" b
      USING (
        SELECT id, MIN(id) OVER (PARTITION BY "stockDate", "roundTime", "doughType") AS keep
        FROM "StockBatch"
      ) k
      WHERE b.id = k.id AND k.id <> k.keep
    `);
    console.log("merge-stock-rounds: merged duplicate stock batches");
  }
} catch (e) {
  // DB ใหม่ที่ยังไม่มีตาราง ฯลฯ — ไม่ต้องล้ม ให้ db push จัดการต่อ
  console.log("merge-stock-rounds: skipped —", e.message);
} finally {
  await prisma.$disconnect();
}
