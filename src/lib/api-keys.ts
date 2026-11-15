import { createHash, randomBytes } from "node:crypto";

// API keys for CIC's dashboard. The plain key is shown once; the database keeps only its hash.
// Keys are long random strings (190+ bits), so a plain SHA-256 is enough: there is nothing to guess.

const BASE62 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
export const API_KEY_PATTERN = /^cic_[0-9A-Za-z]{32}$/;

/** "cic_" + 32 random base62 characters. */
export function generateApiKey(): string {
  let out = "";
  while (out.length < 32) {
    for (const byte of randomBytes(48)) {
      if (byte < 248 && out.length < 32) out += BASE62[byte % 62]; // 248 = 62 * 4: no modulo bias
    }
  }
  return `cic_${out}`;
}

/** Hex SHA-256 of the key: what we store and look up. */
export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}
