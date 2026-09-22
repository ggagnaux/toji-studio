import test from "node:test";
import { prepareUploadMetadata, createBatchForm, uploadInBatches } from "../../admin/js/upload-batches.js";
import assert from "node:assert/strict";

import {
  initUploadFilterControllers,
  parseUploadTags,
  requireUploadAdminSession,
  syncUploadStatusPills,
  syncUploadTagFilterPills,
  toggleUploadTagFilter
} from "../../admin/js/upload-controller.js";

function createButton(attrs = {}) {
  const listeners = new Map();
  const classes = new Set();
  const state = { ...attrs };
  return {
    disabled: false,
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    removeEventListener(type) {
      listeners.delete(type);
    },
    click() {
      return listeners.get("click")?.();
    },
    getAttribute(name) {
      return state[name] || "";
    },
    setAttribute(name, value) {
      state[name] = String(value);
    },
    classList: {
      toggle(name, active) {
        if (active) classes.add(name);
        else classes.delete(name);
      },
      has(name) {
        return classes.has(name);
      }
    }
  };
}

const uploadFile = (name, text = "image") => Object.assign(new Blob([text]), { name });
const batchSuccess = batch => ({ created: batch.map(file => ({ id: file.name })), skipped: [], failed: [], warnings: [], metadataApplied: 0 });

test("upload batches preserve matching JSON, including year tags, across more than 30 files", async () => {
  const files = Array.from({ length: 35 }, (_, i) => uploadFile(`image${i}.png`));
  const json = files.map(file => ({ imageFilename: file.name, hierarchicalSubjects: ["year|2024"], description: "Keep me" }));
  const { records, warnings } = await prepareUploadMetadata(files, [uploadFile("bundle.json", JSON.stringify(json))]);
  assert.deepEqual(warnings, []);
  const sizes = [];
  await uploadInBatches({ files, send: async batch => {
    sizes.push(batch.length);
    const form = createBatchForm(batch, records, "draft");
    assert.equal(form.getAll("files").length, batch.length);
    const metadata = await Promise.all(form.getAll("metadata").map(async file => JSON.parse(await file.text())));
    assert.deepEqual(metadata.map(record => record.imageFilename), batch.map(file => file.name));
    assert.ok(metadata.every(record => record.hierarchicalSubjects[0] === "year|2024" && record.description === "Keep me"));
    return batchSuccess(batch);
  } });
  assert.deepEqual(sizes, [10, 10, 10, 5]);
  await assert.rejects(prepareUploadMetadata(files, [uploadFile("bad.json", "{")]), /Invalid JSON/);
  await assert.rejects(prepareUploadMetadata(files, [uploadFile("duplicate.json", JSON.stringify([json[0], json[0]]))]), /Multiple metadata/);
});

test("uploads halve failed batches without resending completed batches", async () => {
  const files = Array.from({ length: 8 }, (_, i) => uploadFile(`${i}.png`));
  const calls = [], completed = [];
  let failed = false;
  const result = await uploadInBatches({ files, batchSize: 4, sleep: async () => {}, onBatch: (_, batch) => completed.push(...batch), send: async batch => {
    calls.push(batch.map(file => file.name));
    if (batch[0] === files[4] && !failed) { failed = true; throw Object.assign(new Error("Too large"), { status: 413 }); }
    return batchSuccess(batch);
  } });
  assert.deepEqual(calls.map(batch => batch.length), [4, 4, 2, 2]);
  assert.deepEqual(completed, files);
  assert.equal(result.created.length, 8);
});

test("timeouts, file-count errors and incomplete responses retry smaller batches", async () => {
  const files = [uploadFile("a.png"), uploadFile("b.png")];
  for (const error of [
    { status: 408 }, { status: 502 }, { status: 400, code: "LIMIT_UNEXPECTED_FILE" }, null
  ]) {
    const sizes = [];
    const result = await uploadInBatches({ files, sleep: async () => {}, send: async batch => {
      sizes.push(batch.length);
      if (sizes.length === 1) {
        if (error) throw Object.assign(new Error("Retryable error"), error);
        return { created: [], skipped: [], failed: [] };
      }
      return batchSuccess(batch);
    } });
    assert.deepEqual(sizes, [2, 1, 1]);
    assert.equal(result.created.length, 2);
  }
});

test("network retries are bounded and preserve completed results for resume", async () => {
  const files = Array.from({ length: 6 }, (_, i) => uploadFile(`${i}.png`));
  let attempts = 0;
  const result = await uploadInBatches({ files, batchSize: 2, sleep: async () => {}, send: async batch => {
    attempts++;
    if (batch[0] === files[0]) return batchSuccess(batch);
    throw Object.assign(new Error("Network error"), { status: 0 });
  } });
  assert.equal(result.created.length, 2);
  assert.deepEqual(result.remaining, files.slice(2));
  assert.ok(attempts <= 7);
  assert.match(result.warnings[0], /Press Upload/);
});

