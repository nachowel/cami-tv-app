import test from "node:test";
import assert from "node:assert/strict";

import {
  FIRESTORE_PATHS,
  createFirestoreReadWriteClient,
  DEFAULT_DONATION_DISPLAY_CONFIG,
  getAnnouncementDocumentPath,
  getFirestoreServiceSetupError,
  normalizeDonationDisplayConfig,
} from "../src/services/firestoreDisplayService.ts";
import { mockDisplayData } from "../src/data/mockDisplayData.ts";

test("FIRESTORE_PATHS matches the expected singleton document and collection paths", () => {
  assert.deepEqual(FIRESTORE_PATHS, {
    announcementsCollection: "announcements",
    dailyContentCurrent: "dailyContent/current",
    donationCurrent: "donation/current",
    prayerTimesCurrent: "prayerTimes/current",
    settingsPrayerTimes: "settings/prayerTimes",
    prayerTimesSyncTest: "prayerTimes/syncTest",
    settingsDisplay: "settings/display",
    settingsDonationDisplay: "settings/donationDisplay",
    tickerCurrent: "ticker/current",
  });
});

test("getAnnouncementDocumentPath returns the exact document path under announcements", () => {
  assert.equal(
    getAnnouncementDocumentPath("announcement-123"),
    "announcements/announcement-123",
  );
});

test("getFirestoreServiceSetupError returns a clear message when Firestore is unavailable", () => {
  assert.equal(
    getFirestoreServiceSetupError(null),
    "Firebase Firestore is not configured. Add the required Vite Firebase environment variables before using the Firestore display service.",
  );
  assert.equal(getFirestoreServiceSetupError({} as never), null);
});

test("createFirestoreReadWriteClient saves an announcement through the write API and resolves", async () => {
  const calls: Array<{ kind: string; value: unknown }> = [];
  const db = { name: "lite-db" } as never;
  const client = createFirestoreReadWriteClient(
    {
      collection(currentDb, path) {
        calls.push({ kind: "collection", value: { currentDb, path } });
        return { currentDb, path };
      },
      deleteDoc() {
        throw new Error("delete not used");
      },
      doc(currentDb, path) {
        calls.push({ kind: "doc", value: { currentDb, path } });
        return { currentDb, path };
      },
      getDoc: async () => ({
        data: () => undefined,
        exists: () => false,
      }),
      getDocs: async () => ({
        docs: [],
      }),
      orderBy(field, direction) {
        calls.push({ kind: "orderBy", value: { direction, field } });
        return { direction, field };
      },
      query(collectionRef, orderClause) {
        calls.push({ kind: "query", value: { collectionRef, orderClause } });
        return { collectionRef, orderClause };
      },
      setDoc: async (ref, announcement) => {
        calls.push({ kind: "setDoc", value: { announcement, ref } });
      },
    },
    db,
  );

  await client.saveAnnouncement({
    id: "announcement-write-test",
    active: true,
    created_at: "2026-05-02T12:00:00.000Z",
    expires_at: null,
    text: {
      en: "English",
      tr: "Turkce",
    },
    updated_at: "2026-05-02T12:00:00.000Z",
  });

  assert.deepEqual(calls, [
    {
      kind: "doc",
      value: {
        currentDb: db,
        path: "announcements/announcement-write-test",
      },
    },
    {
      kind: "setDoc",
      value: {
        announcement: {
          id: "announcement-write-test",
          active: true,
          created_at: "2026-05-02T12:00:00.000Z",
          expires_at: null,
          text: {
            en: "English",
            tr: "Turkce",
          },
          updated_at: "2026-05-02T12:00:00.000Z",
        },
        ref: {
          currentDb: db,
          path: "announcements/announcement-write-test",
        },
      },
    },
  ]);
});

