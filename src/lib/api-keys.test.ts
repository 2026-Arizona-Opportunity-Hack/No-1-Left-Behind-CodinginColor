import { describe, expect, it } from "vitest";
import { API_KEY_PATTERN, generateApiKey, hashApiKey } from "./api-keys";

describe("api keys", () => {
  it("generates cic_ + 32 base62 characters", () => {
    expect(generateApiKey()).toMatch(API_KEY_PATTERN);
  });
  it("generates different keys each time", () => {
    expect(new Set(Array.from({ length: 50 }, generateApiKey)).size).toBe(50);
  });
  it("hashes to a stable 64-character hex string", () => {
    expect(hashApiKey("cic_abc")).toBe(hashApiKey("cic_abc"));
    expect(hashApiKey("cic_abc")).toMatch(/^[0-9a-f]{64}$/);
    expect(hashApiKey("cic_abc")).not.toBe(hashApiKey("cic_abd"));
  });
  it("matches a known SHA-256 value", () => {
    expect(hashApiKey("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});
