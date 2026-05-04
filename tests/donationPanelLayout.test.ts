import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/components/tv/DonationPanel.tsx", import.meta.url), "utf8");

test("donation panel keeps a fixed square QR block and a multiline URL label", () => {
  assert.match(source, /gridTemplateColumns: "minmax\(0,1fr\) clamp\(8\.2rem,13\.2vw,10\.3rem\)"/);
  assert.match(source, /aspect-square/);
  assert.match(source, /LAST WEEK/);
  assert.match(source, /DONATION/);
  assert.match(source, /whitespace-nowrap/);
  assert.match(source, /w-full min-w-\[clamp\(7\.2rem,11\.5vw,8\.9rem\)\] max-w-full/);
  assert.match(source, /px-\[clamp\(0\.5rem,0\.72vw,0\.84rem\)\]/);
  assert.match(source, /text-\[clamp\(0\.3rem,0\.38vw,0\.42rem\)\]/);
  assert.match(source, /pb-\[clamp\(0\.9rem,1\.2vw,1\.3rem\)\]/);
});
