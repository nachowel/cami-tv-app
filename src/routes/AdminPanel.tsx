import { useEffect, useMemo, useState } from "react";
import { AdminUsersSection } from "../components/admin/AdminUsersSection";
import { AnnouncementsSection } from "../components/admin/AnnouncementsSection";
import type { SectionStatus } from "../components/admin/AdminStatusNotice";
import { DailyContentSection } from "../components/admin/DailyContentSection";
import { DonationSettingsSection } from "../components/admin/DonationSettingsSection";
import { FooterTickerSection } from "../components/admin/FooterTickerSection";
import { resolveAdminDisplayData } from "../components/admin/adminFirestoreState";
import { commitAdminUserClaimChange } from "../components/admin/adminUserManagement.ts";
import { LanguageSettingsSection } from "../components/admin/LanguageSettingsSection";
import { PrayerTimesSection } from "../components/admin/PrayerTimesSection";
import { ThemeModeSection } from "../components/admin/ThemeModeSection";
import {
  commitAnnouncementSave,
  commitAdminSectionSave,
  commitAnnouncementDelete,
  createInfoStatus,
  createSavedStatus,
  createSavingStatus,
} from "../components/admin/adminPersistence.ts";
import {
  createAnnouncementDraft,
  createDailyContentDraft,
  createTickerDraft,
  toPersistedDailyContent,
  toPersistedTicker,
  type AdminAnnouncementDraft,
} from "../components/admin/adminState";
import { mockDisplayData } from "../data/mockDisplayData";
import {
  getAdminClaimStatusMessage,
  resolveAdminAccessState,
} from "../hooks/adminAccessState.ts";
import { useAdminAuth } from "../hooks/useAdminAuth.ts";
import type {
  Announcement,
  DailyContentCurrent,
  DisplayData,
  DisplaySettings,
  DonationCurrent,
  PrayerTimeSourceSettings,
  PrayerTimesCurrent,
  PrayerTimesForDay,
  TickerCurrent,
} from "../types/display";
import {
  deleteAnnouncement as deleteAnnouncementDocument,
  fetchAnnouncements,
  fetchDailyContentCurrent,
  fetchDisplaySettings,
  fetchDonationCurrent,
  fetchPrayerTimeSettings,
  fetchPrayerTimesCurrent,
  fetchTickerCurrent,
  saveAnnouncement,
  saveDailyContentCurrent,
  saveDisplaySettings,
  saveDonationCurrent,
  savePrayerTimeSettings,
  savePrayerTimesCurrent,
  saveTickerCurrent,
} from "../services/firestoreDisplayService.ts";
import { grantAdminClaim, removeAdminClaim } from "../services/adminClaimsService.ts";
import { getAdminUserManagementAvailability } from "../services/adminClaimsService.ts";
import {
  createManualPrayerTimesSaveValue,
  disableManualPrayerTimesOverride,
} from "../components/admin/prayerTimeAdminState.ts";
import {
  validateAnnouncement,
  validateDailyContent,
  validateDonationAmount,
  validateDonationUrl,
  validatePrayerTime,
  validateTicker,
} from "../utils/validation.ts";
import { createDefaultPrayerTimeSourceSettings } from "../utils/prayerTimeSourceSettings.ts";

type SectionStatusKey =
  | "language"
  | "donation"
  | "announcements"
  | "prayerTimes"
  | "dailyContent"
  | "ticker"
  | "theme"
  | "adminUsers";

interface AdminPanelContentProps {
  authError: string | null;
  onLogout: () => Promise<void>;
  userEmail: string;
  userId: string;
}

type AdminSectionId =
  | "admin-users"
  | "language-settings"
  | "donation-settings"
  | "announcements"
  | "prayer-times"
  | "daily-content"
  | "footer-ticker"
  | "theme-mode";

function getDisplayLanguageLabel(language: DisplaySettings["language"]) {
  return language === "tr" ? "Türkçe" : "İngilizce";
}

function getThemeModeLabel(themeMode: DisplaySettings["theme_mode"]) {
  if (themeMode === "dark") {
    return "Koyu";
  }

  if (themeMode === "light") {
    return "Açık";
  }

  return "Otomatik";
}

function getDailyContentTypeLabel(type: DailyContentCurrent["type"]) {
  return type === "hadith" ? "Hadis" : "Ayet";
}

