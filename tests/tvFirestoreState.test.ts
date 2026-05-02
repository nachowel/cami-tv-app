import test from "node:test";
import assert from "node:assert/strict";

import { mockDisplayData } from "../src/data/mockDisplayData.ts";
import {
  resolveTvDisplayData,
  startTvDisplaySync,
  type TvDisplaySyncApi,
  type TvFirestoreBootstrap,
} from "../src/components/tv/tvFirestoreState.ts";

test("resolveTvDisplayData prefers Firestore data when all sections are available", () => {
  const bootstrap: TvFirestoreBootstrap = {
    announcements: [],
    dailyContent: {
      ...mockDisplayData.dailyContent,
      source: "Firestore source",
    },
    donation: {
      ...mockDisplayData.donation,
      weekly_amount: 880,
    },
    prayerTimes: {
      ...mockDisplayData.prayerTimes,
      today: {
        ...mockDisplayData.prayerTimes.today,
        fajr: "05:30",
      },
    },
    settings: {
      ...mockDisplayData.settings,
      mosque_name: "Live TV Mosque",
    },
  };

  const result = resolveTvDisplayData(bootstrap, mockDisplayData);

  assert.equal(result.settings.mosque_name, "Live TV Mosque");
  assert.equal(result.donation.weekly_amount, 880);
  assert.equal(result.prayerTimes.today.fajr, "05:30");
  assert.equal(result.dailyContent.source, "Firestore source");
  assert.deepEqual(result.announcements, []);
});

test("resolveTvDisplayData falls back only missing sections to mock data", () => {
  const bootstrap: TvFirestoreBootstrap = {
    announcements: [],
    dailyContent: null,
    donation: null,
    prayerTimes: {
      ...mockDisplayData.prayerTimes,
      today: {
        ...mockDisplayData.prayerTimes.today,
        isha: "22:01",
      },
    },
    settings: null,
  };

  const result = resolveTvDisplayData(bootstrap, mockDisplayData);

  assert.equal(result.prayerTimes.today.isha, "22:01");
  assert.equal(result.settings.mosque_name, mockDisplayData.settings.mosque_name);
  assert.equal(result.donation.weekly_amount, mockDisplayData.donation.weekly_amount);
  assert.deepEqual(result.dailyContent, mockDisplayData.dailyContent);
  assert.deepEqual(result.announcements, []);
});

test("resolveTvDisplayData keeps English daily content from fallback when Firestore daily content misses that language", () => {
  const bootstrap: TvFirestoreBootstrap = {
    announcements: [],
    dailyContent: {
      ...mockDisplayData.dailyContent,
      translation: {
        en: "",
        tr: "Firestore Turkce",
      },
    },
    donation: null,
    prayerTimes: null,
    settings: null,
    ticker: null,
  };

  const result = resolveTvDisplayData(bootstrap, mockDisplayData);

  assert.equal(result.dailyContent.translation.en, mockDisplayData.dailyContent.translation.en);
  assert.equal(result.dailyContent.translation.tr, "Firestore Turkce");
});

test("resolveTvDisplayData merges ticker text from Firestore and falls back per language", () => {
  const bootstrap: TvFirestoreBootstrap = {
    announcements: [],
    dailyContent: null,
    donation: null,
    prayerTimes: null,
    settings: null,
    ticker: {
      ...mockDisplayData.ticker,
      text: {
        en: "",
        tr: "Firestore Turkce ticker",
      },
    },
  };

  const result = resolveTvDisplayData(bootstrap, mockDisplayData);

  assert.equal(result.ticker.text.en, mockDisplayData.ticker.text.en);
  assert.equal(result.ticker.text.tr, "Firestore Turkce ticker");
  assert.equal(result.ticker.type, "hadith");
});

test("startTvDisplaySync applies a new ticker snapshot from Firestore without a page refresh", () => {
  const updates: DisplayData[] = [];
  let emitTicker: ((value: typeof mockDisplayData.ticker) => void) | null = null;

  const cleanup = startTvDisplaySync({
    api: {
      subscribeToAnnouncements(callback) {
        callback(mockDisplayData.announcements);
        return () => {};
      },
      subscribeToDailyContentCurrent(callback) {
        callback(mockDisplayData.dailyContent);
        return () => {};
      },
      subscribeToDisplaySettings(callback) {
        callback(mockDisplayData.settings);
        return () => {};
      },
      subscribeToDonationCurrent(callback) {
        callback(mockDisplayData.donation);
        return () => {};
      },
      subscribeToPrayerTimesCurrent(callback) {
        callback(mockDisplayData.prayerTimes);
        return () => {};
      },
      subscribeToTickerCurrent(callback) {
        emitTicker = callback;
        callback(mockDisplayData.ticker);
        return () => {};
      },
    },
    fallback: mockDisplayData,
    onData(data) {
      updates.push(data);
    },
  });

  assert.ok(emitTicker);

  emitTicker?.({
    text: { en: "Updated ticker", tr: "Guncel serit" },
    type: "message",
    updated_at: "2026-05-02T13:00:00.000Z",
  });

  const lastUpdate = updates.at(-1);

  assert.equal(lastUpdate?.ticker.text.en, "Updated ticker");
  assert.equal(lastUpdate?.ticker.text.tr, "Guncel serit");
  assert.equal(lastUpdate?.ticker.type, "message");

  cleanup();
});

