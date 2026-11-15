import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    // Unit tests live next to the code; database integration tests live in tests/
    // (they skip themselves unless TEST_DATABASE_URL is set).
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**", ".claude/**"],
    environment: "node",
  },
});