function AdminPanelContent({ authError, onLogout, userEmail, userId }: AdminPanelContentProps) {
  const isAuthenticated = userId.length > 0;
  const adminUserManagementAvailability = getAdminUserManagementAvailability({
    VITE_ENABLE_ADMIN_USER_MANAGEMENT: import.meta.env.VITE_ENABLE_ADMIN_USER_MANAGEMENT,
  });
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>(mockDisplayData.settings);
  const [donation, setDonation] = useState<DonationCurrent>(mockDisplayData.donation);
  const [donationAmountDraft, setDonationAmountDraft] = useState(
    mockDisplayData.donation.weekly_amount.toString(),
  );
  const [donationUrlDraft, setDonationUrlDraft] = useState(mockDisplayData.donation.donation_url);
  const [announcements, setAnnouncements] = useState<Announcement[]>(mockDisplayData.announcements);
  const [announcementDraft, setAnnouncementDraft] = useState<AdminAnnouncementDraft>(
    createAnnouncementDraft(),
  );
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [prayerTimesCurrent, setPrayerTimesCurrent] = useState<PrayerTimesCurrent>(
    mockDisplayData.prayerTimes,
  );
  const [prayerTimesDraft, setPrayerTimesDraft] = useState<PrayerTimesForDay>(
    mockDisplayData.prayerTimes.today,
  );
  const [prayerTimeSourceSettings, setPrayerTimeSourceSettings] = useState<PrayerTimeSourceSettings>(
    () => createDefaultPrayerTimeSourceSettings(),
  );
  const [dailyContent, setDailyContent] = useState<DailyContentCurrent>(mockDisplayData.dailyContent);
  const [dailyContentDraft, setDailyContentDraft] = useState(() =>
    createDailyContentDraft(mockDisplayData.dailyContent),
  );
  const [ticker, setTicker] = useState<TickerCurrent>(mockDisplayData.ticker);
  const [tickerDraft, setTickerDraft] = useState(() => createTickerDraft(mockDisplayData.ticker));
  const [adminUserEmail, setAdminUserEmail] = useState("");
  const [statusBySection, setStatusBySection] = useState<Record<SectionStatusKey, SectionStatus | null>>({
    language: null,
    donation: null,
    announcements: null,
    prayerTimes: null,
    dailyContent: null,
    ticker: null,
    theme: null,
    adminUsers: null,
  });
  const [firestoreFallbackWarning, setFirestoreFallbackWarning] = useState<string | null>(null);
  const [isLoadingFirestoreData, setIsLoadingFirestoreData] = useState(true);
  const [showDonationErrors, setShowDonationErrors] = useState(false);
  const [showAnnouncementErrors, setShowAnnouncementErrors] = useState(false);
  const [showPrayerTimeErrors, setShowPrayerTimeErrors] = useState(false);
  const [showDailyContentErrors, setShowDailyContentErrors] = useState(false);
  const [showTickerErrors, setShowTickerErrors] = useState(false);
  const [activeMobileSection, setActiveMobileSection] = useState<AdminSectionId>("announcements");
  const [isAnnouncementFormVisible, setIsAnnouncementFormVisible] = useState(false);
  const donationAmountValidation = useMemo(
    () => validateDonationAmount(donationAmountDraft),
    [donationAmountDraft],
  );
  const donationUrlValidation = useMemo(
    () => validateDonationUrl(donationUrlDraft),
    [donationUrlDraft],
  );
  const announcementValidation = useMemo(
    () =>
      validateAnnouncement({
        expiresOn: announcementDraft.expiresOn,
        textEn: announcementDraft.textEn,
        textTr: announcementDraft.textTr,
      }),
    [announcementDraft],
  );
  const prayerTimeValidation = useMemo(() => {
    return Object.fromEntries(
      (Object.keys(prayerTimesDraft) as Array<keyof PrayerTimesForDay>).map((key) => [
        key,
        validatePrayerTime(prayerTimesDraft[key]),
      ]),
      ) as Record<keyof PrayerTimesForDay, ReturnType<typeof validatePrayerTime>>;
  }, [prayerTimesDraft]);
  const dailyContentValidation = useMemo(
    () =>
      validateDailyContent({
        arabic: dailyContentDraft.arabic,
        source: dailyContentDraft.source,
        translationEn: dailyContentDraft.translationEn,
        translationTr: dailyContentDraft.translationTr,
        type: dailyContentDraft.type,
      }),
    [dailyContentDraft],
  );
  const tickerValidation = useMemo(
    () =>
      validateTicker({
        textEn: tickerDraft.textEn,
        textTr: tickerDraft.textTr,
        type: tickerDraft.type,
      }),
    [tickerDraft],
  );
  const donationErrors = showDonationErrors
    ? {
        amount: donationAmountValidation.fieldErrors.amount,
        donationUrl: donationUrlValidation.fieldErrors.url,
      }
    : {};
  const announcementErrors = showAnnouncementErrors ? announcementValidation.fieldErrors : {};
  const prayerTimeErrors = showPrayerTimeErrors
    ? Object.fromEntries(
        (Object.keys(prayerTimeValidation) as Array<keyof PrayerTimesForDay>).map((key) => [
          key,
          prayerTimeValidation[key].fieldErrors.time,
        ]),
      ) as Partial<Record<keyof PrayerTimesForDay, string>>
    : {};
  const dailyContentErrors = showDailyContentErrors ? dailyContentValidation.errors : [];
  const dailyContentFieldErrors = showDailyContentErrors ? dailyContentValidation.fieldErrors : {};
  const tickerErrors = showTickerErrors ? tickerValidation.errors : [];
  const tickerFieldErrors = showTickerErrors ? tickerValidation.fieldErrors : {};
  const isAnnouncementSaving = statusBySection.announcements?.tone === "saving";

  function updateSectionStatus(section: SectionStatusKey, status: SectionStatus | null) {
    setStatusBySection((current) => ({
      ...current,
      [section]: status,
    }));
  }

  function applyDisplayData(data: DisplayData) {
    setDisplaySettings(data.settings);
    setDonation(data.donation);
    setDonationAmountDraft(data.donation.weekly_amount.toString());
    setDonationUrlDraft(data.donation.donation_url);
    setAnnouncements(data.announcements);
    setEditingAnnouncementId(null);
    setIsAnnouncementFormVisible(false);
    setAnnouncementDraft(createAnnouncementDraft());
    setPrayerTimesCurrent(data.prayerTimes);
    setPrayerTimesDraft(data.prayerTimes.today);
    setDailyContent(data.dailyContent);
    setDailyContentDraft(createDailyContentDraft(data.dailyContent));
    setTicker(data.ticker);
    setTickerDraft(createTickerDraft(data.ticker));
  }

  useEffect(() => {
    let cancelled = false;

    async function loadAdminData() {
      setIsLoadingFirestoreData(true);

      const [
        settingsResult,
        donationResult,
        prayerTimeSourceSettingsResult,
        prayerTimesResult,
        dailyContentResult,
        tickerResult,
        announcementsResult,
      ] =
        await Promise.allSettled([
          fetchDisplaySettings(),
          fetchDonationCurrent(),
          fetchPrayerTimeSettings(),
          fetchPrayerTimesCurrent(),
          fetchDailyContentCurrent(),
          fetchTickerCurrent(),
          fetchAnnouncements(),
        ]);

      if (cancelled) {
        return;
      }

      const resolved = resolveAdminDisplayData(
        {
          announcements: announcementsResult.status === "fulfilled" ? announcementsResult.value : null,
          dailyContent: dailyContentResult.status === "fulfilled" ? dailyContentResult.value : null,
          donation: donationResult.status === "fulfilled" ? donationResult.value : null,
          prayerTimes: prayerTimesResult.status === "fulfilled" ? prayerTimesResult.value : null,
          settings: settingsResult.status === "fulfilled" ? settingsResult.value : null,
          ticker: tickerResult.status === "fulfilled" ? tickerResult.value : null,
        },
        mockDisplayData,
      );

      applyDisplayData(resolved.data);
      setPrayerTimeSourceSettings(
        prayerTimeSourceSettingsResult.status === "fulfilled"
          ? prayerTimeSourceSettingsResult.value
          : createDefaultPrayerTimeSourceSettings(),
      );
      setFirestoreFallbackWarning(resolved.warning);
      setIsLoadingFirestoreData(false);
    }

    void loadAdminData();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleLanguageChange(nextLanguage: DisplaySettings["language"]) {
    const nextSettings: DisplaySettings = {
      ...displaySettings,
      language: nextLanguage,
      updated_at: new Date().toISOString(),
    };

    updateSectionStatus("language", createSavingStatus("Kaydediliyor..."));

    void commitAdminSectionSave({
      isAuthenticated,
      nextValue: nextSettings,
      persist: saveDisplaySettings,
      successMessage: "Kaydedildi.",
    }).then((result) => {
      if (result.valueToApply) {
        setDisplaySettings(result.valueToApply);
      }

      updateSectionStatus("language", result.status);
    });
  }

  async function handleDonationSubmit() {
    const donationValid = donationAmountValidation.valid && donationUrlValidation.valid;
    if (!donationValid) {
      setShowDonationErrors(true);
      updateSectionStatus("donation", null);
      return;
    }

    const nextDonation: DonationCurrent = {
      ...donation,
      donation_url: donationUrlDraft.trim(),
      weekly_amount: Number(donationAmountDraft),
      updated_at: new Date().toISOString(),
    };

    updateSectionStatus("donation", createSavingStatus("Kaydediliyor..."));

    const result = await commitAdminSectionSave({
      isAuthenticated,
      nextValue: nextDonation,
      persist: saveDonationCurrent,
      successMessage: "Kaydedildi.",
    });

    if (result.valueToApply) {
      setDonation(result.valueToApply);
      setDonationAmountDraft(result.valueToApply.weekly_amount.toString());
      setDonationUrlDraft(result.valueToApply.donation_url);
      setShowDonationErrors(false);
    }

    updateSectionStatus("donation", result.status);
  }

  function handleStartNewAnnouncement() {
    setEditingAnnouncementId(null);
    setAnnouncementDraft(createAnnouncementDraft());
    setIsAnnouncementFormVisible(true);
    setShowAnnouncementErrors(false);
    updateSectionStatus("announcements", {
      message: "Yeni duyuru eklemeye hazır.",
      tone: "info",
    });
  }

  function handleEditAnnouncement(announcementId: string) {
    const currentAnnouncement = announcements.find((announcement) => announcement.id === announcementId);
    if (!currentAnnouncement) {
      return;
    }

    setEditingAnnouncementId(announcementId);
    setAnnouncementDraft(createAnnouncementDraft(currentAnnouncement));
    setIsAnnouncementFormVisible(true);
    setShowAnnouncementErrors(false);
    updateSectionStatus("announcements", {
      message: `Duyuru düzenleniyor: ${announcementId}.`,
      tone: "info",
    });
  }

  async function handleDeleteAnnouncement(announcementId: string) {
    updateSectionStatus("announcements", createSavingStatus("Kaydediliyor..."));

    const result = await commitAnnouncementDelete({
      announcementId,
      announcements,
      editingAnnouncementId,
      isAuthenticated,
      persistDelete: deleteAnnouncementDocument,
    });

    if (result.nextAnnouncements) {
      setAnnouncements(result.nextAnnouncements);
    }

    if (result.resetDraft) {
      setEditingAnnouncementId(result.nextEditingAnnouncementId);
      setAnnouncementDraft(createAnnouncementDraft());
      setIsAnnouncementFormVisible(false);
      setShowAnnouncementErrors(false);
    } else if (result.nextEditingAnnouncementId !== null) {
      setEditingAnnouncementId(result.nextEditingAnnouncementId);
    }

    updateSectionStatus("announcements", result.status);
  }

  async function handleAnnouncementSubmit() {
    if (isAnnouncementSaving) {
      return;
    }

    if (!announcementValidation.valid) {
      setShowAnnouncementErrors(true);
      updateSectionStatus("announcements", null);
      return;
    }

    updateSectionStatus("announcements", createSavingStatus("Kaydediliyor..."));

    const result = await commitAnnouncementSave({
      announcements,
      createId: () => `announcement-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`,
      draft: announcementDraft,
      isAuthenticated,
      persistSave: saveAnnouncement,
      timestamp: new Date().toISOString(),
    });

    if (result.nextAnnouncements) {
      setAnnouncements(result.nextAnnouncements);
    }

    if (result.resetDraft && result.nextDraft) {
      setEditingAnnouncementId(result.nextEditingAnnouncementId);
      setAnnouncementDraft(result.nextDraft);
      setIsAnnouncementFormVisible(false);
    }

    if (result.clearValidationErrors) {
      setShowAnnouncementErrors(false);
    }

    updateSectionStatus("announcements", result.status);
  }

  function handleCancelAnnouncementForm() {
    setEditingAnnouncementId(null);
    setAnnouncementDraft(createAnnouncementDraft());
    setIsAnnouncementFormVisible(false);
    setShowAnnouncementErrors(false);
    updateSectionStatus("announcements", null);
  }

  async function handlePrayerTimesSubmit() {
    const hasPrayerTimeErrors = (Object.keys(prayerTimeValidation) as Array<keyof PrayerTimesForDay>).some(
      (key) => !prayerTimeValidation[key].valid,
    );
    if (hasPrayerTimeErrors) {
      setShowPrayerTimeErrors(true);
      updateSectionStatus("prayerTimes", null);
      return;
    }

    const nextPrayerTimesCurrent = createManualPrayerTimesSaveValue(
      prayerTimesCurrent,
      prayerTimesDraft,
      new Date().toISOString(),
    );

    updateSectionStatus("prayerTimes", createSavingStatus("Kaydediliyor..."));

    const result = await commitAdminSectionSave({
      isAuthenticated,
      nextValue: nextPrayerTimesCurrent,
      persist: savePrayerTimesCurrent,
      successMessage: "Kaydedildi.",
    });

    if (result.valueToApply) {
      setPrayerTimesCurrent(result.valueToApply);
      setPrayerTimesDraft(result.valueToApply.today);
      setShowPrayerTimeErrors(false);
    }

    updateSectionStatus("prayerTimes", result.status);
  }

  async function handleAutomaticPrayerTimesEnable() {
    const restoreResult = disableManualPrayerTimesOverride(
      prayerTimesCurrent,
      new Date().toISOString(),
    );

    updateSectionStatus("prayerTimes", createSavingStatus("Kaydediliyor..."));

    const result = await commitAdminSectionSave({
      isAuthenticated,
      nextValue: restoreResult.nextValue,
      persist: savePrayerTimesCurrent,
      successMessage: "Otomatik Aladhan modu etkinleştirildi.",
    });

    if (result.valueToApply) {
      setPrayerTimesCurrent(result.valueToApply);
      setPrayerTimesDraft(result.valueToApply.today);
      setShowPrayerTimeErrors(false);
    }

    if (!result.committed) {
      updateSectionStatus("prayerTimes", result.status);
      return;
    }

    updateSectionStatus(
      "prayerTimes",
      restoreResult.warningMessage
        ? createInfoStatus(restoreResult.warningMessage)
        : createSavedStatus("Otomatik Aladhan modu etkinleştirildi."),
    );
  }

  function handlePrayerTimeSourceChange(nextSource: PrayerTimeSourceSettings["source"]) {
    const nextSettings: PrayerTimeSourceSettings = {
      ...prayerTimeSourceSettings,
      source: nextSource,
      updatedAt: new Date().toISOString(),
      updatedBy: userEmail,
    };

    updateSectionStatus("prayerTimes", createSavingStatus("Kaydediliyor..."));

    void commitAdminSectionSave({
      isAuthenticated,
      nextValue: nextSettings,
      persist: savePrayerTimeSettings,
      successMessage: "Prayer time source saved.",
    }).then((result) => {
      if (result.valueToApply) {
        setPrayerTimeSourceSettings(result.valueToApply);
      }

      updateSectionStatus("prayerTimes", result.status);
    });
  }

  async function handleDailyContentSubmit() {
    if (!dailyContentValidation.valid) {
      setShowDailyContentErrors(true);
      updateSectionStatus("dailyContent", null);
      return;
    }

    const nextDailyContent = toPersistedDailyContent(
      dailyContentDraft,
      dailyContent,
      new Date().toISOString(),
    );

    updateSectionStatus("dailyContent", createSavingStatus("Kaydediliyor..."));

    const result = await commitAdminSectionSave({
      isAuthenticated,
      nextValue: nextDailyContent,
      persist: saveDailyContentCurrent,
      successMessage: "Kaydedildi.",
    });

    if (result.valueToApply) {
      setDailyContent(result.valueToApply);
      setDailyContentDraft(createDailyContentDraft(result.valueToApply));
      setShowDailyContentErrors(false);
    }

    updateSectionStatus("dailyContent", result.status);
  }

  async function handleTickerSubmit() {
    if (!tickerValidation.valid) {
      setShowTickerErrors(true);
      updateSectionStatus("ticker", null);
      return;
    }

    const nextTicker = toPersistedTicker(tickerDraft, ticker, new Date().toISOString());

    updateSectionStatus("ticker", createSavingStatus("Kaydediliyor..."));

    const result = await commitAdminSectionSave({
      isAuthenticated,
      nextValue: nextTicker,
      persist: saveTickerCurrent,
      successMessage: "Kaydedildi.",
    });

    if (result.valueToApply) {
      setTicker(result.valueToApply);
      setTickerDraft(createTickerDraft(result.valueToApply));
      setShowTickerErrors(false);
    }

    updateSectionStatus("ticker", result.status);
  }

  function handleThemeModeChange(nextThemeMode: DisplaySettings["theme_mode"]) {
    const nextSettings: DisplaySettings = {
      ...displaySettings,
      theme_mode: nextThemeMode,
      updated_at: new Date().toISOString(),
    };

    updateSectionStatus("theme", createSavingStatus("Kaydediliyor..."));

    void commitAdminSectionSave({
      isAuthenticated,
      nextValue: nextSettings,
      persist: saveDisplaySettings,
      successMessage: "Kaydedildi.",
    }).then((result) => {
      if (result.valueToApply) {
        setDisplaySettings(result.valueToApply);
      }

      updateSectionStatus("theme", result.status);
    });
  }

  async function handleAdminUserClaimUpdate(remove: boolean) {
    if (!adminUserManagementAvailability.enabled) {
      updateSectionStatus("adminUsers", null);
      return;
    }

    updateSectionStatus(
      "adminUsers",
      createSavingStatus("Kaydediliyor..."),
    );

    const result = await commitAdminUserClaimChange({
      email: adminUserEmail,
      mutation: remove ? removeAdminClaim : grantAdminClaim,
      successMessage: (email) =>
        remove
          ? `${email} için admin yetkisi kaldırıldı.`
          : `${email} için admin yetkisi verildi.`,
    });

    if (result.normalizedEmail) {
      setAdminUserEmail("");
    }

    updateSectionStatus("adminUsers", result.status);
  }

  return (
    <main className="min-h-screen overflow-x-clip bg-slate-100 px-4 py-4 text-slate-950 sm:px-6 sm:py-8">
      <section className="mx-auto max-w-5xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 sm:text-sm">Yönetim Paneli</p>
            <h1 className="mt-1 truncate text-2xl font-bold sm:mt-2 sm:text-4xl">{displaySettings.mosque_name}</h1>
            <p className="mt-1 truncate text-xs text-slate-600 sm:mt-2 sm:text-sm">Giriş yapan kullanıcı: {userEmail}</p>
          </div>
          <button
            className="min-h-9 shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-emerald-500 sm:min-h-11 sm:px-4 sm:py-2 sm:text-sm"
            onClick={() => {
              void onLogout();
            }}
            type="button"
          >
            Çıkış yap
          </button>
        </div>
        <p className="mt-3 hidden max-w-3xl text-base leading-7 text-slate-700 sm:block sm:text-lg">
          Bu sayfa Firebase Auth ile korunur. Her bölüm veri varsa Firestore'dan okunur ve siz
          kaydedene kadar yedek veriler kullanılabilir.
        </p>

        {authError ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
            {authError}
          </p>
        ) : null}

        {isLoadingFirestoreData ? (
          <p className="mt-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-800">
            Yönetim verileri yükleniyor. Firestore verileri hazır olana kadar mevcut veriler görünür kalır.
          </p>
        ) : null}

        {firestoreFallbackWarning ? (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            {firestoreFallbackWarning}
          </p>
        ) : null}

        <div className="mt-4 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm sm:mt-6 sm:rounded-2xl sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 sm:text-sm">Mevcut veri özeti</p>
          <p className="mt-1 truncate text-xs text-slate-700 sm:hidden">
            Dil: {getDisplayLanguageLabel(displaySettings.language)} • Duyuru: {announcements.length} • İmsak: {prayerTimesCurrent.today.fajr}
          </p>
          <div className="mt-3 hidden gap-3 text-sm text-slate-700 sm:grid sm:grid-cols-2 lg:grid-cols-4">
            <p className="rounded-xl bg-slate-50 px-3 py-2 sm:bg-transparent sm:p-0">
              <span className="font-semibold text-slate-900">Dil:</span> {getDisplayLanguageLabel(displaySettings.language)}
            </p>
            <p className="rounded-xl bg-slate-50 px-3 py-2 sm:bg-transparent sm:p-0">
              <span className="font-semibold text-slate-900">Tema:</span> {getThemeModeLabel(displaySettings.theme_mode)}
            </p>
            <p className="rounded-xl bg-slate-50 px-3 py-2 sm:bg-transparent sm:p-0">
              <span className="font-semibold text-slate-900">Duyurular:</span> {announcements.length}
            </p>
            <p className="rounded-xl bg-slate-50 px-3 py-2 sm:bg-transparent sm:p-0">
              <span className="font-semibold text-slate-900">İçerik türü:</span> {getDailyContentTypeLabel(dailyContent.type)}
            </p>
            <p className="rounded-xl bg-slate-50 px-3 py-2 sm:bg-transparent sm:p-0">
              <span className="font-semibold text-slate-900">İmsak:</span> {prayerTimesCurrent.today.fajr}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:mt-6 sm:gap-6">
          <AdminUsersSection
            disabledReason={adminUserManagementAvailability.disabledReason}
            email={adminUserEmail}
            enabled={adminUserManagementAvailability.enabled}
            id="admin-users"
            isSaving={statusBySection.adminUsers?.tone === "saving"}
            mobileOpen={activeMobileSection === "admin-users"}
            onEmailChange={(nextEmail) => {
              setAdminUserEmail(nextEmail);
              if (adminUserManagementAvailability.enabled) {
                updateSectionStatus("adminUsers", null);
              }
            }}
            onGrant={() => {
              void handleAdminUserClaimUpdate(false);
            }}
            onMobileToggle={() => setActiveMobileSection("admin-users")}
            onRemove={() => {
              void handleAdminUserClaimUpdate(true);
            }}
            status={statusBySection.adminUsers}
          />

          <LanguageSettingsSection
            id="language-settings"
            language={displaySettings.language}
            mobileOpen={activeMobileSection === "language-settings"}
            onChange={handleLanguageChange}
            onMobileToggle={() => setActiveMobileSection("language-settings")}
            status={statusBySection.language}
          />

          <DonationSettingsSection
            amount={donationAmountDraft}
            currency={mockDisplayData.donation.currency}
            donationUrl={donationUrlDraft}
            errors={donationErrors}
            id="donation-settings"
            mobileOpen={activeMobileSection === "donation-settings"}
            onAmountChange={setDonationAmountDraft}
            onDonationUrlChange={setDonationUrlDraft}
            onMobileToggle={() => setActiveMobileSection("donation-settings")}
            onSubmit={handleDonationSubmit}
            status={statusBySection.donation}
          />

          <AnnouncementsSection
            announcements={announcements}
            draft={announcementDraft}
            editingAnnouncementId={editingAnnouncementId}
            errors={announcementErrors}
            id="announcements"
            isFormVisible={isAnnouncementFormVisible}
            isSubmitting={isAnnouncementSaving}
            mobileOpen={activeMobileSection === "announcements"}
            onCancel={handleCancelAnnouncementForm}
            onDelete={handleDeleteAnnouncement}
            onDraftChange={setAnnouncementDraft}
            onEdit={(announcement) => handleEditAnnouncement(announcement.id)}
            onMobileToggle={() => setActiveMobileSection("announcements")}
            onStartNew={handleStartNewAnnouncement}
            onSubmit={handleAnnouncementSubmit}
            status={statusBySection.announcements}
          />

          <PrayerTimesSection
            errors={prayerTimeErrors}
            id="prayer-times"
            mobileOpen={activeMobileSection === "prayer-times"}
            onAutomaticModeEnable={handleAutomaticPrayerTimesEnable}
            onChange={setPrayerTimesDraft}
            onMobileToggle={() => setActiveMobileSection("prayer-times")}
            onSourceChange={handlePrayerTimeSourceChange}
            onSubmit={handlePrayerTimesSubmit}
            prayerTimeSourceSettings={prayerTimeSourceSettings}
            prayerTimesCurrent={prayerTimesCurrent}
            prayerTimes={prayerTimesDraft}
            status={statusBySection.prayerTimes}
          />

          <DailyContentSection
            draft={dailyContentDraft}
            errors={dailyContentErrors}
            fieldErrors={dailyContentFieldErrors}
            id="daily-content"
            mobileOpen={activeMobileSection === "daily-content"}
            onChange={setDailyContentDraft}
            onMobileToggle={() => setActiveMobileSection("daily-content")}
            onSubmit={handleDailyContentSubmit}
            status={statusBySection.dailyContent}
          />

          <FooterTickerSection
            draft={tickerDraft}
            errors={tickerErrors}
            fieldErrors={tickerFieldErrors}
            id="footer-ticker"
            mobileOpen={activeMobileSection === "footer-ticker"}
            onChange={setTickerDraft}
            onMobileToggle={() => setActiveMobileSection("footer-ticker")}
            onSubmit={handleTickerSubmit}
            status={statusBySection.ticker}
          />

          <ThemeModeSection
            id="theme-mode"
            mobileOpen={activeMobileSection === "theme-mode"}
            onChange={handleThemeModeChange}
            onMobileToggle={() => setActiveMobileSection("theme-mode")}
            status={statusBySection.theme}
            themeMode={displaySettings.theme_mode}
          />
        </div>
      </section>
    </main>
  );
}

export default function AdminPanel() {
  useEffect(() => {
    document.title = "ICMG Bexley TV Admin";
  }, []);

  const { authorizationError, error, isAdmin, loading, login, logout, setupError, user } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const accessState = resolveAdminAccessState({
    authorizationError,
    isAdmin,
    loading,
    setupError,
    userPresent: user != null,
  });

  async function handleLoginSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await login(email, password);
  }

  if (accessState === "loading") {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 sm:px-6 sm:py-8">
        <section className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Yönetim Paneli</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950">Admin erişimi kontrol ediliyor</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Mevcut oturum için Firebase Auth ve admin yetkileri doğrulanıyor.
          </p>
        </section>
      </main>
    );
  }

  if (accessState === "setup-error") {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 sm:px-6 sm:py-8">
        <section className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-red-700">Admin Kurulum Hatası</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950">Firebase Auth yapılandırılmamış</h1>
          <p className="mt-3 text-sm leading-6 text-slate-700">{setupError}</p>
          <div className="mt-4 rounded-xl bg-slate-100 p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Gerekli değişkenler</p>
            <p className="mt-2 break-all font-mono">VITE_FIREBASE_API_KEY</p>
            <p className="break-all font-mono">VITE_FIREBASE_AUTH_DOMAIN</p>
            <p className="break-all font-mono">VITE_FIREBASE_PROJECT_ID</p>
            <p className="break-all font-mono">VITE_FIREBASE_APP_ID</p>
          </div>
        </section>
      </main>
    );
  }

  if (accessState === "unauthenticated") {
    return (
      <main className="min-h-[100dvh] overflow-x-clip bg-[radial-gradient(circle_at_top,#dff7ee_0,#f8fafc_42%,#eef2f7_100%)] px-4 py-8 text-slate-950 sm:px-6">
        <section className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-md items-center justify-center">
          <div className="w-full rounded-[2rem] border border-white/80 bg-white/95 px-6 py-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)] sm:px-8 sm:py-10">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 shadow-inner ring-1 ring-emerald-100">
                <img
                  alt=""
                  className="h-10 w-10"
                  src="/favicon.svg"
                />
              </div>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                ICMG Bexley TV Admin
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-normal text-slate-950">Welcome Back</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Sign in to manage the ICMG Bexley TV display
              </p>
            </div>

            <form className="mt-8 grid gap-5" onSubmit={handleLoginSubmit}>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Email</span>
              <input
                autoComplete="email"
                className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none transition focus:border-emerald-700 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@example.com"
                required
                type="email"
                value={email}
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Password</span>
              <input
                autoComplete="current-password"
                className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none transition focus:border-emerald-700 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                required
                type="password"
                value={password}
              />
            </label>

            {error ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
                {error}
              </p>
            ) : null}

            <button
              className="min-h-12 w-full rounded-2xl bg-emerald-700 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-900/15 transition hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-200"
              type="submit"
            >
              Sign In
            </button>
          </form>
          </div>
        </section>
      </main>
    );
  }

  if (accessState === "error" || accessState === "unauthorized") {
    const claimMessage = getAdminClaimStatusMessage(accessState);

    return (
      <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 sm:px-6 sm:py-8">
        <section className="mx-auto max-w-xl rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">Admin Erişimi Kısıtlı</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950">
            {accessState === "unauthorized" ? "Yetkiniz yok" : "Admin yetkisi doğrulanamadı"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-700">{claimMessage}</p>
          {authorizationError ? (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
              {authorizationError}
            </p>
          ) : null}
          <div className="mt-4 rounded-xl bg-slate-100 p-4 text-sm leading-6 text-slate-700">
            Admin yetkileri sunucu tarafında Firebase Admin SDK ile verilmelidir. Sadece giriş yapmak
            Firestore yazma yetkisi sağlamaz.
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="break-all text-sm text-slate-600">Giriş yapan kullanıcı: {user?.email ?? "bilinmeyen kullanıcı"}</p>
            <button
              className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-amber-500 sm:w-auto"
              onClick={() => {
                void logout();
              }}
              type="button"
            >
              Çıkış yap
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <AdminPanelContent
      authError={error}
      onLogout={logout}
      userEmail={user?.email ?? "admin kullanıcı"}
      userId={user?.uid ?? ""}
    />
  );
}
