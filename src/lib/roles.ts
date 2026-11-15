/** Only allow redirects to our own pages after sign-in (blocks "//evil.com"). */
export function safeNextPath(value: unknown): string | null {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : null;
}