test("createFirestoreReadWriteClient propagates Firestore write failures", async () => {
  const client = createFirestoreReadWriteClient(
    {
      collection() {
        throw new Error("collection not used");
      },
      deleteDoc: async () => {},
      doc(_db, path) {
        return { path };
      },
      getDoc: async () => ({
        data: () => undefined,
        exists: () => false,
      }),
      getDocs: async () => ({
        docs: [],
      }),
      orderBy() {
        throw new Error("orderBy not used");
      },
      query() {
        throw new Error("query not used");
      },
      setDoc: async () => {
        throw new Error("permission-denied");
      },
    },
    {} as never,
  );

  await assert.rejects(
    () =>
      client.saveAnnouncement({
        id: "announcement-write-test",
        active: true,
        created_at: "2026-05-02T12:00:00.000Z",
        expires_at: null,
        text: {
          en: "English",
          tr: "Turkce",
        },
        updated_at: "2026-05-02T12:00:00.000Z",
      }),
    /permission-denied/,
  );
});

test("createFirestoreReadWriteClient fetches announcements through the direct read API", async () => {
  const calls: string[] = [];
  const db = { name: "lite-db" } as never;
  const client = createFirestoreReadWriteClient(
    {
      collection(currentDb, path) {
        calls.push(`collection:${String((currentDb as { name: string }).name)}:${path}`);
        return { currentDb, path };
      },
      deleteDoc: async () => {},
      doc() {
        throw new Error("doc not used");
      },
      getDoc: async () => ({
        data: () => undefined,
        exists: () => false,
      }),
      getDocs: async () => ({
        docs: [
          {
            data: () => ({
              id: "announcement-1",
            }),
          },
        ],
      }),
      orderBy(field, direction) {
        calls.push(`orderBy:${field}:${direction}`);
        return { direction, field };
      },
      query() {
        calls.push("query");
        return {};
      },
      setDoc: async () => {},
    },
    db,
  );

  const announcements = await client.fetchAnnouncements();

  assert.deepEqual(announcements, [{ id: "announcement-1" }]);
  assert.deepEqual(calls, [
    "collection:lite-db:announcements",
    "orderBy:created_at:asc",
    "query",
  ]);
});

test("createFirestoreReadWriteClient saves daily content with canonical English and Turkish translation fields", async () => {
  const calls: Array<{ kind: string; value: unknown }> = [];
  const db = { name: "lite-db" } as never;
  const client = createFirestoreReadWriteClient(
    {
      collection() {
        throw new Error("collection not used");
      },
      deleteDoc: async () => {},
      doc(currentDb, path) {
        calls.push({ kind: "doc", value: { currentDb, path } });
        return { currentDb, path };
      },
      getDoc: async () => ({
        data: () => undefined,
        exists: () => false,
      }),
      getDocs: async () => ({
        docs: [],
      }),
      orderBy() {
        throw new Error("orderBy not used");
      },
      query() {
        throw new Error("query not used");
      },
      setDoc: async (ref, value) => {
        calls.push({ kind: "setDoc", value: { ref, value } });
      },
    },
    db,
  );

  await client.saveDailyContentCurrent({
    ...mockDisplayData.dailyContent,
    translation: {
      en: "Updated English",
      tr: "Guncel Turkce",
    },
  });

  assert.deepEqual(calls, [
    {
      kind: "doc",
      value: {
        currentDb: db,
        path: "dailyContent/current",
      },
    },
    {
      kind: "setDoc",
      value: {
        ref: {
          currentDb: db,
          path: "dailyContent/current",
        },
        value: {
          ...mockDisplayData.dailyContent,
          translation: {
            en: "Updated English",
            tr: "Guncel Turkce",
          },
        },
      },
    },
  ]);
});

test("createFirestoreReadWriteClient normalizes older daily content Firestore fields", async () => {
  const client = createFirestoreReadWriteClient(
    {
      collection() {
        throw new Error("collection not used");
      },
      deleteDoc: async () => {},
      doc(_db, path) {
        return { path };
      },
      getDoc: async () => ({
        data: () => ({
          arabic: "Legacy Arabic",
          englishTranslation: "Legacy English",
          source: "",
          translation: {
            tr: "Eski Turkce",
          },
          type: "ayah",
          updated_at: "2026-05-05T12:00:00.000Z",
          reference: "Legacy Source",
        }),
        exists: () => true,
      }),
      getDocs: async () => ({
        docs: [],
      }),
      orderBy() {
        throw new Error("orderBy not used");
      },
      query() {
        throw new Error("query not used");
      },
      setDoc: async () => {},
    },
    {} as never,
  );

  const result = await client.fetchDailyContentCurrent();

  assert.deepEqual(result, {
    arabic: "Legacy Arabic",
    source: "Legacy Source",
    translation: {
      en: "Legacy English",
      tr: "Eski Turkce",
    },
    type: "ayah",
    updated_at: "2026-05-05T12:00:00.000Z",
  });
});

