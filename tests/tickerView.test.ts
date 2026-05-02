import test from "node:test";
import assert from "node:assert/strict";

import { resolveTickerDisplayText } from "../src/components/tv/tickerView.ts";

const baseTicker = {
  text: { en: "English ticker", tr: "Turkce serit" },
  type: "message" as const,
  updated_at: "2026-05-01T18:00:00Z",
};

test("resolveTickerDisplayText uses current language text when available", () => {
  const result = resolveTickerDisplayText({ ticker: baseTicker, language: "en", fallbackText: "fallback" });
  assert.equal(result, "English ticker");
});

test("resolveTickerDisplayText falls back to the other language when current is empty", () => {
  const ticker = { ...baseTicker, text: { en: "", tr: "Turkce only" } };
  const result = resolveTickerDisplayText({ ticker, language: "en", fallbackText: "fallback" });
  assert.equal(result, "Turkce only");
});

test("resolveTickerDisplayText falls back to hard default when both languages are empty", () => {
  const ticker = { ...baseTicker, text: { en: "", tr: "" } };
  const result = resolveTickerDisplayText({ ticker, language: "en", fallbackText: "Hard fallback" });
  assert.equal(result, "Hard fallback");
});

test("resolveTickerDisplayText appends hadith suffix for hadith type", () => {
  const ticker = { ...baseTicker, type: "hadith" as const };
  const en = resolveTickerDisplayText({ ticker, language: "en", fallbackText: "fallback" });
  const tr = resolveTickerDisplayText({ ticker, language: "tr", fallbackText: "fallback" });

  assert.equal(en, "English ticker (Hadith)");
  assert.equal(tr, "Turkce serit (Hadis)");
});

test("resolveTickerDisplayText does not append suffix for message type", () => {
  const result = resolveTickerDisplayText({ ticker: baseTicker, language: "en", fallbackText: "fallback" });
  assert.equal(result, "English ticker");
});

test("resolveTickerDisplayText preserves long text so the footer marquee can scroll it", () => {
  const longText = "a".repeat(120);
  const ticker = { ...baseTicker, text: { en: longText, tr: longText } };
  const result = resolveTickerDisplayText({ ticker, language: "en", fallbackText: "fallback" });

  assert.equal(result, longText);
});

test("resolveTickerDisplayText preserves long hadith text after appending the suffix", () => {
  const longBase = "a".repeat(95);
  const ticker = { ...baseTicker, text: { en: longBase, tr: longBase }, type: "hadith" as const };
  const result = resolveTickerDisplayText({ ticker, language: "en", fallbackText: "fallback" });

  assert.ok(result.startsWith(longBase));
  assert.equal(result, `${longBase} (Hadith)`);
});
