"use server";

import { revalidatePath } from "next/cache";
import { getStaff } from "@/server/auth";
import { createApiKey, revokeApiKey } from "@/server/api-keys";

// The database only lets CIC admins touch api_keys; this check gives a clear message first.
async function adminOnly() {
  if ((await getStaff())?.role !== "admin") throw new Error("Only CIC staff can manage API keys.");
}

export async function createKeyAction(name: string) {
  await adminOnly();
  const r = await createApiKey(name);
  revalidatePath("/admin/api-keys");
  return r;
}

export async function revokeKeyAction(id: string) {
  await adminOnly();
  const r = await revokeApiKey(id);
  revalidatePath("/admin/api-keys");
  return r;
}