test("createFirestoreReadWriteClient saves ticker current with canonical text fields", async () => {
  const calls: Array<{ kind: string; value: unknown }> = [];
  const db = { name: "lite-db" } as never;
  const client = createFirestoreReadWriteClient(
    {
      collection() {
        throw new Error("collection not used");
      },
      deleteDoc: async () => {},
      doc(currentDb, path) {
        calls.push({ kind: "doc", value: { currentDb, path } });
        return { currentDb, path };
      },
      getDoc: async () => ({
        data: () => undefined,
        exists: () => false,
      }),
      getDocs: async () => ({
        docs: [],
      }),
      orderBy() {
        throw new Error("orderBy not used");
      },
      query() {
        throw new Error("query not used");
      },
      setDoc: async (ref, value) => {
        calls.push({ kind: "setDoc", value: { ref, value } });
      },
    },
    db,
  );

  await client.saveTickerCurrent({
    ...mockDisplayData.ticker,
    text: {
      en: "Updated English ticker",
      tr: "Guncel Turkce serit",
    },
  });

  assert.deepEqual(calls, [
    {
      kind: "doc",
      value: {
        currentDb: db,
        path: "ticker/current",
      },
    },
    {
      kind: "setDoc",
      value: {
        ref: {
          currentDb: db,
          path: "ticker/current",
        },
        value: {
          ...mockDisplayData.ticker,
          text: {
            en: "Updated English ticker",
            tr: "Guncel Turkce serit",
          },
        },
      },
    },
  ]);
});

test("createFirestoreReadWriteClient normalizes older ticker Firestore fields", async () => {
  const client = createFirestoreReadWriteClient(
    {
      collection() {
        throw new Error("collection not used");
      },
      deleteDoc: async () => {},
      doc(_db, path) {
        return { path };
      },
      getDoc: async () => ({
        data: () => ({
          textEn: "Legacy English",
          text: {
            tr: "Eski Turkce",
          },
          type: "message",
          updated_at: "2026-05-05T12:00:00.000Z",
        }),
        exists: () => true,
      }),
      getDocs: async () => ({
        docs: [],
      }),
      orderBy() {
        throw new Error("orderBy not used");
      },
      query() {
        throw new Error("query not used");
      },
      setDoc: async () => {},
    },
    {} as never,
  );

  const result = await client.fetchTickerCurrent();

  assert.deepEqual(result, {
    text: {
      en: "Legacy English",
      tr: "Eski Turkce",
    },
    type: "message",
    updated_at: "2026-05-05T12:00:00.000Z",
  });
});

test("createFirestoreReadWriteClient normalizes older prayer time Firestore fields safely", async () => {
  const client = createFirestoreReadWriteClient(
    {
      collection() {
        throw new Error("collection not used");
      },
      deleteDoc: async () => {},
      doc(_db, path) {
        return { path };
      },
      getDoc: async () => ({
        data: () => ({
          date: "2026-05-01",
          today: mockDisplayData.prayerTimes.today,
          tomorrow: null,
          updated_at: "2026-05-01T18:00:00Z",
        }),
        exists: () => true,
      }),
      getDocs: async () => ({
        docs: [],
      }),
      orderBy() {
        throw new Error("orderBy not used");
      },
      query() {
        throw new Error("query not used");
      },
      setDoc: async () => {},
    },
    {} as never,
  );

  const result = await client.fetchPrayerTimesCurrent();

  assert.equal(result?.manualOverride, true);
  assert.equal(result?.effectiveSource, "manual");
  assert.equal(result?.providerSource, null);
});

