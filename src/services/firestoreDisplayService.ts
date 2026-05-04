import {
  collection as collectionRealtime,
  doc as docRealtime,
  getFirestore as getRealtimeFirestore,
  onSnapshot,
  orderBy as orderByRealtime,
  query as queryRealtime,
  type Firestore as RealtimeFirestore,
  type Unsubscribe,
} from "firebase/firestore";
import {
  collection as collectionReadWrite,
  deleteDoc as deleteDocReadWrite,
  doc as docReadWrite,
  getDoc as getDocReadWrite,
  getDocs as getDocsReadWrite,
  getFirestore as getReadWriteFirestore,
  orderBy as orderByReadWrite,
  query as queryReadWrite,
  setDoc as setDocReadWrite,
  type Firestore as ReadWriteFirestore,
} from "firebase/firestore/lite";
import type {
  Announcement,
  DailyContentCurrent,
  DisplaySettings,
  DonationCurrent,
  PrayerTimeSourceSettings,
  PrayerTimesCurrent,
  TickerCurrent,
} from "../types/display";
import {
  FIRESTORE_PATHS,
  getAnnouncementDocumentPath,
} from "../shared/firestorePaths.ts";
import { firebaseApp } from "./firebaseCore.ts";
import { normalizePrayerTimesCurrent } from "../utils/prayerTimeDocument.ts";
import { normalizePrayerTimeSourceSettings } from "../utils/prayerTimeSourceSettings.ts";

export { FIRESTORE_PATHS, getAnnouncementDocumentPath } from "../shared/firestorePaths.ts";

const firestoreReadWriteDb = firebaseApp ? getReadWriteFirestore(firebaseApp) : null;
const firestoreRealtimeDb = firebaseApp ? getRealtimeFirestore(firebaseApp) : null;

const firestoreSetupErrorMessage =
  "Firebase Firestore is not configured. Add the required Vite Firebase environment variables before using the Firestore display service.";

type ReadWriteSnapshot = {
  data(): unknown;
  exists(): boolean;
};

type ReadWriteQuerySnapshot = {
  docs: Array<{
    data(): unknown;
  }>;
};

export interface FirestoreReadWriteApi<
  TCollectionRef = unknown,
  TDocumentRef = unknown,
  TOrderClause = unknown,
  TQueryRef = unknown,
> {
  collection: (db: ReadWriteFirestore, path: string) => TCollectionRef;
  deleteDoc: (reference: TDocumentRef) => Promise<void>;
  doc: (db: ReadWriteFirestore, path: string) => TDocumentRef;
  getDoc: (reference: TDocumentRef) => Promise<ReadWriteSnapshot>;
  getDocs: (reference: TQueryRef) => Promise<ReadWriteQuerySnapshot>;
  orderBy: (field: string, direction: "asc" | "desc") => TOrderClause;
  query: (collectionRef: TCollectionRef, orderClause: TOrderClause) => TQueryRef;
  setDoc: (reference: TDocumentRef, value: unknown) => Promise<void>;
}

const defaultReadWriteApi = {
  collection: collectionReadWrite,
  deleteDoc: deleteDocReadWrite,
  doc: docReadWrite,
  getDoc: getDocReadWrite,
  getDocs: getDocsReadWrite,
  orderBy: orderByReadWrite,
  query: queryReadWrite,
  setDoc: setDocReadWrite,
};

function isDevelopmentRuntime() {
  return typeof import.meta.env === "object" && import.meta.env?.DEV === true;
}

function logFirestoreDebug(event: string, details?: unknown) {
  if (!isDevelopmentRuntime()) {
    return;
  }

  console.debug(`[firestore] ${event}`, details);
}

function logFirestoreError(event: string, error: unknown) {
  if (!isDevelopmentRuntime()) {
    return;
  }

  console.error(`[firestore] ${event}`, error);
}

export function getFirestoreServiceSetupError(db: ReadWriteFirestore | RealtimeFirestore | null) {
  return db ? null : firestoreSetupErrorMessage;
}

function requireReadWriteDb(db: ReadWriteFirestore | null = firestoreReadWriteDb) {
  if (!db) {
    throw new Error(getFirestoreServiceSetupError(db) ?? firestoreSetupErrorMessage);
  }

  return db;
}

