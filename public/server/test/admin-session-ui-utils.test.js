import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAdminLoginRedirect,
  getSafeAdminNext
} from "../../admin/js/session-utils.js";

test("getSafeAdminNext keeps safe same-origin admin targets", () => {
  const next = getSafeAdminNext(
    "?next=%2Fadmin%2Fupload.html%3Ftab%3Dnew%23focus",
    "https://toji.test"
  );
  assert.equal(next, "/admin/upload.html?tab=new#focus");
});

test("getSafeAdminNext rejects external, non-admin, and login-page targets", () => {
  assert.equal(
    getSafeAdminNext("?next=https%3A%2F%2Fevil.example%2Fadmin%2Findex.html", "https://toji.test"),
    "index.html"
  );
  assert.equal(
    getSafeAdminNext("?next=%2Fgallery.html", "https://toji.test"),
    "index.html"
  );
  assert.equal(
    getSafeAdminNext("?next=%2Fadmin%2Flogin.html", "https://toji.test"),
    "index.html"
  );
});

test("buildAdminLoginRedirect preserves the current admin location in the next parameter", () => {
  const href = buildAdminLoginRedirect("/admin/index.html", "?view=rows", "#artwork-1");
  assert.equal(href, "login.html?next=%2Fadmin%2Findex.html%3Fview%3Drows%23artwork-1");
});
