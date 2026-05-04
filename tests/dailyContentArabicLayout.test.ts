import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const panelSource = readFileSync(new URL("../src/components/tv/DailyContentPanel.tsx", import.meta.url), "utf8");
const globalStyles = readFileSync(new URL("../src/styles/globals.css", import.meta.url), "utf8");

test("daily content panel uses rtl-aware Arabic styling with a dedicated fallback stack", () => {
  assert.match(panelSource, /lang="ar"/);
  assert.match(panelSource, /dir="rtl"/);
  assert.match(panelSource, /tv-arabic-copy/);
  assert.match(panelSource, /content-start/);
  assert.match(panelSource, /text-\[clamp\(0\.9rem,1\.12vw,1\.12rem\)\]/);
  assert.match(panelSource, /text-\[clamp\(0\.7rem,0\.88vw,0\.88rem\)\]/);
  assert.match(globalStyles, /\.tv-arabic-copy/);
  assert.match(globalStyles, /line-height:\s*1\.6/);
  assert.match(globalStyles, /@font-face\s*\{[\s\S]*font-family:\s*"Noto Naskh Arabic"/);
  assert.match(globalStyles, /src:\s*url\("\/fonts\/NotoNaskhArabic-Regular\.woff2"\)\s*format\("woff2"\)/);
  assert.match(globalStyles, /font-family:\s*"Noto Naskh Arabic", "Amiri", "Scheherazade New", serif/);
});
