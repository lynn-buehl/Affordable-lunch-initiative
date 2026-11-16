import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  reporter: "list",
  // The dev server compiles each page on first visit, which can take longer
  // than the 5s default right after a code change.
  expect: { timeout: 15_000 },
  // The ALI workflow test walks through many pages; on a dev server that
  // compiles each one on demand it runs close to the 30s default.
  timeout: 90_000,
  use: {
    baseURL: process.env.APP_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
  },
});
