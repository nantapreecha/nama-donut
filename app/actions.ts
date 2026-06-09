"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function logout() {
  const cookieStore = await cookies();
  for (const c of cookieStore.getAll()) {
    cookieStore.delete(c.name);
  }
  redirect("/login");
}
