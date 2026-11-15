import { describe, expect, it } from "vitest";
import { reorderTo } from "./reorder";

describe("reorderTo", () => {
  const ids = ["a", "b", "c", "d"];
  it("moves an item down to the target's place", () => expect(reorderTo(ids, "a", "c")).toEqual(["b", "c", "a", "d"]));
  it("moves an item up to the target's place", () => expect(reorderTo(ids, "d", "b")).toEqual(["a", "d", "b", "c"]));
  it("swaps neighbours", () => expect(reorderTo(ids, "b", "c")).toEqual(["a", "c", "b", "d"]));
  it("changes nothing when dropped on itself or on an unknown id", () => {
    expect(reorderTo(ids, "b", "b")).toBe(ids);
    expect(reorderTo(ids, "b", "zzz")).toBe(ids);
  });
  it("does not change the original list", () => {
    reorderTo(ids, "a", "d");
    expect(ids).toEqual(["a", "b", "c", "d"]);
  });
});
