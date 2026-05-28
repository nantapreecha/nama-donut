import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get("phone");
  if (phone) {
    const customer = await prisma.customer.findUnique({ where: { phone } });
    return NextResponse.json(customer);
  }
  const customers = await prisma.customer.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(customers);
}

export async function POST(req: Request) {
  const { name, phone } = await req.json();
  const customer = await prisma.customer.upsert({
    where: { phone },
    update: { name },
    create: { name, phone },
  });
  return NextResponse.json(customer);
}