function requireRealtimeDb(db: RealtimeFirestore | null = firestoreRealtimeDb) {
  if (!db) {
    throw new Error(getFirestoreServiceSetupError(db) ?? firestoreSetupErrorMessage);
  }

  return db;
}

function readSnapshotData<T>(snapshot: ReadWriteSnapshot) {
  return snapshot.exists() ? (snapshot.data() as T | undefined) ?? null : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function pickFirstNonEmptyString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return "";
}

function normalizeDailyContentCurrent(value: unknown): DailyContentCurrent | null {
  if (!isRecord(value)) {
    return null;
  }

  const translation = isRecord(value.translation) ? value.translation : {};
  const rawType = readString(value.type);

  return {
    arabic: readString(value.arabic),
    source: pickFirstNonEmptyString(value.source, value.reference),
    translation: {
      en: pickFirstNonEmptyString(
        translation.en,
        translation.english,
        value.translationEn,
        value.englishTranslation,
      ),
      tr: pickFirstNonEmptyString(
        translation.tr,
        translation.turkish,
        value.translationTr,
        value.turkishTranslation,
      ),
    },
    type: rawType === "hadith" ? "hadith" : "ayah",
    updated_at: readString(value.updated_at),
  };
}

function normalizeTickerCurrent(value: unknown): TickerCurrent | null {
  if (!isRecord(value)) {
    return null;
  }

  const text = isRecord(value.text) ? value.text : {};
  const rawType = readString(value.type);

  return {
    text: {
      en: pickFirstNonEmptyString(text.en, value.textEn),
      tr: pickFirstNonEmptyString(text.tr, value.textTr),
    },
    type: rawType === "message" ? "message" : "hadith",
    updated_at: readString(value.updated_at),
  };
}

async function executeRead<T>(label: string, operation: () => Promise<T>) {
  logFirestoreDebug(`${label}:start`);

  try {
    const result = await operation();
    logFirestoreDebug(`${label}:success`, result);
    return result;
  } catch (error) {
    logFirestoreError(`${label}:error`, error);
    throw error;
  }
}

async function executeWrite(label: string, payload: unknown, operation: () => Promise<void>) {
  logFirestoreDebug(`${label}:start`, payload);

  try {
    await operation();
    logFirestoreDebug(`${label}:success`, payload);
  } catch (error) {
    logFirestoreError(`${label}:error`, error);
    throw error;
  }
}

export function getSettingsDisplayRef(db?: ReadWriteFirestore) {
  return defaultReadWriteApi.doc(requireReadWriteDb(db), FIRESTORE_PATHS.settingsDisplay);
}

export function getDonationCurrentRef(db?: ReadWriteFirestore) {
  return defaultReadWriteApi.doc(requireReadWriteDb(db), FIRESTORE_PATHS.donationCurrent);
}

export function getPrayerTimeSettingsRef(db?: ReadWriteFirestore) {
  return defaultReadWriteApi.doc(requireReadWriteDb(db), FIRESTORE_PATHS.settingsPrayerTimes);
}

export function getPrayerTimesCurrentRef(db?: ReadWriteFirestore) {
  return defaultReadWriteApi.doc(requireReadWriteDb(db), FIRESTORE_PATHS.prayerTimesCurrent);
}

export function getDailyContentCurrentRef(db?: ReadWriteFirestore) {
  return defaultReadWriteApi.doc(requireReadWriteDb(db), FIRESTORE_PATHS.dailyContentCurrent);
}

export function getTickerCurrentRef(db?: ReadWriteFirestore) {
  return defaultReadWriteApi.doc(requireReadWriteDb(db), FIRESTORE_PATHS.tickerCurrent);
}

export function getAnnouncementsCollectionRef(db?: ReadWriteFirestore) {
  return defaultReadWriteApi.collection(requireReadWriteDb(db), FIRESTORE_PATHS.announcementsCollection);
}

export function getAnnouncementDocumentRef(announcementId: string, db?: ReadWriteFirestore) {
  return defaultReadWriteApi.doc(requireReadWriteDb(db), getAnnouncementDocumentPath(announcementId));
}

function getRealtimeSettingsDisplayRef(db?: RealtimeFirestore) {
  return docRealtime(requireRealtimeDb(db), FIRESTORE_PATHS.settingsDisplay);
}

function getRealtimeDonationCurrentRef(db?: RealtimeFirestore) {
  return docRealtime(requireRealtimeDb(db), FIRESTORE_PATHS.donationCurrent);
}

