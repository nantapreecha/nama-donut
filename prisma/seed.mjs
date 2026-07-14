import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Users
  const adminPassword = await bcrypt.hash("admin1234", 10);
  const staffPassword = await bcrypt.hash("staff1234", 10);

  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: { username: "admin", password: adminPassword, name: "Admin", role: "ADMIN" },
  });

  await prisma.user.upsert({
    where: { username: "staff" },
    update: {},
    create: { username: "staff", password: staffPassword, name: "Staff", role: "STAFF" },
  });

  // Products
  const products = ["ช็อกโกแลต", "สตรอเบอร์รี่", "ออริจินอล", "มัทฉะ", "ครีมสด"];
  for (const name of products) {
    await prisma.product.upsert({
      where: { id: name },
      update: {},
      create: { id: name, name },
    });
  }

  // Time slots — seed เฉพาะตอนตารางว่างเท่านั้น (ไม่งั้นรอบที่แอดมินลบถาวรจะเด้งกลับมาทุก deploy)
  const slotCount = await prisma.timeSlot.count();
  if (slotCount === 0) {
    const defaultSlots = [
      { label: "รอบ 1", startTime: "09:30", endTime: "", maxOrders: 30 },
      { label: "รอบ 2", startTime: "11:30", endTime: "", maxOrders: 30 },
      { label: "รอบ 3", startTime: "13:30", endTime: "", maxOrders: 30 },
    ];
    for (const slot of defaultSlots) {
      await prisma.timeSlot.create({ data: slot });
    }
  }

  console.log("Seed completed");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
