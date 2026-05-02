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
  fetchPrayerTimesCurrent,
  fetchTickerCurrent,
  saveAnnouncement,
  saveDailyContentCurrent,
  saveDisplaySettings,
  saveDonationCurrent,
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

      const [settingsResult, donationResult, prayerTimesResult, dailyContentResult, tickerResult, announcementsResult] =
        await Promise.allSettled([
          fetchDisplaySettings(),
          fetchDonationCurrent(),
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
    }

    if (result.clearValidationErrors) {
      setShowAnnouncementErrors(false);
    }

    updateSectionStatus("announcements", result.status);
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
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 sm:px-6 sm:py-8">
      <section className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Yönetim Paneli</p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold sm:text-4xl">{displaySettings.mosque_name}</h1>
            <p className="mt-2 text-sm text-slate-600">Giriş yapan kullanıcı: {userEmail}</p>
          </div>
          <button
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-500"
            onClick={() => {
              void onLogout();
            }}
            type="button"
          >
            Çıkış yap
          </button>
        </div>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-700 sm:text-lg">
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

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Mevcut veri özeti</p>
          <div className="mt-3 grid gap-3 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-4">
            <p>
              <span className="font-semibold text-slate-900">Dil:</span> {getDisplayLanguageLabel(displaySettings.language)}
            </p>
            <p>
              <span className="font-semibold text-slate-900">Tema:</span> {getThemeModeLabel(displaySettings.theme_mode)}
            </p>
            <p>
              <span className="font-semibold text-slate-900">Duyurular:</span> {announcements.length}
            </p>
            <p>
              <span className="font-semibold text-slate-900">İçerik türü:</span> {getDailyContentTypeLabel(dailyContent.type)}
            </p>
            <p>
              <span className="font-semibold text-slate-900">İmsak:</span> {prayerTimesCurrent.today.fajr}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-6">
          <AdminUsersSection
            disabledReason={adminUserManagementAvailability.disabledReason}
            email={adminUserEmail}
            enabled={adminUserManagementAvailability.enabled}
            isSaving={statusBySection.adminUsers?.tone === "saving"}
            onEmailChange={(nextEmail) => {
              setAdminUserEmail(nextEmail);
              if (adminUserManagementAvailability.enabled) {
                updateSectionStatus("adminUsers", null);
              }
            }}
            onGrant={() => {
              void handleAdminUserClaimUpdate(false);
            }}
            onRemove={() => {
              void handleAdminUserClaimUpdate(true);
            }}
            status={statusBySection.adminUsers}
          />

          <LanguageSettingsSection
            language={displaySettings.language}
            onChange={handleLanguageChange}
            status={statusBySection.language}
          />

          <DonationSettingsSection
            amount={donationAmountDraft}
            currency={mockDisplayData.donation.currency}
            donationUrl={donationUrlDraft}
            errors={donationErrors}
            onAmountChange={setDonationAmountDraft}
            onDonationUrlChange={setDonationUrlDraft}
            onSubmit={handleDonationSubmit}
            status={statusBySection.donation}
          />

          <AnnouncementsSection
            announcements={announcements}
            draft={announcementDraft}
            editingAnnouncementId={editingAnnouncementId}
            errors={announcementErrors}
            isSubmitting={isAnnouncementSaving}
            onCancel={handleStartNewAnnouncement}
            onDelete={handleDeleteAnnouncement}
            onDraftChange={setAnnouncementDraft}
            onEdit={(announcement) => handleEditAnnouncement(announcement.id)}
            onStartNew={handleStartNewAnnouncement}
            onSubmit={handleAnnouncementSubmit}
            status={statusBySection.announcements}
          />

          <PrayerTimesSection
            errors={prayerTimeErrors}
            onAutomaticModeEnable={handleAutomaticPrayerTimesEnable}
            onChange={setPrayerTimesDraft}
            onSubmit={handlePrayerTimesSubmit}
            prayerTimesCurrent={prayerTimesCurrent}
            prayerTimes={prayerTimesDraft}
            status={statusBySection.prayerTimes}
          />

          <DailyContentSection
            draft={dailyContentDraft}
            errors={dailyContentErrors}
            fieldErrors={dailyContentFieldErrors}
            onChange={setDailyContentDraft}
            onSubmit={handleDailyContentSubmit}
            status={statusBySection.dailyContent}
          />

          <FooterTickerSection
            draft={tickerDraft}
            errors={tickerErrors}
            fieldErrors={tickerFieldErrors}
            onChange={setTickerDraft}
            onSubmit={handleTickerSubmit}
            status={statusBySection.ticker}
          />

          <ThemeModeSection
            onChange={handleThemeModeChange}
            status={statusBySection.theme}
            themeMode={displaySettings.theme_mode}
          />
        </div>
      </section>
    </main>
  );
}

export default function AdminPanel() {
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
            <p className="mt-2 font-mono">VITE_FIREBASE_API_KEY</p>
            <p className="font-mono">VITE_FIREBASE_AUTH_DOMAIN</p>
            <p className="font-mono">VITE_FIREBASE_PROJECT_ID</p>
            <p className="font-mono">VITE_FIREBASE_APP_ID</p>
          </div>
        </section>
      </main>
    );
  }

  if (accessState === "unauthenticated") {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 sm:px-6 sm:py-8">
        <section className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Admin Girişi</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950">/admin yönetimi için giriş yapın</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Firebase Auth e-posta/şifre hesabı kullanın. TV ekranı herkese açıktır.
          </p>

          <form className="mt-6 grid gap-4" onSubmit={handleLoginSubmit}>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">E-posta</span>
              <input
                autoComplete="email"
                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-700"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Şifre</span>
              <input
                autoComplete="current-password"
                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-700"
                onChange={(event) => setPassword(event.target.value)}
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
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
              type="submit"
            >
              Giriş yap
            </button>
          </form>
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
            <p className="text-sm text-slate-600">Giriş yapan kullanıcı: {user?.email ?? "bilinmeyen kullanıcı"}</p>
            <button
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-amber-500"
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