test("createFirestoreReadWriteClient saves prayerTimes current through prayerTimes/current", async () => {
  const calls: Array<{ kind: string; value: unknown }> = [];
  const db = { name: "lite-db" } as never;
  const client = createFirestoreReadWriteClient(
    {
      collection() {
        throw new Error("collection not used");
      },
      deleteDoc: async () => {},
      doc(currentDb, path) {
        calls.push({ kind: "doc", value: { currentDb, path } });
        return { currentDb, path };
      },
      getDoc: async () => ({
        data: () => undefined,
        exists: () => false,
      }),
      getDocs: async () => ({
        docs: [],
      }),
      orderBy() {
        throw new Error("orderBy not used");
      },
      query() {
        throw new Error("query not used");
      },
      setDoc: async (ref, value) => {
        calls.push({ kind: "setDoc", value: { ref, value } });
      },
    },
    db,
  );

  await client.savePrayerTimesCurrent({
    ...mockDisplayData.prayerTimes,
    today: {
      ...mockDisplayData.prayerTimes.today,
      fajr: "05:55",
    },
    updated_at: "2026-05-04T12:00:00.000Z",
  });

  assert.deepEqual(calls, [
    {
      kind: "doc",
      value: {
        currentDb: db,
        path: "prayerTimes/current",
      },
    },
    {
      kind: "setDoc",
      value: {
        ref: {
          currentDb: db,
          path: "prayerTimes/current",
        },
        value: {
          ...mockDisplayData.prayerTimes,
          today: {
            ...mockDisplayData.prayerTimes.today,
            fajr: "05:55",
          },
          updated_at: "2026-05-04T12:00:00.000Z",
        },
      },
    },
  ]);
});

test("createFirestoreReadWriteClient defaults missing prayer time source settings to manual and saves to settings/prayerTimes", async () => {
  const calls: Array<{ kind: string; value: unknown }> = [];
  const db = { name: "lite-db" } as never;
  const client = createFirestoreReadWriteClient(
    {
      collection() {
        throw new Error("collection not used");
      },
      deleteDoc: async () => {},
      doc(currentDb, path) {
        calls.push({ kind: "doc", value: { currentDb, path } });
        return { currentDb, path };
      },
      getDoc: async () => ({
        data: () => undefined,
        exists: () => false,
      }),
      getDocs: async () => ({
        docs: [],
      }),
      orderBy() {
        throw new Error("orderBy not used");
      },
      query() {
        throw new Error("query not used");
      },
      setDoc: async (ref, value) => {
        calls.push({ kind: "setDoc", value: { ref, value } });
      },
    },
    db,
  );

  const defaultSettings = await client.fetchPrayerTimeSettings();
  assert.deepEqual(defaultSettings, {
    cityId: undefined,
    cityName: undefined,
    source: "manual",
    updatedAt: null,
    updatedBy: undefined,
  });

  await client.savePrayerTimeSettings({
    cityId: "london-1",
    cityName: "London",
    source: "awqat-salah",
    updatedAt: "2026-05-04T12:00:00.000Z",
    updatedBy: "admin@example.com",
  });

  assert.deepEqual(calls, [
    {
      kind: "doc",
      value: {
        currentDb: db,
        path: "settings/prayerTimes",
      },
    },
    {
      kind: "doc",
      value: {
        currentDb: db,
        path: "settings/prayerTimes",
      },
    },
    {
      kind: "setDoc",
      value: {
        ref: {
          currentDb: db,
          path: "settings/prayerTimes",
        },
        value: {
          cityId: "london-1",
          cityName: "London",
          source: "awqat-salah",
          updatedAt: new Date("2026-05-04T12:00:00.000Z"),
          updatedBy: "admin@example.com",
        },
      },
    },
  ]);
});

