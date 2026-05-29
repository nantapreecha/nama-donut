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

  // Time slots (หน้าร้าน)
  const walkInSlots = [
    { label: "รอบ 1", startTime: "09:30", endTime: "10:30", maxOrders: 30, orderType: "WALKIN" },
    { label: "รอบ 2", startTime: "11:30", endTime: "12:30", maxOrders: 30, orderType: "WALKIN" },
    { label: "รอบ 3", startTime: "13:30", endTime: "14:30", maxOrders: 30, orderType: "WALKIN" },
  ];

  // Time slots (จอง)
  const reserveSlots = [
    { label: "รอบ 1", startTime: "10:30", endTime: "11:30", maxOrders: 30, orderType: "RESERVE" },
    { label: "รอบ 2", startTime: "12:30", endTime: "13:30", maxOrders: 30, orderType: "RESERVE" },
    { label: "รอบ 3", startTime: "14:30", endTime: "15:30", maxOrders: 30, orderType: "RESERVE" },
  ];

  for (const slot of [...walkInSlots, ...reserveSlots]) {
    const existing = await prisma.timeSlot.findFirst({
      where: { startTime: slot.startTime, orderType: slot.orderType },
    });
    if (!existing) {
      await prisma.timeSlot.create({ data: slot });
    }
  }

  console.log("Seed completed");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
