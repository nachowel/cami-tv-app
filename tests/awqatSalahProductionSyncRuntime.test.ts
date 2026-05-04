import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("Awqat production sync uses compiled JS and the workflow builds before syncing", () => {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
    scripts?: Record<string, string>;
  };
  const workflow = readFileSync(".github/workflows/awqat-salah-prayer-times-sync.yml", "utf8");
  const scriptsTsConfig = JSON.parse(readFileSync("tsconfig.scripts.json", "utf8")) as {
    compilerOptions?: Record<string, unknown>;
  };

  assert.equal(
    packageJson.scripts?.["prayer-times:awqat:sync"],
    "node dist/scripts/prayerTimes/syncAwqatSalah.js",
  );
  assert.equal(packageJson.scripts?.build, "vite build && tsc -b");

  assert.match(
    workflow,
    /- name: Build project\s+run: npm run build\s+- name: Sync prayer times\s+run: npm run prayer-times:awqat:sync/s,
  );

  assert.equal(scriptsTsConfig.compilerOptions?.noEmit, false);
  assert.equal(scriptsTsConfig.compilerOptions?.outDir, "./dist");
  assert.equal(scriptsTsConfig.compilerOptions?.rewriteRelativeImportExtensions, true);
});