test("createFirestoreReadWriteClient fetches awqat prayer time source settings for refresh-safe admin state", async () => {
  const client = createFirestoreReadWriteClient(
    {
      collection() {
        throw new Error("collection not used");
      },
      deleteDoc: async () => {},
      doc(_db, path) {
        return { path };
      },
      getDoc: async () => ({
        data: () => ({
          cityId: "14096",
          cityName: "LONDRA",
          source: "awqat-salah",
          updatedAt: {
            toDate() {
              return new Date("2026-07-05T00:10:00.000Z");
            },
          },
          updatedBy: "admin@example.com",
        }),
        exists: () => true,
      }),
      getDocs: async () => ({
        docs: [],
      }),
      orderBy() {
        throw new Error("orderBy not used");
      },
      query() {
        throw new Error("query not used");
      },
      setDoc: async () => {},
    },
    {} as never,
  );

  const result = await client.fetchPrayerTimeSettings();

  assert.deepEqual(result, {
    cityId: "14096",
    cityName: "LONDRA",
    source: "awqat-salah",
    updatedAt: "2026-07-05T00:10:00.000Z",
    updatedBy: "admin@example.com",
  });
});

test("createFirestoreReadWriteClient safely omits undefined fields when saving settings/prayerTimes", async () => {
  const calls: Array<{ kind: string; value: unknown }> = [];
  const db = { name: "lite-db" } as never;
  const client = createFirestoreReadWriteClient(
    {
      collection() {
        throw new Error("collection not used");
      },
      deleteDoc: async () => {},
      doc(currentDb, path) {
        calls.push({ kind: "doc", value: { currentDb, path } });
        return { currentDb, path };
      },
      getDoc: async () => ({
        data: () => undefined,
        exists: () => false,
      }),
      getDocs: async () => ({
        docs: [],
      }),
      orderBy() {
        throw new Error("orderBy not used");
      },
      query() {
        throw new Error("query not used");
      },
      setDoc: async (ref, value) => {
        calls.push({ kind: "setDoc", value: { ref, value } });
      },
    },
    db,
  );

  await client.savePrayerTimeSettings({
    source: "awqat-salah",
    updatedAt: "2026-05-04T12:00:00.000Z",
    cityId: undefined,
    cityName: undefined,
  });

  assert.deepEqual(calls, [
    {
      kind: "doc",
      value: {
        currentDb: db,
        path: "settings/prayerTimes",
      },
    },
    {
      kind: "setDoc",
      value: {
        ref: {
          currentDb: db,
          path: "settings/prayerTimes",
        },
        value: {
          source: "awqat-salah",
          updatedAt: new Date("2026-05-04T12:00:00.000Z"),
        },
      },
    },
  ]);
});

test("normalizeDonationDisplayConfig returns defaults when input is null", () => {
  const result = normalizeDonationDisplayConfig(null);
  assert.equal(result.enabled, DEFAULT_DONATION_DISPLAY_CONFIG.enabled);
  assert.equal(result.headline, DEFAULT_DONATION_DISPLAY_CONFIG.headline);
  assert.equal(result.message, DEFAULT_DONATION_DISPLAY_CONFIG.message);
  assert.equal(result.cta, DEFAULT_DONATION_DISPLAY_CONFIG.cta);
  assert.equal(result.qrLabel, DEFAULT_DONATION_DISPLAY_CONFIG.qrLabel);
  assert.equal(result.qrUrl, DEFAULT_DONATION_DISPLAY_CONFIG.qrUrl);
  assert.equal(result.backgroundImageUrl, DEFAULT_DONATION_DISPLAY_CONFIG.backgroundImageUrl);
  assert.equal(result.showQrCode, DEFAULT_DONATION_DISPLAY_CONFIG.showQrCode);
});

test("normalizeDonationDisplayConfig returns defaults when input is undefined", () => {
  const result = normalizeDonationDisplayConfig(undefined);
  assert.equal(result.enabled, DEFAULT_DONATION_DISPLAY_CONFIG.enabled);
  assert.equal(result.headline, DEFAULT_DONATION_DISPLAY_CONFIG.headline);
});

test("normalizeDonationDisplayConfig returns defaults when input is a primitive", () => {
  const result = normalizeDonationDisplayConfig("not an object");
  assert.equal(result.enabled, DEFAULT_DONATION_DISPLAY_CONFIG.enabled);
  assert.equal(result.headline, DEFAULT_DONATION_DISPLAY_CONFIG.headline);
});

