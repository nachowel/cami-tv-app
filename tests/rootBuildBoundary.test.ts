import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("root TypeScript build excludes Firebase Functions and keeps them isolated", () => {
  const rootTsconfig = JSON.parse(readFileSync("tsconfig.json", "utf8")) as {
    references?: Array<{ path?: string }>;
  };
  const rootPackageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const functionsPackageJson = JSON.parse(readFileSync("functions/package.json", "utf8")) as {
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
  };

  const referencePaths = (rootTsconfig.references ?? []).map((reference) => reference.path);

  assert.ok(referencePaths.includes("./tsconfig.app.json"));
  assert.ok(referencePaths.includes("./tsconfig.node.json"));
  assert.ok(referencePaths.includes("./tsconfig.scripts.json"));
  assert.ok(!referencePaths.includes("./tsconfig.functions.json"));

  assert.equal(rootPackageJson.scripts?.build, "vite build && tsc -b");
  assert.equal(rootPackageJson.dependencies?.["firebase-functions"], undefined);
  assert.equal(rootPackageJson.devDependencies?.["firebase-functions"], undefined);

  assert.equal(functionsPackageJson.scripts?.build, "tsc -p tsconfig.json");
  assert.equal(typeof functionsPackageJson.dependencies?.["firebase-functions"], "string");
});
