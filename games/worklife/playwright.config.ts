import { defineConfig, devices } from "@playwright/test";
import path from "path";

const e2eStore = path.resolve(__dirname, "e2e/.tmp-store.json");
const jwt = "e2e_jwt_secret_key_minimum_32_chars!!";

/**
 * Ports live in the 43xxx range on purpose: Windows hands out 3100-ish numbers as ephemeral ports
 * to unrelated outbound sockets (proxies, updaters), which made `--strictPort 3100` fail at random.
 * Override with E2E_WEB_PORT / E2E_API_PORT when two checkouts run side by side.
 */
export const E2E_WEB_PORT = Number(process.env.E2E_WEB_PORT || 43100);
export const E2E_API_PORT = Number(process.env.E2E_API_PORT || 43101);

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  testIgnore: [
    ...(process.env.VS_CAPTURE ? [] : ["**/vertical-slice-baseline.spec.ts", "**/captures/**"]),
    ...(process.env.ART_CAPTURE === "1" ? [] : ["**/art-qa.spec.ts"]),
  ],
  use: {
    baseURL: `http://127.0.0.1:${E2E_WEB_PORT}`,
    trace: "off",
  },
  webServer: [
    {
      command: "npx tsx src/index.ts",
      cwd: path.resolve(__dirname, "backend"),
      url: `http://127.0.0.1:${E2E_API_PORT}/health`,
      reuseExistingServer: false,
      timeout: 90_000,
      env: {
        ...process.env,
        PORT: String(E2E_API_PORT),
        DATABASE_URL: "",
        E2E_SEED: "1",
        E2E_FAST: "1",
        MEMORY_STORE_PATH: e2eStore,
        JWT_SECRET: jwt,
        NODE_ENV: "development",
        RATE_LIMIT_MAX: "10000",
        // Specs reach the API directly for seeding / raw state reads.
        E2E_API_PORT: String(E2E_API_PORT),
      },
    },
    {
      command: `npx vite --port ${E2E_WEB_PORT} --strictPort --host 127.0.0.1`,
      cwd: path.resolve(__dirname, "frontend"),
      url: `http://127.0.0.1:${E2E_WEB_PORT}`,
      reuseExistingServer: false,
      timeout: 90_000,
      env: {
        ...process.env,
        VITE_API_URL: `http://127.0.0.1:${E2E_API_PORT}`,
      },
    },
  ],
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
