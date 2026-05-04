import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/components/tv/MosqueHeaderPanel.tsx", import.meta.url), "utf8");

test("mosque header support card uses a flex column layout without overflow clipping", () => {
  assert.doesNotMatch(source, /overflow-hidden/);
  assert.match(source, /flex-col justify-between/);
  assert.match(source, /support_our_mosque/);
  assert.match(source, /py-\[clamp\(0\.82rem,1\.05vw,1\.18rem\)\]/);
  assert.match(source, /mt-\[clamp\(0\.5rem,0\.78vw,0\.88rem\)\]/);
  assert.match(source, /leading-\[1\.18\]/);
  assert.match(source, /leading-\[1\.45\]/);
  assert.match(source, /ISLAMIC COMMUNITY/);
  assert.match(source, /MILLI GORUS/);
});