test("startTvDisplaySync falls back on read failure without blanking the TV state", () => {
  const updates = [];
  const loggedErrors: string[] = [];

  const api: TvDisplaySyncApi = {
    subscribeToAnnouncements(callback) {
      callback([]);
      return () => {};
    },
    subscribeToDailyContentCurrent(_callback, onError) {
      onError?.(new Error("daily-content-read-failed"));
      return () => {};
    },
    subscribeToDisplaySettings(callback) {
      callback({
        ...mockDisplayData.settings,
        mosque_name: "Realtime Mosque",
      });
      return () => {};
    },
    subscribeToDonationCurrent(callback) {
      callback({
        ...mockDisplayData.donation,
        weekly_amount: 999,
      });
      return () => {};
    },
    subscribeToPrayerTimesCurrent(callback) {
      callback(mockDisplayData.prayerTimes);
      return () => {};
    },
    subscribeToTickerCurrent(callback) {
      callback(mockDisplayData.ticker);
      return () => {};
    },
  };

  const cleanup = startTvDisplaySync({
    api,
    fallback: mockDisplayData,
    isDevelopment: true,
    logError(section, error) {
      loggedErrors.push(`${section}:${error.message}`);
    },
    onData(data) {
      updates.push(data);
    },
    scheduleRetry() {
      return () => {};
    },
  });

  const lastUpdate = updates.at(-1);

  assert.ok(lastUpdate);
  assert.equal(lastUpdate?.settings.mosque_name, "Realtime Mosque");
  assert.equal(lastUpdate?.donation.weekly_amount, 999);
  assert.deepEqual(lastUpdate?.dailyContent, mockDisplayData.dailyContent);
  assert.deepEqual(loggedErrors, ["dailyContent:daily-content-read-failed"]);

  cleanup();
});

test("startTvDisplaySync survives Firestore subscription setup errors and keeps fallback data visible", () => {
  const updates = [];
  const loggedErrors: string[] = [];

  const cleanup = startTvDisplaySync({
    api: {
      subscribeToAnnouncements(callback) {
        callback(mockDisplayData.announcements);
        return () => {};
      },
      subscribeToDailyContentCurrent() {
        throw new Error("firestore-not-configured");
      },
      subscribeToDisplaySettings(callback) {
        callback(mockDisplayData.settings);
        return () => {};
      },
      subscribeToDonationCurrent(callback) {
        callback(mockDisplayData.donation);
        return () => {};
      },
      subscribeToPrayerTimesCurrent(callback) {
        callback(mockDisplayData.prayerTimes);
        return () => {};
      },
    },
    fallback: mockDisplayData,
    isDevelopment: true,
    logError(section, error) {
      loggedErrors.push(`${section}:${error.message}`);
    },
    onData(data) {
      updates.push(data);
    },
    scheduleRetry() {
      return () => {};
    },
  });

  const lastUpdate = updates.at(-1);

  assert.ok(lastUpdate);
  assert.deepEqual(lastUpdate?.dailyContent, mockDisplayData.dailyContent);
  assert.equal(loggedErrors.includes("dailyContent:firestore-not-configured"), true);

  cleanup();
});

test("startTvDisplaySync resubscribes after a listener error and restores realtime data", () => {
  const updates = [];
  const loggedErrors: string[] = [];
  let announcementSubscriptionAttempts = 0;

  const cleanup = startTvDisplaySync({
    api: {
      subscribeToAnnouncements(callback, onError) {
        announcementSubscriptionAttempts += 1;

        if (announcementSubscriptionAttempts === 1) {
          onError?.(new Error("listen-unavailable"));
          return () => {};
        }

        callback([
          {
            ...mockDisplayData.announcements[0],
            id: "announcement-live",
            text: {
              en: "Live Firestore announcement restored.",
              tr: "Canli Firestore duyurusu geri geldi.",
            },
          },
        ]);
        return () => {};
      },
      subscribeToDailyContentCurrent(callback) {
        callback(mockDisplayData.dailyContent);
        return () => {};
      },
      subscribeToDisplaySettings(callback) {
        callback(mockDisplayData.settings);
        return () => {};
      },
      subscribeToDonationCurrent(callback) {
        callback(mockDisplayData.donation);
        return () => {};
      },
      subscribeToPrayerTimesCurrent(callback) {
        callback(mockDisplayData.prayerTimes);
        return () => {};
      },
      subscribeToTickerCurrent(callback) {
        callback(mockDisplayData.ticker);
        return () => {};
      },
    },
    fallback: {
      ...mockDisplayData,
      announcements: [],
    },
    isDevelopment: true,
    logError(section, error) {
      loggedErrors.push(`${section}:${error.message}`);
    },
    onData(data) {
      updates.push(data);
    },
    scheduleRetry(runRetry) {
      runRetry();
      return () => {};
    },
  });

  const lastUpdate = updates.at(-1);

  assert.ok(lastUpdate);
  assert.equal(announcementSubscriptionAttempts, 2);
  assert.equal(lastUpdate?.announcements[0]?.text.en, "Live Firestore announcement restored.");
  assert.deepEqual(loggedErrors, ["announcements:listen-unavailable"]);

  cleanup();
});