test("normalizeDonationDisplayConfig returns defaults when input is an empty object", () => {
  const result = normalizeDonationDisplayConfig({});
  assert.equal(result.enabled, DEFAULT_DONATION_DISPLAY_CONFIG.enabled);
  assert.equal(result.headline, DEFAULT_DONATION_DISPLAY_CONFIG.headline);
  assert.equal(result.message, DEFAULT_DONATION_DISPLAY_CONFIG.message);
  assert.equal(result.cta, DEFAULT_DONATION_DISPLAY_CONFIG.cta);
  assert.equal(result.qrLabel, DEFAULT_DONATION_DISPLAY_CONFIG.qrLabel);
  assert.equal(result.qrUrl, DEFAULT_DONATION_DISPLAY_CONFIG.qrUrl);
  assert.equal(result.backgroundImageUrl, DEFAULT_DONATION_DISPLAY_CONFIG.backgroundImageUrl);
  assert.equal(result.showQrCode, DEFAULT_DONATION_DISPLAY_CONFIG.showQrCode);
});

test("normalizeDonationDisplayConfig uses provided values when valid", () => {
  const input = {
    enabled: false,
    headline: "Custom Headline",
    message: "Custom message",
    cta: "Custom CTA",
    qrLabel: "Custom QR label",
    qrUrl: "https://example.com/custom",
    backgroundImageUrl: "https://example.com/bg.jpg",
  };
  const result = normalizeDonationDisplayConfig(input);
  assert.equal(result.enabled, false);
  assert.equal(result.headline, "Custom Headline");
  assert.equal(result.message, "Custom message");
  assert.equal(result.cta, "Custom CTA");
  assert.equal(result.qrLabel, "Custom QR label");
  assert.equal(result.qrUrl, "https://example.com/custom");
  assert.equal(result.backgroundImageUrl, "https://example.com/bg.jpg");
});

test("normalizeDonationDisplayConfig falls back for missing optional fields", () => {
  const input = {
    enabled: true,
    headline: "Only Headline",
  };
  const result = normalizeDonationDisplayConfig(input);
  assert.equal(result.enabled, true);
  assert.equal(result.headline, "Only Headline");
  assert.equal(result.message, DEFAULT_DONATION_DISPLAY_CONFIG.message);
  assert.equal(result.cta, DEFAULT_DONATION_DISPLAY_CONFIG.cta);
  assert.equal(result.qrLabel, DEFAULT_DONATION_DISPLAY_CONFIG.qrLabel);
  assert.equal(result.qrUrl, DEFAULT_DONATION_DISPLAY_CONFIG.qrUrl);
  assert.equal(result.backgroundImageUrl, DEFAULT_DONATION_DISPLAY_CONFIG.backgroundImageUrl);
  assert.equal(result.showQrCode, DEFAULT_DONATION_DISPLAY_CONFIG.showQrCode);
});

test("normalizeDonationDisplayConfig uses fallback for non-boolean enabled", () => {
  assert.equal(normalizeDonationDisplayConfig({ enabled: "yes" as unknown }).enabled, true);
  assert.equal(normalizeDonationDisplayConfig({ enabled: 1 as unknown }).enabled, true);
  assert.equal(normalizeDonationDisplayConfig({ enabled: null as unknown }).enabled, true);
  assert.equal(normalizeDonationDisplayConfig({ enabled: undefined as unknown }).enabled, true);
});

test("normalizeDonationDisplayConfig uses fallback for empty string headline", () => {
  const result = normalizeDonationDisplayConfig({ headline: "   " });
  assert.equal(result.headline, DEFAULT_DONATION_DISPLAY_CONFIG.headline);
});

test("normalizeDonationDisplayConfig preserves empty string backgroundImageUrl", () => {
  const result = normalizeDonationDisplayConfig({ backgroundImageUrl: "" });
  assert.equal(result.backgroundImageUrl, "");
});

