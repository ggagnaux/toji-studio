export function metadataFilenameKey(value) {
  return String(value || "").trim().toLowerCase();
}

export function parseMetadataFiles(files = []) {
  const records = new Map();
  for (const file of files) {
    if (!/\.json$/i.test(file.originalname) || file.buffer.length > 1024 * 1024) {
      throw new Error("Metadata must be JSON files no larger than 1 MB each.");
    }
    let parsed;
    try {
      parsed = JSON.parse(file.buffer.toString("utf8").replace(/^\uFEFF/, ""));
    } catch {
      throw new Error(`Invalid JSON in ${file.originalname}.`);
    }
    for (const record of Array.isArray(parsed) ? parsed : [parsed]) {
      if (!record || typeof record !== "object" || Array.isArray(record) ||
          typeof record.imageFilename !== "string" || !record.imageFilename.trim() ||
          /[\\/]/.test(record.imageFilename)) {
        throw new Error(`Each metadata record in ${file.originalname} requires an imageFilename without directories.`);
      }
      for (const field of ["imagePath", "xmpPath", "title", "description"]) {
        if (record[field] !== undefined && typeof record[field] !== "string") {
          throw new Error(`${field} must be a string in ${file.originalname}.`);
        }
      }
      if (record.hierarchicalSubjects !== undefined &&
          (!Array.isArray(record.hierarchicalSubjects) || record.hierarchicalSubjects.some(tag => typeof tag !== "string"))) {
        throw new Error(`hierarchicalSubjects must be an array of strings in ${file.originalname}.`);
      }
      const key = metadataFilenameKey(record.imageFilename);
      if (records.has(key)) throw new Error(`Multiple metadata records match ${record.imageFilename}.`);
      records.set(key, record);
    }
  }
  return records;
}
