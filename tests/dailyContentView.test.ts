import test from "node:test";
import assert from "node:assert/strict";

import {
  resolveDailyContentDisplaySource,
  resolveDailyContentDisplayText,
} from "../src/components/tv/dailyContentView.ts";
import { mockDisplayData } from "../src/data/mockDisplayData.ts";

test("english daily content source uses Firestore content source instead of a hardcoded translation string", () => {
  const source = resolveDailyContentDisplaySource({
    content: {
      ...mockDisplayData.dailyContent,
      source: "Updated Firestore Source",
    },
    fallbackSource: "Fallback Source",
    language: "en",
  });

  assert.equal(source, "Updated Firestore Source");
});

test("turkish daily content source still uses the Firestore content source", () => {
  const source = resolveDailyContentDisplaySource({
    content: {
      ...mockDisplayData.dailyContent,
      source: "Guncel Kaynak",
    },
    fallbackSource: "Yedek Kaynak",
    language: "tr",
  });

  assert.equal(source, "Guncel Kaynak");
});

test("display text falls back safely when one language field is missing", () => {
  const text = resolveDailyContentDisplayText({
    content: {
      ...mockDisplayData.dailyContent,
      translation: {
        en: "",
        tr: "Sadece Turkce",
      },
    },
    fallbackText: "Fallback English",
    language: "en",
  });

  assert.equal(text, "Fallback English");
});
