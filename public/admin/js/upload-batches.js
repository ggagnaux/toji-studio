const key = value => String(value || "").trim().toLowerCase();

export async function prepareUploadMetadata(files, metadataFiles) {
  const records = new Map();
  const names = new Set(files.map(file => key(file.name)));
  if (names.size !== files.length) throw new Error("Image filenames must be unique within a selection.");
  for (const file of metadataFiles) {
    if (file.size > 1024 * 1024) throw new Error(`${file.name}: JSON metadata must be no larger than 1 MB.`);
    let parsed;
    try { parsed = JSON.parse((await file.text()).replace(/^\uFEFF/, "")); }
    catch { throw new Error(`Invalid JSON in ${file.name}.`); }
    for (const record of Array.isArray(parsed) ? parsed : [parsed]) {
      if (!record || typeof record !== "object" || Array.isArray(record) ||
          typeof record.imageFilename !== "string" || !record.imageFilename.trim() || /[\\/]/.test(record.imageFilename)) {
        throw new Error(`Each record in ${file.name} needs an imageFilename without directories.`);
      }
      for (const field of ["imagePath", "xmpPath", "title", "description"]) {
        if (record[field] !== undefined && typeof record[field] !== "string") throw new Error(`${field} must be a string in ${file.name}.`);
      }
      if (record.hierarchicalSubjects !== undefined && (!Array.isArray(record.hierarchicalSubjects) || record.hierarchicalSubjects.some(value => typeof value !== "string"))) {
        throw new Error(`hierarchicalSubjects must be an array of strings in ${file.name}.`);
      }
      const filename = key(record.imageFilename);
      if (records.has(filename)) throw new Error(`Multiple metadata records match ${record.imageFilename}.`);
      records.set(filename, record);
    }
  }
  return { records, warnings: [...records].filter(([name]) => !names.has(name)).map(([, record]) => `No uploaded image matches ${record.imageFilename}.`) };
}

export function createBatchForm(files, records, status) {
  const form = new FormData();
  for (const file of files) {
    form.append("files", file, file.name);
    const record = records.get(key(file.name));
    if (record) form.append("metadata", new Blob([JSON.stringify(record)], { type: "application/json" }), "metadata.json");
  }
  form.append("status", status);
  return form;
}

export async function uploadInBatches({ files, send, onBatch = () => {}, onProgress = () => {}, onRetry = () => {}, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), batchSize = 10 }) {
  const result = { created: [], skipped: [], failed: [], warnings: [], metadataApplied: 0, remaining: [] };
  let size = Math.max(1, Math.min(30, batchSize));
  let offset = 0;
  let failures = 0;
  while (offset < files.length) {
    const batch = files.slice(offset, offset + size);
    let out;
    try {
      out = await send(batch, pct => onProgress(offset, batch.length, pct, files.length));
      if (!out || !["created", "skipped", "failed"].every(field => Array.isArray(out[field])) ||
          out.created.length + out.skipped.length + out.failed.length !== batch.length) {
        throw Object.assign(new Error("The server did not confirm every image in this batch."), { status: 0 });
      }
    } catch (error) {
      const tooLarge = error.status === 413 || ["LIMIT_FILE_COUNT", "LIMIT_UNEXPECTED_FILE"].includes(error.code);
      const transient = [0, 408, 429, 500, 502, 503, 504].includes(error.status);
      if ((tooLarge || transient) && (batch.length > 1 || (transient && failures < 5))) {
        failures++;
        size = Math.max(1, Math.floor(batch.length / 2));
        onRetry(size, error.message);
        await sleep(Math.min(1000 * 2 ** (failures - 1), 8000));
        continue;
      }
      // Isolate an individually oversized file and continue with the others.
      if (tooLarge || error.code === "LIMIT_FILE_SIZE") {
        if (batch.length > 1) { size = Math.max(1, Math.floor(batch.length / 2)); onRetry(size, error.message); continue; }
        const failed = { filename: batch[0].name, reason: error.message };
        result.failed.push(failed);
        offset++;
        failures = 0;
        continue;
      }
      result.remaining = files.slice(offset);
      result.warnings.push(`${error.message} ${result.remaining.length} image(s) remain. Press Upload to retry the remaining images.`);
      break;
    }
    failures = 0;
    for (const field of ["created", "skipped", "failed", "warnings"]) result[field].push(...(out[field] || []));
    result.metadataApplied += out.metadataApplied || 0;
    await onBatch(out, batch);
    offset += batch.length;
    onProgress(offset, 0, 0, files.length);
  }
  result.warnings = [...new Set(result.warnings)];
  return result;
}
