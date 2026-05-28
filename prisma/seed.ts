import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
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

  const products = ["ช็อกโกแลต", "สตรอเบอร์รี่", "ออริจินอล", "มัทฉะ", "ครีมสด"];
  for (const name of products) {
    await prisma.product.upsert({
      where: { id: name },
      update: {},
      create: { id: name, name },
    });
  }

  const slots = [
    { label: "รอบเช้า", startTime: "09:00", endTime: "11:00", maxOrders: 20 },
    { label: "รอบบ่าย", startTime: "13:00", endTime: "15:00", maxOrders: 20 },
    { label: "รอบเย็น", startTime: "16:00", endTime: "18:00", maxOrders: 20 },
  ];
  for (const slot of slots) {
    await prisma.timeSlot.create({ data: slot }).catch(() => {});
  }

  console.log("Seed completed");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