function getRealtimePrayerTimeSettingsRef(db?: RealtimeFirestore) {
  return docRealtime(requireRealtimeDb(db), FIRESTORE_PATHS.settingsPrayerTimes);
}

function getRealtimePrayerTimesCurrentRef(db?: RealtimeFirestore) {
  return docRealtime(requireRealtimeDb(db), FIRESTORE_PATHS.prayerTimesCurrent);
}

function getRealtimeDailyContentCurrentRef(db?: RealtimeFirestore) {
  return docRealtime(requireRealtimeDb(db), FIRESTORE_PATHS.dailyContentCurrent);
}

function getRealtimeTickerCurrentRef(db?: RealtimeFirestore) {
  return docRealtime(requireRealtimeDb(db), FIRESTORE_PATHS.tickerCurrent);
}

function getRealtimeAnnouncementsCollectionRef(db?: RealtimeFirestore) {
  return collectionRealtime(requireRealtimeDb(db), FIRESTORE_PATHS.announcementsCollection);
}

export function createFirestoreReadWriteClient<
  TCollectionRef,
  TDocumentRef,
  TOrderClause,
  TQueryRef,
>(
  api: FirestoreReadWriteApi<TCollectionRef, TDocumentRef, TOrderClause, TQueryRef>,
  db: ReadWriteFirestore | null,
) {
  function requireDb() {
    if (!db) {
      throw new Error(getFirestoreServiceSetupError(db) ?? firestoreSetupErrorMessage);
    }

    return db;
  }

  function getSettingsRef() {
    return api.doc(requireDb(), FIRESTORE_PATHS.settingsDisplay);
  }

  function getDonationRef() {
    return api.doc(requireDb(), FIRESTORE_PATHS.donationCurrent);
  }

  function getPrayerTimeSettingsRef() {
    return api.doc(requireDb(), FIRESTORE_PATHS.settingsPrayerTimes);
  }

  function getPrayerTimesRef() {
    return api.doc(requireDb(), FIRESTORE_PATHS.prayerTimesCurrent);
  }

  function getDailyContentRef() {
    return api.doc(requireDb(), FIRESTORE_PATHS.dailyContentCurrent);
  }

  function getTickerRef() {
    return api.doc(requireDb(), FIRESTORE_PATHS.tickerCurrent);
  }

  function getAnnouncementsRef() {
    return api.collection(requireDb(), FIRESTORE_PATHS.announcementsCollection);
  }

  function getAnnouncementRef(announcementId: string) {
    return api.doc(requireDb(), getAnnouncementDocumentPath(announcementId));
  }

  return {
    async fetchDisplaySettings() {
      return executeRead<DisplaySettings | null>("fetchDisplaySettings", async () => {
        const snapshot = await api.getDoc(getSettingsRef());
        return readSnapshotData<DisplaySettings>(snapshot);
      });
    },
    async fetchDonationCurrent() {
      return executeRead<DonationCurrent | null>("fetchDonationCurrent", async () => {
        const snapshot = await api.getDoc(getDonationRef());
        return readSnapshotData<DonationCurrent>(snapshot);
      });
    },
    async fetchPrayerTimeSettings() {
      return executeRead<PrayerTimeSourceSettings>("fetchPrayerTimeSettings", async () => {
        const snapshot = await api.getDoc(getPrayerTimeSettingsRef());
        return normalizePrayerTimeSourceSettings(readSnapshotData<unknown>(snapshot));
      });
    },
    async fetchPrayerTimesCurrent() {
      return executeRead<PrayerTimesCurrent | null>("fetchPrayerTimesCurrent", async () => {
        const snapshot = await api.getDoc(getPrayerTimesRef());
        const value = readSnapshotData<unknown>(snapshot);
        return value == null ? null : normalizePrayerTimesCurrent(value);
      });
    },
    async fetchDailyContentCurrent() {
      return executeRead<DailyContentCurrent | null>("fetchDailyContentCurrent", async () => {
        const snapshot = await api.getDoc(getDailyContentRef());
        return normalizeDailyContentCurrent(readSnapshotData<unknown>(snapshot));
      });
    },
    async fetchTickerCurrent() {
      return executeRead<TickerCurrent | null>("fetchTickerCurrent", async () => {
        const snapshot = await api.getDoc(getTickerRef());
        return normalizeTickerCurrent(readSnapshotData<unknown>(snapshot));
      });
    },
    async fetchAnnouncements() {
      return executeRead<Announcement[]>("fetchAnnouncements", async () => {
        const snapshot = await api.getDocs(
          api.query(getAnnouncementsRef(), api.orderBy("created_at", "asc")),
        );

        return snapshot.docs.map((documentSnapshot) => documentSnapshot.data() as Announcement);
      });
    },
    async saveDisplaySettings(settings: DisplaySettings) {
      await executeWrite("saveDisplaySettings", settings, () => api.setDoc(getSettingsRef(), settings));
    },
    async saveDonationCurrent(donation: DonationCurrent) {
      await executeWrite("saveDonationCurrent", donation, () => api.setDoc(getDonationRef(), donation));
    },
    async savePrayerTimeSettings(settings: PrayerTimeSourceSettings) {
      const firestoreValue: Record<string, unknown> = {
        source: settings.source,
        updatedAt: settings.updatedAt ? new Date(settings.updatedAt) : new Date(),
      };

      for (const [key, value] of Object.entries(settings)) {
        if (value !== undefined && key !== "source" && key !== "updatedAt") {
          firestoreValue[key] = value;
        }
      }

      await executeWrite("savePrayerTimeSettings", firestoreValue, () =>
        api.setDoc(getPrayerTimeSettingsRef(), firestoreValue),
      );
    },
    async savePrayerTimesCurrent(prayerTimes: PrayerTimesCurrent) {
      await executeWrite("savePrayerTimesCurrent", prayerTimes, () =>
        api.setDoc(getPrayerTimesRef(), prayerTimes),
      );
    },
    async saveDailyContentCurrent(dailyContent: DailyContentCurrent) {
      await executeWrite("saveDailyContentCurrent", dailyContent, () =>
        api.setDoc(getDailyContentRef(), dailyContent),
      );
    },
    async saveTickerCurrent(ticker: TickerCurrent) {
      await executeWrite("saveTickerCurrent", ticker, () => api.setDoc(getTickerRef(), ticker));
    },
    async saveAnnouncement(announcement: Announcement) {
      await executeWrite("saveAnnouncement", announcement, () =>
        api.setDoc(getAnnouncementRef(announcement.id), announcement),
      );
    },
    async deleteAnnouncement(announcementId: string) {
      await executeWrite("deleteAnnouncement", { announcementId }, () =>
        api.deleteDoc(getAnnouncementRef(announcementId)),
      );
    },
  };
}

