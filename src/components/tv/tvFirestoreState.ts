import type {
  Announcement,
  DailyContentCurrent,
  DisplayData,
  DisplaySettings,
  DonationCurrent,
  PrayerTimesCurrent,
  TickerCurrent,
} from "../../types/display.ts";

export interface TvFirestoreBootstrap {
  announcements: Announcement[] | null;
  dailyContent: DailyContentCurrent | null;
  donation: DonationCurrent | null;
  prayerTimes: PrayerTimesCurrent | null;
  settings: DisplaySettings | null;
  ticker: TickerCurrent | null;
}

export interface TvDisplaySyncApi {
  subscribeToAnnouncements: (
    callback: (value: Announcement[]) => void,
    onError?: (error: Error) => void,
  ) => () => void;
  subscribeToDailyContentCurrent: (
    callback: (value: DailyContentCurrent | null) => void,
    onError?: (error: Error) => void,
  ) => () => void;
  subscribeToDisplaySettings: (
    callback: (value: DisplaySettings | null) => void,
    onError?: (error: Error) => void,
  ) => () => void;
  subscribeToDonationCurrent: (
    callback: (value: DonationCurrent | null) => void,
    onError?: (error: Error) => void,
  ) => () => void;
  subscribeToPrayerTimesCurrent: (
    callback: (value: PrayerTimesCurrent | null) => void,
    onError?: (error: Error) => void,
  ) => () => void;
  subscribeToTickerCurrent: (
    callback: (value: TickerCurrent | null) => void,
    onError?: (error: Error) => void,
  ) => () => void;
}

interface StartTvDisplaySyncOptions {
  api: TvDisplaySyncApi;
  fallback: DisplayData;
  isDevelopment?: boolean;
  logError?: (section: keyof TvFirestoreBootstrap, error: Error) => void;
  onData: (data: DisplayData) => void;
  scheduleRetry?: (retry: () => void) => () => void;
}

function preferNonEmptyString(value: string, fallback: string) {
  return value.trim().length > 0 ? value : fallback;
}

function mergeDailyContent(
  current: DailyContentCurrent | null,
  fallback: DailyContentCurrent,
): DailyContentCurrent {
  if (!current) {
    return fallback;
  }

  return {
    arabic: preferNonEmptyString(current.arabic, fallback.arabic),
    source: preferNonEmptyString(current.source, fallback.source),
    translation: {
      en: preferNonEmptyString(current.translation.en, fallback.translation.en),
      tr: preferNonEmptyString(current.translation.tr, fallback.translation.tr),
    },
    type: current.type,
    updated_at: preferNonEmptyString(current.updated_at, fallback.updated_at),
  };
}

function mergeTicker(current: TickerCurrent | null, fallback: TickerCurrent): TickerCurrent {
  if (!current) {
    return fallback;
  }

  return {
    text: {
      en: preferNonEmptyString(current.text.en, fallback.text.en),
      tr: preferNonEmptyString(current.text.tr, fallback.text.tr),
    },
    type: current.type,
    updated_at: preferNonEmptyString(current.updated_at, fallback.updated_at),
  };
}

export function resolveTvDisplayData(
  bootstrap: TvFirestoreBootstrap,
  fallback: DisplayData,
): DisplayData {
  return {
    announcements: bootstrap.announcements ?? fallback.announcements,
    dailyContent: mergeDailyContent(bootstrap.dailyContent, fallback.dailyContent),
    donation: bootstrap.donation ?? fallback.donation,
    prayerTimes: bootstrap.prayerTimes ?? fallback.prayerTimes,
    settings: bootstrap.settings ?? fallback.settings,
    ticker: mergeTicker(bootstrap.ticker, fallback.ticker),
  };
}

