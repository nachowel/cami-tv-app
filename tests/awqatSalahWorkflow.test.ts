import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("Awqat Salah smoke test workflow is manual only and uses the expected secrets", () => {
  const workflow = readFileSync(".github/workflows/awqat-salah-login-smoke-test.yml", "utf8");

  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /schedule:/);
  assert.match(workflow, /AWQAT_SALAH_USERNAME:\s*\$\{\{\s*secrets\.AWQAT_SALAH_USERNAME\s*\}\}/);
  assert.match(workflow, /AWQAT_SALAH_PASSWORD:\s*\$\{\{\s*secrets\.AWQAT_SALAH_PASSWORD\s*\}\}/);
});

test("Awqat Salah login diagnostics workflow is manual only and does not write Firestore", () => {
  const workflow = readFileSync(".github/workflows/awqat-salah-login-diagnostics.yml", "utf8");

  assert.match(workflow, /name:\s*Awqat Salah Login Diagnostics/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /schedule:/);
  assert.match(workflow, /permissions:\s+contents:\s*read/s);
  assert.match(workflow, /AWQAT_SALAH_USERNAME:\s*\$\{\{\s*secrets\.AWQAT_SALAH_USERNAME\s*\}\}/);
  assert.match(workflow, /AWQAT_SALAH_PASSWORD:\s*\$\{\{\s*secrets\.AWQAT_SALAH_PASSWORD\s*\}\}/);
  assert.match(workflow, /run:\s*npm ci/);
  assert.match(workflow, /run:\s*npm run build/);
  assert.match(workflow, /run:\s*npm run diagnose:awqat-login/);
  assert.doesNotMatch(workflow, /GOOGLE_APPLICATION_CREDENTIALS|FIREBASE_SERVICE_ACCOUNT|prayer-times:awqat:sync/);
});
