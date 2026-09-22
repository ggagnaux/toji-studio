import fs from "node:fs";
import path from "node:path";

const TABLES = ["artwork_series", "variants", "artworks", "series"];

// Synchronous so no other request can use this connection while cascades are disabled.
export function clearArtworkData(db, storageDir, io = fs) {
  if (db.inTransaction) throw new Error("Cannot clear artwork data inside another transaction.");
  const root = io.realpathSync(storageDir);
  const directories = ["originals", "variants"].map(name => ({
    live: path.join(root, name),
    staged: path.join(root, `.clear-${name}`)
  }));
  // Never follow a redirected image directory or delete paths read from database rows.
  for (const { live, staged } of directories) {
    for (const target of [live, staged]) {
      if (path.dirname(target) !== root) throw new Error("Invalid image directory.");
      if (io.existsSync(target)) {
        const stat = io.lstatSync(target);
        if (stat.isSymbolicLink() || !stat.isDirectory() || io.realpathSync(target) !== target) {
          throw new Error("Image directories must be ordinary directories inside storage.");
        }
      }
    }
  }
  // Finish any image deletion left pending by a previous successful database reset.
  for (const { staged } of directories) io.rmSync(staged, { recursive: true, force: true });

  const moved = [];
  const foreignKeys = db.pragma("foreign_keys", { simple: true });
  let deletedRows;
  try {
    for (const entry of directories) {
      io.mkdirSync(entry.live, { recursive: true });
      io.renameSync(entry.live, entry.staged);
      moved.push(entry);
      io.mkdirSync(entry.live);
    }
    // Preserve artwork_social_posts verbatim, including historical artwork IDs.
    // Normal ON DELETE CASCADE would otherwise modify this non-selected table.
    db.pragma("foreign_keys = OFF");
    deletedRows = db.transaction(() => Object.fromEntries(
      TABLES.map(table => [table, db.prepare(`DELETE FROM ${table}`).run().changes])
    ))();
  } catch (error) {
    for (const { live, staged } of moved.reverse()) {
      if (io.existsSync(live)) io.rmdirSync(live);
      io.renameSync(staged, live);
    }
    throw error;
  } finally {
    db.pragma(`foreign_keys = ${foreignKeys ? "ON" : "OFF"}`);
  }

  const warnings = [];
  for (const { staged } of directories) {
    try {
      io.rmSync(staged, { recursive: true, force: true });
    } catch (error) {
      console.error("Image deletion incomplete:", staged, error);
      warnings.push("Some image files could not be deleted. Run Clear database and images again to retry.");
    }
  }
  return { deletedRows, imagesDeleted: warnings.length === 0, warnings: [...new Set(warnings)] };
}