test("authentication errors stop immediately and oversized files are isolated", async () => {
  const files = [uploadFile("big.png"), uploadFile("small.png")];
  let attempts = 0;
  const denied = await uploadInBatches({ files, send: async () => { attempts++; throw Object.assign(new Error("Sign in"), { status: 401 }); } });
  assert.equal(attempts, 1);
  assert.deepEqual(denied.remaining, files);
  const result = await uploadInBatches({ files, sleep: async () => {}, send: async batch => {
    if (batch.includes(files[0])) throw Object.assign(new Error("File exceeds 50 MB"), { status: 413, code: "LIMIT_FILE_SIZE" });
    return batchSuccess(batch);
  } });
  assert.equal(result.failed[0].filename, "big.png");
  assert.equal(result.created[0].id, "small.png");
});

test("lost responses retry smaller batches and reconcile server duplicates", async () => {
  const files = [uploadFile("a.png"), uploadFile("b.png")];
  const server = new Set();
  let loseResponse = true;
  const result = await uploadInBatches({ files, sleep: async () => {}, send: async batch => {
    const out = { created: [], skipped: [], failed: [], warnings: [] };
    for (const file of batch) {
      if (server.has(file.name)) out.skipped.push({ filename: file.name, existingId: file.name });
      else { server.add(file.name); out.created.push({ id: file.name }); }
    }
    if (loseResponse) { loseResponse = false; throw Object.assign(new Error("Response lost"), { status: 0 }); }
    return out;
  } });
  assert.equal(server.size, 2);
  assert.equal(result.skipped.length, 2);
  assert.deepEqual(result.remaining, []);
});

test("parseUploadTags normalizes and deduplicates tag input", () => {
  assert.deepEqual(parseUploadTags(" Portrait, concept art ; #Portrait "), ["portrait", "concept art"]);
  assert.deepEqual(parseUploadTags(["Sky", " sky ", "LIGHT"]), ["sky", "light"]);
});

test("requireUploadAdminSession redirects unauthenticated users to login", () => {
  const windowRef = { location: { pathname: "/admin/upload.html", search: "?q=1", hash: "#top", href: "" } };
  assert.throws(() => requireUploadAdminSession({ getAdminToken: () => "", windowRef }), /Please sign in/);
  assert.equal(windowRef.location.href, "login.html?next=%2Fadmin%2Fupload.html%3Fq%3D1%23top");
  assert.equal(requireUploadAdminSession({ getAdminToken: () => "token", windowRef }), true);
});

test("upload filter helpers sync pill state and toggle filters", () => {
  const statusSelect = { value: "published" };
  const draftBtn = createButton({ "data-status-pill": "draft" });
  const publishedBtn = createButton({ "data-status-pill": "published" });
  syncUploadStatusPills(statusSelect, [draftBtn, publishedBtn]);
  assert.equal(draftBtn.classList.has("active"), false);
  assert.equal(publishedBtn.classList.has("active"), true);

  const selected = new Set(["a"]);
  const aBtn = createButton({ "data-tag-filter": "a" });
  const zBtn = createButton({ "data-tag-filter": "z" });
  syncUploadTagFilterPills([aBtn, zBtn], selected);
  assert.equal(aBtn.classList.has("is-active"), true);
  assert.equal(zBtn.classList.has("is-active"), false);
  assert.equal(toggleUploadTagFilter(selected, "a"), false);
  assert.equal(toggleUploadTagFilter(selected, "z"), true);
  assert.deepEqual(Array.from(selected).sort(), ["z"]);
});

test("initUploadFilterControllers wires status and tag pill clicks", () => {
  const statusSelect = { value: "draft" };
  const draftBtn = createButton({ "data-status-pill": "draft" });
  const publishedBtn = createButton({ "data-status-pill": "published" });
  const aBtn = createButton({ "data-tag-filter": "a" });
  const bBtn = createButton({ "data-tag-filter": "b" });
  const selectedTagFilters = new Set();
  let statusChanged = "";
  let tagCalls = 0;

  const controller = initUploadFilterControllers({
    statusSelect,
    statusPills: [draftBtn, publishedBtn],
    tagFilterPills: [aBtn, bBtn],
    selectedTagFilters,
    onStatusChange(value) {
      statusChanged = value;
    },
    onTagFilterChange() {
      tagCalls += 1;
    }
  });

  publishedBtn.click();
  assert.equal(statusSelect.value, "published");
  assert.equal(statusChanged, "published");
  assert.equal(publishedBtn.classList.has("active"), true);

  aBtn.click();
  assert.deepEqual(Array.from(selectedTagFilters), ["a"]);
  assert.equal(tagCalls, 1);
  assert.equal(aBtn.classList.has("is-active"), true);

  controller.dispose();
  bBtn.click();
  assert.deepEqual(Array.from(selectedTagFilters), ["a"]);
});