const defaultReadWriteClient = createFirestoreReadWriteClient(
  defaultReadWriteApi,
  firestoreReadWriteDb,
);

export function fetchDisplaySettings() {
  return defaultReadWriteClient.fetchDisplaySettings();
}

export function fetchDonationCurrent() {
  return defaultReadWriteClient.fetchDonationCurrent();
}

export function fetchPrayerTimeSettings() {
  return defaultReadWriteClient.fetchPrayerTimeSettings();
}

export function fetchPrayerTimesCurrent() {
  return defaultReadWriteClient.fetchPrayerTimesCurrent();
}

export function fetchDailyContentCurrent() {
  return defaultReadWriteClient.fetchDailyContentCurrent();
}

export function fetchAnnouncements() {
  return defaultReadWriteClient.fetchAnnouncements();
}

export function saveDisplaySettings(settings: DisplaySettings) {
  return defaultReadWriteClient.saveDisplaySettings(settings);
}

export function saveDonationCurrent(donation: DonationCurrent) {
  return defaultReadWriteClient.saveDonationCurrent(donation);
}

export function savePrayerTimeSettings(settings: PrayerTimeSourceSettings) {
  return defaultReadWriteClient.savePrayerTimeSettings(settings);
}

export function savePrayerTimesCurrent(prayerTimes: PrayerTimesCurrent) {
  return defaultReadWriteClient.savePrayerTimesCurrent(prayerTimes);
}

export function saveDailyContentCurrent(dailyContent: DailyContentCurrent) {
  return defaultReadWriteClient.saveDailyContentCurrent(dailyContent);
}

export function fetchTickerCurrent() {
  return defaultReadWriteClient.fetchTickerCurrent();
}