export function startTvDisplaySync({
  api,
  fallback,
  isDevelopment = false,
  logError,
  onData,
  scheduleRetry = (retry) => {
    const timeoutId = globalThis.setTimeout(retry, 1_000);
    return () => {
      globalThis.clearTimeout(timeoutId);
    };
  },
}: StartTvDisplaySyncOptions) {
  const bootstrap: TvFirestoreBootstrap = {
    announcements: null,
    dailyContent: null,
    donation: null,
    prayerTimes: null,
    settings: null,
    ticker: null,
  };

  function emit() {
    onData(resolveTvDisplayData(bootstrap, fallback));
  }

  function handleSectionValue<K extends keyof TvFirestoreBootstrap>(
    section: K,
    value: TvFirestoreBootstrap[K],
  ) {
    bootstrap[section] = value;
    emit();
  }

  function handleSectionError(section: keyof TvFirestoreBootstrap, error: Error) {
    bootstrap[section] = null;

    if (isDevelopment) {
      logError?.(section, error);
    }

    emit();
  }

  type SectionName = keyof TvFirestoreBootstrap;
  type SectionSubscribeFactory = (retrySubscription: () => void) => () => void;
  type RetryCancelMap = Partial<Record<SectionName, () => void>>;
  type UnsubscribeMap = Partial<Record<SectionName, () => void>>;

  const retryCancels: RetryCancelMap = {};
  const unsubscribeMap: UnsubscribeMap = {};
  let isStopped = false;

  function cancelRetry(section: SectionName) {
    retryCancels[section]?.();
    delete retryCancels[section];
  }

  function replaceSubscription(section: SectionName, unsubscribe: () => void) {
    unsubscribeMap[section]?.();
    unsubscribeMap[section] = unsubscribe;
  }

  function scheduleSectionRetry(section: SectionName, retrySubscription: () => void) {
    cancelRetry(section);
    retryCancels[section] = scheduleRetry(() => {
      delete retryCancels[section];

      if (isStopped) {
        return;
      }

      retrySubscription();
    });
  }

  function subscribeWithFallback(
    section: keyof TvFirestoreBootstrap,
    subscribe: () => () => void,
  ) {
    try {
      return subscribe();
    } catch (error) {
      handleSectionError(
        section,
        error instanceof Error ? error : new Error("Unexpected Firestore subscription error"),
      );
      return () => {};
    }
  }

  function subscribeSection(section: SectionName, createSubscription: SectionSubscribeFactory) {
    const subscribeOnce = () => {
      replaceSubscription(
        section,
        subscribeWithFallback(section, () => createSubscription(subscribeOnce)),
      );
    };

    subscribeOnce();
  }

  emit();

  subscribeSection("settings", (retry) =>
    api.subscribeToDisplaySettings(
      (value) => {
        cancelRetry("settings");
        handleSectionValue("settings", value);
      },
      (error) => {
        handleSectionError("settings", error);
        scheduleSectionRetry("settings", retry);
      },
    ),
  );
  subscribeSection("donation", (retry) =>
    api.subscribeToDonationCurrent(
      (value) => {
        cancelRetry("donation");
        handleSectionValue("donation", value);
      },
      (error) => {
        handleSectionError("donation", error);
        scheduleSectionRetry("donation", retry);
      },
    ),
  );
  subscribeSection("prayerTimes", (retry) =>
    api.subscribeToPrayerTimesCurrent(
      (value) => {
        cancelRetry("prayerTimes");
        handleSectionValue("prayerTimes", value);
      },
      (error) => {
        handleSectionError("prayerTimes", error);
        scheduleSectionRetry("prayerTimes", retry);
      },
    ),
  );
  subscribeSection("dailyContent", (retry) =>
    api.subscribeToDailyContentCurrent(
      (value) => {
        cancelRetry("dailyContent");
        handleSectionValue("dailyContent", value);
      },
      (error) => {
        handleSectionError("dailyContent", error);
        scheduleSectionRetry("dailyContent", retry);
      },
    ),
  );
  subscribeSection("ticker", (retry) =>
    api.subscribeToTickerCurrent(
      (value) => {
        cancelRetry("ticker");
        handleSectionValue("ticker", value);
      },
      (error) => {
        handleSectionError("ticker", error);
        scheduleSectionRetry("ticker", retry);
      },
    ),
  );
  subscribeSection("announcements", (retry) =>
    api.subscribeToAnnouncements(
      (value) => {
        cancelRetry("announcements");
        handleSectionValue("announcements", value);
      },
      (error) => {
        handleSectionError("announcements", error);
        scheduleSectionRetry("announcements", retry);
      },
    ),
  );

  return () => {
    isStopped = true;

    Object.values(retryCancels).forEach((cancelRetryCallback) => {
      cancelRetryCallback?.();
    });
    Object.values(unsubscribeMap).forEach((unsubscribe) => {
      unsubscribe?.();
    });
  };
}
