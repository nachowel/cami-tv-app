import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("Awqat Salah sync dry-run workflow is manual only and uses the expected secrets", () => {
  const workflow = readFileSync(".github/workflows/awqat-salah-sync-dry-run.yml", "utf8");

  assert.match(workflow, /name:\s*Awqat Salah Sync Dry Run/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /schedule:/);
  assert.match(workflow, /AWQAT_SALAH_USERNAME:\s*\$\{\{\s*secrets\.AWQAT_SALAH_USERNAME\s*\}\}/);
  assert.match(workflow, /AWQAT_SALAH_PASSWORD:\s*\$\{\{\s*secrets\.AWQAT_SALAH_PASSWORD\s*\}\}/);
  assert.match(workflow, /dryRunAwqatSalahSync\.ts/);
});
