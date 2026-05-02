import test from "node:test";
import assert from "node:assert/strict";

import { mockDisplayData } from "../src/data/mockDisplayData.ts";
import {
  resolveAdminDisplayData,
  type AdminFirestoreBootstrap,
} from "../src/components/admin/adminFirestoreState.ts";

test("resolveAdminDisplayData returns Firestore-backed data without warning when all documents exist", () => {
  const bootstrap: AdminFirestoreBootstrap = {
    announcements: [],
    dailyContent: {
      ...mockDisplayData.dailyContent,
      source: "Updated source",
    },
    donation: {
      ...mockDisplayData.donation,
      weekly_amount: 999,
    },
    prayerTimes: {
      ...mockDisplayData.prayerTimes,
      today: {
        ...mockDisplayData.prayerTimes.today,
        fajr: "05:55",
      },
    },
    settings: {
      ...mockDisplayData.settings,
      mosque_name: "Live Mosque Name",
    },
    ticker: {
      ...mockDisplayData.ticker,
      text: {
        en: "Updated ticker",
        tr: "Guncel serit",
      },
    },
  };

  const result = resolveAdminDisplayData(bootstrap, mockDisplayData);

  assert.equal(result.warning, null);
  assert.deepEqual(result.fallbackState, {
    announcements: false,
    dailyContent: false,
    donation: false,
    prayerTimes: false,
    settings: false,
    ticker: false,
  });
  assert.equal(result.data.settings.mosque_name, "Live Mosque Name");
  assert.equal(result.data.donation.weekly_amount, 999);
  assert.equal(result.data.prayerTimes.today.fajr, "05:55");
  assert.equal(result.data.dailyContent.source, "Updated source");
  assert.equal(result.data.ticker.text.en, "Updated ticker");
  assert.deepEqual(result.data.announcements, []);
});

test("resolveAdminDisplayData falls back per section and reports which Firestore sections were unavailable", () => {
  const bootstrap: AdminFirestoreBootstrap = {
    announcements: null,
    dailyContent: null,
    donation: {
      ...mockDisplayData.donation,
      weekly_amount: 500,
    },
    prayerTimes: null,
    settings: {
      ...mockDisplayData.settings,
      language: "tr",
    },
    ticker: null,
  };

  const result = resolveAdminDisplayData(bootstrap, mockDisplayData);

  assert.equal(result.data.settings.language, "tr");
  assert.equal(result.data.donation.weekly_amount, 500);
  assert.deepEqual(result.fallbackState, {
    announcements: true,
    dailyContent: true,
    donation: false,
    prayerTimes: true,
    settings: false,
    ticker: true,
  });
  assert.deepEqual(result.data.prayerTimes, mockDisplayData.prayerTimes);
  assert.deepEqual(result.data.dailyContent, mockDisplayData.dailyContent);
  assert.deepEqual(result.data.ticker, mockDisplayData.ticker);
  assert.equal(result.data.announcements[0]?.id, "local-fallback-announcement-1");
  assert.equal(
    result.warning,
    "Firestore verisi namaz vakitleri, günün içeriği, alt şerit yazısı ve duyurular için alınamadı. Bu bölümlerde yedek veriler kullanılıyor.",
  );
});

test("resolveAdminDisplayData keeps fallback announcements local-only on load and does not mutate mock data", () => {
  const originalMockId = mockDisplayData.announcements[0]?.id;

  const result = resolveAdminDisplayData(
    {
      announcements: null,
      dailyContent: mockDisplayData.dailyContent,
      donation: mockDisplayData.donation,
      prayerTimes: mockDisplayData.prayerTimes,
      settings: mockDisplayData.settings,
    },
    mockDisplayData,
  );

  assert.equal(originalMockId, "announcement-1");
  assert.equal(mockDisplayData.announcements[0]?.id, "announcement-1");
  assert.equal(result.data.announcements[0]?.id, "local-fallback-announcement-1");
});
