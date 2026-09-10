import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest(async () => ({
      main: "./src/repository.ts",
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        d1Databases: ["DB"],
        bindings: {
          TEST_MIGRATIONS: await readD1Migrations(
            path.join(import.meta.dirname, "migrations"),
          ),
        },
      },
    })),
  ],
  test: {
    setupFiles: ["./test/apply-migrations.ts"],
  },
});
