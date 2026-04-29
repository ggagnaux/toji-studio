import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createApp } from "../src/server.js";
import { restoreEnv, startTestServer } from "./helpers.js";

async function withTempSite(fn) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "toji-site-routes-"));
  try {
    await fs.mkdir(path.join(dir, "admin"), { recursive: true });
    await fs.writeFile(path.join(dir, "index.html"), "<!doctype html><title>Site</title>", "utf8");
    await fs.writeFile(path.join(dir, "admin", "index.html"), "<!doctype html><title>Admin</title>", "utf8");
    process.env.TOJI_SITE_DIR = dir;
    await fn(dir);
  } finally {
    restoreEnv();
    await fs.rm(dir, { recursive: true, force: true });
  }
}

test("GET /admin redirects to /admin/ once", async () => {
  await withTempSite(async () => {
    const server = await startTestServer(createApp);
    try {
      const res = await fetch(`${server.baseUrl}/admin`, { redirect: "manual" });

      assert.equal(res.status, 301);
      assert.equal(res.headers.get("location"), "/admin/");
    } finally {
      await server.close();
    }
  });
});

test("GET /admin/ serves the admin index without redirecting", async () => {
  await withTempSite(async () => {
    const server = await startTestServer(createApp);
    try {
      const res = await fetch(`${server.baseUrl}/admin/`, { redirect: "manual" });
      const body = await res.text();

      assert.equal(res.status, 200);
      assert.match(body, /<title>Admin<\/title>/);
    } finally {
      await server.close();
    }
  });
});
