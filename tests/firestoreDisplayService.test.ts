import test from "node:test";
import assert from "node:assert/strict";

import {
  FIRESTORE_PATHS,
  createFirestoreReadWriteClient,
  getAnnouncementDocumentPath,
  getFirestoreServiceSetupError,
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
