import "dotenv/config";
import { defineConfig } from "@playwright/test";

const PORT = Number(process.env.PLAYWRIGHT_PORT || 4187);
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  webServer: {
    command: "node src/server.js",
    cwd: ".",
    url: `${baseURL}/api/health`,
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      PORT: String(PORT),
      TOJI_SITE_DIR: "..",
      CORS_ORIGIN: baseURL
    }
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium"
      }
    }
  ]
});
