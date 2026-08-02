import { defineConfig } from "vitest/config";
import path from "node:path";

// Unit tests only: pure logic, no database and no credentials, so they run
// anywhere including CI. Data integrity is checked separately by
// fn_verificar_integridade (migration 0029/0030), which needs a real
// database and is meant to run after each import.
export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "components/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname) },
  },
});