test("startTvDisplaySync applies a new announcement snapshot from Firestore without a page refresh", () => {
  const updates = [];
  let emitAnnouncements: ((value: typeof mockDisplayData.announcements) => void) | null = null;

  const cleanup = startTvDisplaySync({
    api: {
      subscribeToAnnouncements(callback) {
        emitAnnouncements = callback;
        callback([]);
        return () => {};
      },
      subscribeToDailyContentCurrent(callback) {
        callback(mockDisplayData.dailyContent);
        return () => {};
      },
      subscribeToDisplaySettings(callback) {
        callback(mockDisplayData.settings);
        return () => {};
      },
      subscribeToDonationCurrent(callback) {
        callback(mockDisplayData.donation);
        return () => {};
      },
      subscribeToPrayerTimesCurrent(callback) {
        callback(mockDisplayData.prayerTimes);
        return () => {};
      },
    },
    fallback: mockDisplayData,
    onData(data) {
      updates.push(data);
    },
  });

  assert.ok(emitAnnouncements);

  emitAnnouncements?.([
    {
      ...mockDisplayData.announcements[0],
      id: "announcement-live-new",
      text: {
        en: "Live Firestore announcement",
        tr: "Canli Firestore duyurusu",
      },
      updated_at: "2026-05-02T13:00:00.000Z",
    },
  ]);

  const lastUpdate = updates.at(-1);

  assert.equal(lastUpdate?.announcements.length, 1);
  assert.equal(lastUpdate?.announcements[0]?.id, "announcement-live-new");
  assert.equal(lastUpdate?.announcements[0]?.text.en, "Live Firestore announcement");

  cleanup();
});

test("startTvDisplaySync never calls Firestore write helpers", () => {
  let writeCalls = 0;

  const api = {
    saveAnnouncement() {
      writeCalls += 1;
      return Promise.resolve();
    },
    saveDailyContentCurrent() {
      writeCalls += 1;
      return Promise.resolve();
    },
    saveDisplaySettings() {
      writeCalls += 1;
      return Promise.resolve();
    },
    saveDonationCurrent() {
      writeCalls += 1;
      return Promise.resolve();
    },
    savePrayerTimesCurrent() {
      writeCalls += 1;
      return Promise.resolve();
    },
    saveTickerCurrent() {
      writeCalls += 1;
      return Promise.resolve();
    },
    subscribeToAnnouncements(callback: (value: typeof mockDisplayData.announcements) => void) {
      callback(mockDisplayData.announcements);
      return () => {};
    },
    subscribeToDailyContentCurrent(callback: (value: typeof mockDisplayData.dailyContent | null) => void) {
      callback(mockDisplayData.dailyContent);
      return () => {};
    },
    subscribeToDisplaySettings(callback: (value: typeof mockDisplayData.settings | null) => void) {
      callback(mockDisplayData.settings);
      return () => {};
    },
    subscribeToDonationCurrent(callback: (value: typeof mockDisplayData.donation | null) => void) {
      callback(mockDisplayData.donation);
      return () => {};
    },
    subscribeToPrayerTimesCurrent(callback: (value: typeof mockDisplayData.prayerTimes | null) => void) {
      callback(mockDisplayData.prayerTimes);
      return () => {};
    },
    subscribeToTickerCurrent(callback: (value: typeof mockDisplayData.ticker | null) => void) {
      callback(mockDisplayData.ticker);
      return () => {};
    },
  } satisfies TvDisplaySyncApi & Record<string, unknown>;

  startTvDisplaySync({
    api,
    fallback: mockDisplayData,
    onData() {},
  });

  assert.equal(writeCalls, 0);
});

test("startTvDisplaySync cleans up every Firestore subscription on unmount", () => {
  const unsubscribeCalls: string[] = [];

  function createUnsubscribe(section: string) {
    return () => {
      unsubscribeCalls.push(section);
    };
  }

  const cleanup = startTvDisplaySync({
    api: {
      subscribeToAnnouncements() {
        return createUnsubscribe("announcements");
      },
      subscribeToDailyContentCurrent() {
        return createUnsubscribe("dailyContent");
      },
      subscribeToDisplaySettings() {
        return createUnsubscribe("settings");
      },
      subscribeToDonationCurrent() {
        return createUnsubscribe("donation");
      },
      subscribeToPrayerTimesCurrent() {
        return createUnsubscribe("prayerTimes");
      },
      subscribeToTickerCurrent() {
        return createUnsubscribe("ticker");
      },
    },
    fallback: mockDisplayData,
    onData() {},
  });

  cleanup();

  assert.deepEqual(unsubscribeCalls.sort(), [
    "announcements",
    "dailyContent",
    "donation",
    "prayerTimes",
    "settings",
    "ticker",
  ]);
});