test("createFirestoreReadWriteClient fetches donation display config through the read API", async () => {
  const calls: string[] = [];
  const db = { name: "lite-db" } as never;
  const client = createFirestoreReadWriteClient(
    {
      collection() {
        throw new Error("collection not used");
      },
      deleteDoc: async () => {},
      doc(currentDb, path) {
        calls.push(`doc:${String((currentDb as { name: string }).name)}:${path}`);
        return { currentDb, path };
      },
      getDoc: async () => ({
        data: () => ({
          enabled: false,
          headline: "Test Headline",
          message: "Test Message",
          cta: "Test CTA",
          qrLabel: "Test QR Label",
          qrUrl: "https://test.com",
          backgroundImageUrl: "",
        }),
        exists: () => true,
      }),
      getDocs: async () => ({ docs: [] }),
      orderBy() {
        throw new Error("orderBy not used");
      },
      query() {
        throw new Error("query not used");
      },
      setDoc: async () => {
        throw new Error("setDoc not used");
      },
    },
    db,
  );

  const result = await client.fetchDonationDisplayConfig();
  assert.deepEqual(calls, ["doc:lite-db:settings/donationDisplay"]);
  assert.equal(result.enabled, false);
  assert.equal(result.headline, "Test Headline");
  assert.equal(result.message, "Test Message");
});

test("createFirestoreReadWriteClient fetchDonationDisplayConfig returns defaults when doc does not exist", async () => {
  const db = { name: "lite-db" } as never;
  const client = createFirestoreReadWriteClient(
    {
      collection() {
        throw new Error("collection not used");
      },
      deleteDoc: async () => {},
      doc() {
        return { path: "settings/donationDisplay" };
      },
      getDoc: async () => ({
        data: () => undefined,
        exists: () => false,
      }),
      getDocs: async () => ({ docs: [] }),
      orderBy() {
        throw new Error("orderBy not used");
      },
      query() {
        throw new Error("query not used");
      },
      setDoc: async () => {
        throw new Error("setDoc not used");
      },
    },
    db,
  );

  const result = await client.fetchDonationDisplayConfig();
  assert.equal(result.enabled, true);
  assert.equal(result.headline, "DONATE HERE TODAY");
});

test("createFirestoreReadWriteClient saveDonationDisplayConfig writes to the correct path", async () => {
  const calls: Array<{ kind: string; value: unknown }> = [];
  const db = { name: "lite-db" } as never;
  const client = createFirestoreReadWriteClient(
    {
      collection() {
        throw new Error("collection not used");
      },
      deleteDoc: async () => {},
      doc(currentDb, path) {
        calls.push({ kind: "doc", value: { currentDb, path } });
        return { currentDb, path };
      },
      getDoc: async () => ({
        data: () => undefined,
        exists: () => false,
      }),
      getDocs: async () => ({ docs: [] }),
      orderBy() {
        throw new Error("orderBy not used");
      },
      query() {
        throw new Error("query not used");
      },
      setDoc: async (ref, config) => {
        calls.push({ kind: "setDoc", value: { ref, config } });
      },
    },
    db,
  );

  await client.saveDonationDisplayConfig({
    enabled: true,
    headline: "Save Test",
    message: "Save Message",
    cta: "Save CTA",
    qrLabel: "Save QR",
    qrUrl: "https://save.com",
    backgroundImageUrl: "",
  });

  assert.deepEqual(calls, [
    {
      kind: "doc",
      value: {
        currentDb: db,
        path: "settings/donationDisplay",
      },
    },
    {
      kind: "setDoc",
      value: {
        ref: { currentDb: db, path: "settings/donationDisplay" },
        config: {
          enabled: true,
          headline: "Save Test",
          message: "Save Message",
          cta: "Save CTA",
          qrLabel: "Save QR",
          qrUrl: "https://save.com",
          backgroundImageUrl: "",
        },
      },
    },
  ]);
});

