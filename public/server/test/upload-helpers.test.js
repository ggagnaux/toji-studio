import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import {
  cleanSeries,
  cleanStatus,
  cleanYear,
  normTag,
  originalsPathFor,
  parseTags,
  safeBase
} from "../src/routes/upload.js";
import { restoreEnv } from "./helpers.js";
import { parseMetadataFiles } from "../src/upload-metadata.js";

test("JSON metadata validates records and preserves atomic subjects", () => {
  const file = value => ({ originalname: "metadata.json", buffer: Buffer.from(JSON.stringify(value)) });
  const record = { imageFilename: "Artwork.JPG", hierarchicalSubjects: ["series|Orbs", "subject|red, blue"] };
  assert.deepEqual(parseMetadataFiles([file(record)]).get("artwork.jpg"), record);
  assert.equal(parseMetadataFiles([file([record, { imageFilename: "other.jpg" }])]).size, 2);
  assert.deepEqual(parseTags([...record.hierarchicalSubjects, "SERIES|ORBS"]), ["series|orbs", "subject|red, blue"]);
  assert.throws(() => parseMetadataFiles([file([record, record])]), /Multiple metadata/);
  assert.throws(() => parseMetadataFiles([file({ ...record, hierarchicalSubjects: "a|b" })]), /array of strings/);
  assert.throws(() => parseMetadataFiles([file({ imageFilename: "../image.jpg" })]), /without directories/);
  assert.throws(() => parseMetadataFiles([{ originalname: "bad.json", buffer: Buffer.from("{") }]), /Invalid JSON/);
  assert.throws(() => parseMetadataFiles([{ originalname: "large.json", buffer: Buffer.alloc(1024 * 1024 + 1) }]), /1 MB/);
});

test.afterEach(() => {
  restoreEnv();
});

test("safeBase sanitizes filenames and preserves simple extensions", () => {
  assert.equal(safeBase("My File!!.png"), "My_File_.png");
  assert.equal(safeBase("../../odd name?.jpg"), ".._.._odd_name_.jpg");
  assert.ok(safeBase("a".repeat(200)).length <= 80);
});

test("normTag trims, lowercases, and removes leading hash markers", () => {
  assert.equal(normTag("  #Concept Art  "), "concept art");
  assert.equal(normTag("###Painterly"), "painterly");
  assert.equal(normTag(""), "");
});

test("parseTags handles arrays, json arrays, and delimited strings", () => {
  assert.deepEqual(parseTags([" #Blue ", "blue", "Portrait ", ""]), ["blue", "portrait"]);
  assert.deepEqual(parseTags('[" #SciFi ", "scifi", "Concept Art"]'), ["concept art", "scifi"]);
  assert.deepEqual(parseTags("portrait, concept art; #blue\nportrait"), ["blue", "concept art", "portrait"]);
  assert.deepEqual(parseTags(""), []);
});

test("cleanSeries, cleanYear, and cleanStatus normalize upload metadata", () => {
  assert.equal(cleanSeries("  Night   Works  "), "Night Works");
  assert.equal(cleanYear(" 2026 "), "2026");
  assert.equal(cleanStatus("published"), "published");
  assert.equal(cleanStatus("hidden"), "hidden");
  assert.equal(cleanStatus("draft"), "draft");
  assert.equal(cleanStatus("weird-value"), "draft");
});

test("originalsPathFor creates an artwork-scoped private original path", () => {
  const output = originalsPathFor("a_123", "My File!!.png");
  assert.equal(path.basename(output), "a_123__My_File_.png");
  assert.match(output, /a_123__My_File_\.png$/);
});
