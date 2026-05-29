"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function logout() {
  const cookieStore = await cookies();
  const all = cookieStore.getAll();
  for (const c of all) {
    cookieStore.delete(c.name);
  }
  redirect("/login");
}