test("saveDonationDisplayConfig does not write undefined values to Firestore", async () => {
  const calls: Array<{ kind: string; value: unknown }> = [];
  const db = { name: "lite-db" } as never;
  const client = createFirestoreReadWriteClient(
    {
      collection() {
        throw new Error("collection not used");
      },
      deleteDoc: async () => {},
      doc(currentDb, path) {
        return { currentDb, path };
      },
      getDoc: async () => ({
        data: () => undefined,
        exists: () => false,
      }),
      getDocs: async () => ({ docs: [] }),
      orderBy() {
        throw new Error("orderBy not used");
      },
      query() {
        throw new Error("query not used");
      },
      setDoc: async (ref, config) => {
        calls.push({ kind: "setDoc", value: { ref, config } });
      },
    },
    db,
  );

  await client.saveDonationDisplayConfig({
    enabled: true,
    headline: "Test",
    message: "",
    cta: "CTA",
    qrLabel: "Label",
    qrUrl: "https://url.com",
    backgroundImageUrl: "",
  });

  const setDocCall = calls.find((c) => c.kind === "setDoc");
  const config = setDocCall?.value.config as Record<string, unknown>;
  for (const [key, value] of Object.entries(config)) {
    assert.ok(
      value !== undefined,
      `Expected ${key} to not be undefined, but got ${JSON.stringify(value)}`,
    );
  }
});

test("normalizeDonationDisplayConfig uses new fields when provided", () => {
  const input = {
    enabled: true,
    titleLine1: "SUPPORT",
    titleLine2: "OUR MASJID",
    subtitle: "Your help matters",
    mainMessage: "WE NEED YOU",
    ctaText: "DONATE NOW",
    qrUrl: "https://example.com/donate",
    impactText: "£500 raised",
    showImpactText: true,
    motionEnabled: false,
  };
  const result = normalizeDonationDisplayConfig(input);
  assert.equal(result.titleLine1, "SUPPORT");
  assert.equal(result.titleLine2, "OUR MASJID");
  assert.equal(result.subtitle, "Your help matters");
  assert.equal(result.mainMessage, "WE NEED YOU");
  assert.equal(result.ctaText, "DONATE NOW");
  assert.equal(result.impactText, "£500 raised");
  assert.equal(result.showImpactText, true);
  assert.equal(result.motionEnabled, false);
});

test("normalizeDonationDisplayConfig falls back for missing new fields", () => {
  const result = normalizeDonationDisplayConfig({ enabled: true });
  assert.equal(result.titleLine1, DEFAULT_DONATION_DISPLAY_CONFIG.titleLine1);
  assert.equal(result.titleLine2, DEFAULT_DONATION_DISPLAY_CONFIG.titleLine2);
  assert.equal(result.subtitle, DEFAULT_DONATION_DISPLAY_CONFIG.subtitle);
  assert.equal(result.mainMessage, DEFAULT_DONATION_DISPLAY_CONFIG.mainMessage);
  assert.equal(result.ctaText, DEFAULT_DONATION_DISPLAY_CONFIG.ctaText);
  assert.equal(result.showImpactText, DEFAULT_DONATION_DISPLAY_CONFIG.showImpactText);
  assert.equal(result.showQrCode, DEFAULT_DONATION_DISPLAY_CONFIG.showQrCode);
  assert.equal(result.motionEnabled, DEFAULT_DONATION_DISPLAY_CONFIG.motionEnabled);
});

test("normalizeDonationDisplayConfig defaults showImpactText to false when missing", () => {
  const result = normalizeDonationDisplayConfig({ enabled: true, showImpactText: undefined as unknown });
  assert.equal(result.showImpactText, false);
});

test("normalizeDonationDisplayConfig defaults motionEnabled to true when missing", () => {
  const result = normalizeDonationDisplayConfig({ enabled: true, motionEnabled: undefined as unknown });
  assert.equal(result.motionEnabled, true);
});

test("normalizeDonationDisplayConfig defaults showQrCode to true when missing", () => {
  const result = normalizeDonationDisplayConfig({ enabled: true, showQrCode: undefined as unknown });
  assert.equal(result.showQrCode, true);
});

test("normalizeDonationDisplayConfig respects showQrCode false when provided", () => {
  const result = normalizeDonationDisplayConfig({ enabled: true, showQrCode: false });
  assert.equal(result.showQrCode, false);
});
