import "server-only";
import { z } from "zod";
import type { Result } from "@/types/result";

export const idSchema = z.guid({ error: "That item could not be found. Refresh and try again." });
export const titleSchema = z.string().trim().min(1, "Enter a title.").max(200);
export const orderedIdsSchema = z.array(idSchema).refine((ids) => new Set(ids).size === ids.length, "Include each item only once.");

export function databaseError(error: { code?: string; message: string }): never {
  if (error.code === "P0001") throw new Error(error.message);
  if (error.code === "42501") throw new Error("You do not have permission to make that change.");
  if (error.code === "23505") throw new Error("That code or item is already taken. Please try again.");
  if (error.code === "23503") throw new Error("A related item could not be found. Refresh and try again.");
  throw new Error("We could not save or load that information. Please try again.");
}
export async function staffResult<T>(work: () => Promise<T>): Promise<Result<T>> {
  try { return { ok: true, data: await work() }; }
  catch (error) {
    return { ok: false, error: error instanceof z.ZodError
      ? (error.issues[0]?.message ?? "Check the information and try again.")
      : error instanceof Error ? error.message : "Something went wrong. Please try again." };
  }
}
