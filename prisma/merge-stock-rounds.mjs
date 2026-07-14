// Migration: รวม StockBatch ที่ซ้ำกันบน (stockDate, roundTime, doughType) ให้เหลือแถวเดียว
// ต้องรันก่อน `prisma db push` เพราะ unique ใหม่จะสร้างไม่ได้ถ้ามีแถวซ้ำ
// ใช้ raw SQL ล้วน — ทำงานได้ทั้ง schema เก่า/ใหม่ และ idempotent โดยธรรมชาติ
// (รันซ้ำ = ไม่มีแถวซ้ำแล้ว = no-op) ไม่เช็คคอลัมน์ orderType เพราะ migration อาจค้างครึ่งทาง
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const dups = await prisma.$queryRawUnsafe(`
    SELECT "stockDate", "roundTime", "doughType", COUNT(*)::int AS n
    FROM "StockBatch"
    GROUP BY "stockDate", "roundTime", "doughType"
    HAVING COUNT(*) > 1
  `);
  if (!Array.isArray(dups) || dups.length === 0) {
    console.log("merge-stock-rounds: no duplicate batches — nothing to do");
  } else {
    console.log(`merge-stock-rounds: found ${dups.length} duplicated group(s), merging...`);
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