export function saveTickerCurrent(ticker: TickerCurrent) {
  return defaultReadWriteClient.saveTickerCurrent(ticker);
}

export function saveAnnouncement(announcement: Announcement) {
  return defaultReadWriteClient.saveAnnouncement(announcement);
}

export function deleteAnnouncement(announcementId: string) {
  return defaultReadWriteClient.deleteAnnouncement(announcementId);
}

function subscribeSingleton<T>(
  subscribe: (onValue: (value: T | null) => void, onError?: (error: Error) => void) => Unsubscribe,
  callback: (value: T | null) => void,
  onError?: (error: Error) => void,
) {
  return subscribe(callback, onError);
}

export function subscribeToDisplaySettings(
  callback: (value: DisplaySettings | null) => void,
  onError?: (error: Error) => void,
  db?: RealtimeFirestore,
) {
  return subscribeSingleton(
    (onValue, handleError) =>
      onSnapshot(
        getRealtimeSettingsDisplayRef(db),
        (snapshot) => onValue(snapshot.exists() ? (snapshot.data() as DisplaySettings) : null),
        handleError,
      ),
    callback,
    onError,
  );
}

export function subscribeToDonationCurrent(
  callback: (value: DonationCurrent | null) => void,
  onError?: (error: Error) => void,
  db?: RealtimeFirestore,
) {
  return subscribeSingleton(
    (onValue, handleError) =>
      onSnapshot(
        getRealtimeDonationCurrentRef(db),
        (snapshot) => onValue(snapshot.exists() ? (snapshot.data() as DonationCurrent) : null),
        handleError,
      ),
    callback,
    onError,
  );
}

export function subscribeToPrayerTimesCurrent(
  callback: (value: PrayerTimesCurrent | null) => void,
  onError?: (error: Error) => void,
  db?: RealtimeFirestore,
) {
  return subscribeSingleton(
    (onValue, handleError) =>
      onSnapshot(
        getRealtimePrayerTimesCurrentRef(db),
        (snapshot) => {
          if (!snapshot.exists()) {
            onValue(null);
            return;
          }

          onValue(normalizePrayerTimesCurrent(snapshot.data()));
        },
        handleError,
      ),
    callback,
    onError,
  );
}

export function subscribeToPrayerTimeSettings(
  callback: (value: PrayerTimeSourceSettings) => void,
  onError?: (error: Error) => void,
  db?: RealtimeFirestore,
) {
  return subscribeSingleton<PrayerTimeSourceSettings>(
    (onValue, handleError) =>
      onSnapshot(
        getRealtimePrayerTimeSettingsRef(db),
        (snapshot) => onValue(normalizePrayerTimeSourceSettings(snapshot.exists() ? snapshot.data() : null)),
        handleError,
      ),
    (value) => callback(value ?? normalizePrayerTimeSourceSettings(null)),
    onError,
  );
}

export function subscribeToDailyContentCurrent(
  callback: (value: DailyContentCurrent | null) => void,
  onError?: (error: Error) => void,
  db?: RealtimeFirestore,
) {
  return subscribeSingleton(
    (onValue, handleError) =>
      onSnapshot(
        getRealtimeDailyContentCurrentRef(db),
        (snapshot) => onValue(normalizeDailyContentCurrent(snapshot.exists() ? snapshot.data() : null)),
        handleError,
      ),
    callback,
    onError,
  );
}

export function subscribeToTickerCurrent(
  callback: (value: TickerCurrent | null) => void,
  onError?: (error: Error) => void,
  db?: RealtimeFirestore,
) {
  return subscribeSingleton(
    (onValue, handleError) =>
      onSnapshot(
        getRealtimeTickerCurrentRef(db),
        (snapshot) => onValue(normalizeTickerCurrent(snapshot.exists() ? snapshot.data() : null)),
        handleError,
      ),
    callback,
    onError,
  );
}

export function subscribeToAnnouncements(
  callback: (value: Announcement[]) => void,
  onError?: (error: Error) => void,
  db?: RealtimeFirestore,
) {
  return onSnapshot(
    queryRealtime(
      getRealtimeAnnouncementsCollectionRef(db),
      orderByRealtime("created_at", "asc"),
    ),
    (snapshot) => {
      callback(snapshot.docs.map((documentSnapshot) => documentSnapshot.data() as Announcement));
    },
    onError,
  );
}
