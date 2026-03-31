import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import { isDirectRun, resolveCorsOriginOptions } from "../src/server.js";

function invokeOriginCheck(originResolver, origin) {
  return new Promise((resolve, reject) => {
    originResolver(origin, (error, allowed) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(allowed);
    });
  });
}

test("resolveCorsOriginOptions allows configured loopback origin aliases", async () => {
  const originResolver = resolveCorsOriginOptions("http://127.0.0.1:5500");

  await assert.doesNotReject(() => invokeOriginCheck(originResolver, "http://127.0.0.1:5500"));
  await assert.doesNotReject(() => invokeOriginCheck(originResolver, "http://localhost:5500"));
});

test("resolveCorsOriginOptions supports comma-separated origins and rejects unknown origins", async () => {
  const originResolver = resolveCorsOriginOptions("https://www.toji.studio, http://localhost:5500");

  await assert.doesNotReject(() => invokeOriginCheck(originResolver, "https://www.toji.studio"));
  await assert.doesNotReject(() => invokeOriginCheck(originResolver, "http://127.0.0.1:5500"));
  await assert.rejects(
    () => invokeOriginCheck(originResolver, "https://evil.example"),
    /Not allowed by CORS/
  );
});

test("resolveCorsOriginOptions returns open CORS mode when no origin is configured", () => {
  assert.equal(resolveCorsOriginOptions(""), true);
});

test("isDirectRun recognizes Windows-style direct execution paths", () => {
  const entry = path.resolve("E:/Sync/Companies/Toji Studios/Website/V1/public/server/src/server.js");
  assert.equal(
    isDirectRun({
      argv: ["node", entry],
      metaUrl: "file:///E:/Sync/Companies/Toji%20Studios/Website/V1/public/server/src/server.js"
    }),
    true
  );
});

test("isDirectRun returns false for imported modules", () => {
  const entry = path.resolve("E:/Sync/Companies/Toji Studios/Website/V1/public/server/src/other.js");
  assert.equal(
    isDirectRun({
      argv: ["node", entry],
      metaUrl: "file:///E:/Sync/Companies/Toji%20Studios/Website/V1/public/server/src/server.js"
    }),
    false
  );
});
