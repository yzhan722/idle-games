import { defineConfig, devices } from "@playwright/test";
import path from "path";

const e2eStore = path.resolve(__dirname, "e2e/.tmp-store.json");
const jwt = "e2e_jwt_secret_key_minimum_32_chars!!";

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "off",
  },
  webServer: [
    {
      command: "npx tsx src/index.ts",
      cwd: path.resolve(__dirname, "backend"),
      url: "http://127.0.0.1:3101/health",
      reuseExistingServer: false,
      timeout: 90_000,
      env: {
        ...process.env,
        PORT: "3101",
        DATABASE_URL: "",
        E2E_SEED: "1",
        MEMORY_STORE_PATH: e2eStore,
        JWT_SECRET: jwt,
        NODE_ENV: "development",
        RATE_LIMIT_MAX: "10000",
      },
    },
    {
      command: "npx vite --port 3100 --strictPort --host 127.0.0.1",
      cwd: path.resolve(__dirname, "frontend"),
      url: "http://127.0.0.1:3100",
      reuseExistingServer: false,
      timeout: 90_000,
      env: {
        ...process.env,
        VITE_API_URL: "http://127.0.0.1:3101",
      },
    },
  ],
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
