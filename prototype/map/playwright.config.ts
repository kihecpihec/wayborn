import { execFileSync } from "node:child_process";
import { defineConfig } from "@playwright/test";
const local = JSON.parse(
  execFileSync("npx", ["--yes", "supabase@2.122.1", "status", "-o", "json"], {
    cwd: __dirname + "/../..",
    encoding: "utf8",
  }),
);
process.env.EXPO_PUBLIC_SUPABASE_URL = local.API_URL;
process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = local.PUBLISHABLE_KEY;
export default defineConfig({
  testDir: "./ui",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:8093",
    viewport: { width: 390, height: 844 },
  },
  webServer: {
    command: "npx expo start --web --port 8093",
    url: "http://127.0.0.1:8093",
    timeout: 120000,
    reuseExistingServer: false,
  },
});
