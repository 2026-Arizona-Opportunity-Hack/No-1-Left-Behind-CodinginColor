"use server";
import { revalidatePath } from "next/cache";
import {
  assignStaffRole,
  deleteStaffRole,
  saveStaffRole,
} from "@/server/staff-roles";
import type { Permission } from "@/lib/permissions";
import type { Result } from "@/types/result";
async function run(work: () => Promise<Result<null>>) {
  const result = await work();
  if (result.ok) revalidatePath("/", "layout");
  return result;
}
export async function saveRole(input: {
  id: string;
  name: string;
  permissions: Permission[];
}) {
  return run(() => saveStaffRole(input));
}
export async function removeRole(id: string, replacement?: string) {
  return run(() => deleteStaffRole(id, replacement));
}
export async function changeStaffRole(id: string, role: string) {
  return run(() => assignStaffRole(id, role));
}
