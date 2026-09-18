import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AdminUsersSection } from "../components/admin/AdminUsersSection";
import { AnnouncementsSection } from "../components/admin/AnnouncementsSection";
import type { SectionStatus } from "../components/admin/AdminStatusNotice";
import { DailyContentSection } from "../components/admin/DailyContentSection";
import {
  DonationDisplaySettingsSection,
  type DonationImageUploadState,
} from "../components/admin/DonationDisplaySettingsSection";
import { DONATION_DISPLAY_PRESETS } from "../components/admin/donationDisplayPresets";
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
  DonationDisplayConfig,
  DonationSlideImage,
  PrayerTimeSourceSettings,
  PrayerTimesCurrent,
  PrayerTimesForDay,
  TickerCurrent,
} from "../types/display";
import {
  DEFAULT_DONATION_DISPLAY_CONFIG,
  deleteAnnouncement as deleteAnnouncementDocument,
  fetchAnnouncements,
  fetchDailyContentCurrent,
  fetchDisplaySettings,
  fetchDonationCurrent,
  fetchDonationDisplayConfig,
  fetchPrayerTimeSettings,
  fetchPrayerTimesCurrent,
  fetchTickerCurrent,
  saveAnnouncement,
  saveDailyContentCurrent,
  saveDisplaySettings,
  saveDonationCurrent,
  saveDonationDisplayConfig,
  savePrayerTimeSettings,
  savePrayerTimesCurrent,
  saveTickerCurrent,
} from "../services/firestoreDisplayService.ts";
import { grantAdminClaim, removeAdminClaim } from "../services/adminClaimsService.ts";
import { getAdminUserManagementAvailability } from "../services/adminClaimsService.ts";
import {
  getDonationSlideUploadErrorMessage,
  uploadDonationSlideImage,
} from "../services/donationSlideUploadService.ts";
import {
  createManualPrayerTimesSaveValue,
  createPrayerTimeSourceSelectionUpdate,
  disableManualPrayerTimesOverride,
} from "../components/admin/prayerTimeAdminState.ts";
import {
  validateAnnouncement,
  validateDailyContent,
  validateDonationAmount,
  validateBackgroundImageUrl,
  validateDonationDisplayQrUrl,
  validateDonationUrl,
  validateSlideshowImageUrls,
  validatePrayerTime,
  validateTicker,
} from "../utils/validation.ts";
import {
  clampSlideshowIntervalSeconds,
  normalizeSlideImages,
} from "../utils/donationDisplaySlideshow.ts";
import { createDefaultPrayerTimeSourceSettings } from "../utils/prayerTimeSourceSettings.ts";
import { normalizeHijriDateOffset } from "../utils/londonCalendar.ts";

type SectionStatusKey =
  | "language"
  | "donation"
  | "donationDisplay"
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
  | "donation-display"
  | "announcements"
  | "prayer-times"
  | "daily-content"
  | "footer-ticker"
  | "theme-mode";

type AdminBottomNavIcon = "home" | "content" | "prayer" | "slides" | "settings";

interface AdminBottomNavItem {
  icon: AdminBottomNavIcon;
  label: string;
  targetSection: AdminSectionId;
}

interface AdminDesktopNavItem {
  icon: AdminBottomNavIcon;
  label: string;
  targetSection: AdminSectionId;
}

const adminBottomNavItems: AdminBottomNavItem[] = [
  { icon: "home", label: "Home", targetSection: "announcements" },
  { icon: "content", label: "Content", targetSection: "daily-content" },
  { icon: "prayer", label: "Prayer", targetSection: "prayer-times" },
  { icon: "slides", label: "Slides", targetSection: "donation-display" },
  { icon: "settings", label: "Settings", targetSection: "language-settings" },
];

const adminDesktopNavItems: AdminDesktopNavItem[] = [
  { icon: "settings", label: "Admin Kullanıcıları", targetSection: "admin-users" },
  { icon: "settings", label: "Dil Ayarı", targetSection: "language-settings" },
  { icon: "content", label: "Bağış Bilgileri", targetSection: "donation-settings" },
  { icon: "slides", label: "Donation Display", targetSection: "donation-display" },
  { icon: "home", label: "Duyurular", targetSection: "announcements" },
  { icon: "prayer", label: "Namaz Vakitleri", targetSection: "prayer-times" },
  { icon: "content", label: "Günün İçeriği", targetSection: "daily-content" },
  { icon: "content", label: "Alt Şerit Yazısı", targetSection: "footer-ticker" },
  { icon: "settings", label: "Ekran Ayarları", targetSection: "theme-mode" },
];

function createIdleDonationImageUploadState(): DonationImageUploadState {
  return {
    error: null,
    uploading: false,
  };
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

function getAdminPageTitle(section: AdminSectionId) {
  switch (section) {
    case "admin-users":
      return "Admin Users";
    case "language-settings":
      return "Settings";
    case "donation-settings":
      return "Donations";
    case "donation-display":
      return "Slides";
    case "announcements":
      return "Home";
    case "prayer-times":
      return "Prayer";
    case "daily-content":
      return "Content";
    case "footer-ticker":
      return "Ticker";
    case "theme-mode":
      return "Theme";
  }
}

function AdminTabIcon({ icon }: { icon: AdminBottomNavIcon }) {
  const iconPaths: Record<AdminBottomNavIcon, ReactNode> = {
    home: (
      <>
        <path d="M3.5 10.8 12 4l8.5 6.8" />
        <path d="M5.5 9.8V20h13V9.8" />
        <path d="M9.5 20v-6h5v6" />
      </>
    ),
    content: (
      <>
        <path d="M5 5.5h14" />
        <path d="M5 11.5h14" />
        <path d="M5 17.5h9" />
      </>
    ),
    prayer: (
      <>
        <path d="M12 3.5v17" />
        <path d="M7 8.5c1.2-2 2.9-3 5-3s3.8 1 5 3" />
        <path d="M7.5 14.5h9" />
        <path d="M9 20.5h6" />
      </>
    ),
    slides: (
      <>
        <rect height="11" rx="2" width="14" x="5" y="5" />
        <path d="M8 19h8" />
        <path d="M10 16v3" />
        <path d="M14 16v3" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 3.5v2.2" />
        <path d="M12 18.3v2.2" />
        <path d="m5.6 5.6 1.6 1.6" />
        <path d="m16.8 16.8 1.6 1.6" />
        <path d="M3.5 12h2.2" />
        <path d="M18.3 12h2.2" />
        <path d="m5.6 18.4 1.6-1.6" />
        <path d="m16.8 7.2 1.6-1.6" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      {iconPaths[icon]}
    </svg>
  );
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
  const [donationDisplayConfig, setDonationDisplayConfig] = useState<DonationDisplayConfig>({
    enabled: true,
    headline: "DONATE HERE TODAY",
    message: "Without your donation, this masjid stops.",
    cta: "Cash or Card Accepted Here ↓",
    qrLabel: "Prefer online? Scan",
    titleLine1: "DONATE",
    titleLine2: "HERE TODAY",
    subtitle: "Without your donation, this masjid cannot continue.",
    mainMessage: "THIS MASJID CANNOT CONTINUE",
    ctaText: "GIVE NOW — CASH OR CARD ↓",
    qrUrl: "https://www.icmgbexley.org.uk/donation",
    backgroundImageUrl: "",
    impactText: "",
    showImpactText: false,
    showQrCode: true,
    displayMode: "component" as "component" | "image",
    qrOverlayEnabled: true,
    qrOverlayXPercent: 82,
    qrOverlayYPercent: 67,
    qrOverlaySizePercent: 12,
    motionEnabled: true,
    slideshowEnabled: false,
    slideshowIntervalSeconds: 30,
    slideImages: [],
  });
  const [donationDisplayDraft, setDonationDisplayDraft] = useState<{
    titleLine1: string;
    titleLine2: string;
    subtitle: string;
    mainMessage: string;
    ctaText: string;
    qrUrl: string;
    impactText: string;
    showImpactText: boolean;
    showQrCode: boolean;
    displayMode: "component" | "image";
    backgroundImageUrl: string;
    qrOverlayEnabled: boolean;
    qrOverlayXPercent: number;
    qrOverlayYPercent: number;
    qrOverlaySizePercent: number;
    motionEnabled: boolean;
    slideshowEnabled: boolean;
    backgroundSlideDurationSeconds: number;
    slideshowIntervalSeconds: number;
    slideImages: DonationSlideImage[];
  }>({
    titleLine1: "DONATE",
    titleLine2: "HERE TODAY",
    subtitle: "Without your donation, this masjid cannot continue.",
    mainMessage: "THIS MASJID CANNOT CONTINUE",
    ctaText: "GIVE NOW — CASH OR CARD ↓",
    qrUrl: "https://www.icmgbexley.org.uk/donation",
    impactText: "",
    showImpactText: false,
    showQrCode: true,
    displayMode: "component",
    backgroundImageUrl: "",
    qrOverlayEnabled: true,
    qrOverlayXPercent: 82,
    qrOverlayYPercent: 67,
    qrOverlaySizePercent: 12,
    motionEnabled: true,
    slideshowEnabled: false,
    backgroundSlideDurationSeconds: 30,
    slideshowIntervalSeconds: 30,
    slideImages: [],
  });
  const [backgroundImageUploadState, setBackgroundImageUploadState] =
    useState<DonationImageUploadState>(() => createIdleDonationImageUploadState());
  const [slideImageUploadStates, setSlideImageUploadStates] = useState<DonationImageUploadState[]>([]);
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
    donationDisplay: null,
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
  const [showDonationDisplayErrors, setShowDonationDisplayErrors] = useState(false);
  const [showAnnouncementErrors, setShowAnnouncementErrors] = useState(false);
  const [showPrayerTimeErrors, setShowPrayerTimeErrors] = useState(false);
  const [showDailyContentErrors, setShowDailyContentErrors] = useState(false);
  const [showTickerErrors, setShowTickerErrors] = useState(false);
  const [activeMobileSection, setActiveMobileSection] = useState<AdminSectionId>("announcements");
  const [activeDesktopSection, setActiveDesktopSection] = useState<AdminSectionId>("admin-users");
  const pendingDesktopScrollTarget = useRef<AdminSectionId | null>(null);
  const pendingDesktopScrollTimeout = useRef<number | null>(null);
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
  const donationDisplayQrUrlValidation = useMemo(
    () =>
      validateDonationDisplayQrUrl({
        qrUrl: donationDisplayDraft.qrUrl,
        showQrCode: donationDisplayDraft.showQrCode,
      }),
    [donationDisplayDraft.qrUrl, donationDisplayDraft.showQrCode],
  );
  const donationDisplayBackgroundImageUrlValidation = useMemo(
    () =>
      validateBackgroundImageUrl({
        backgroundImageUrl: donationDisplayDraft.backgroundImageUrl,
        displayMode: donationDisplayDraft.displayMode,
      }),
    [donationDisplayDraft.backgroundImageUrl, donationDisplayDraft.displayMode],
  );
  const donationDisplaySlideUrlValidation = useMemo(
    () =>
      validateSlideshowImageUrls({
        slideImages: donationDisplayDraft.slideImages,
        slideshowEnabled: donationDisplayDraft.slideshowEnabled,
      }),
    [donationDisplayDraft.slideImages, donationDisplayDraft.slideshowEnabled],
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
  const activePageTitle = getAdminPageTitle(activeMobileSection);
  const sectionStatuses = Object.values(statusBySection);
  const hasSavingStatus = sectionStatuses.some((status) => status?.tone === "saving");
  const hasSavedStatus = sectionStatuses.some((status) => status?.tone === "saved");
  const hasErrorStatus = sectionStatuses.some((status) => status?.tone === "error");
  const connectionStatus = authError
    ? { label: "Issue", classes: "bg-red-50 text-red-700 ring-red-200" }
    : firestoreFallbackWarning
      ? { label: "Fallback", classes: "bg-amber-50 text-amber-700 ring-amber-200" }
      : isLoadingFirestoreData
        ? { label: "Syncing", classes: "bg-sky-50 text-sky-700 ring-sky-200" }
        : { label: "Connected", classes: "bg-emerald-50 text-emerald-700 ring-emerald-200" };
  const saveState = hasSavingStatus
    ? { label: "Saving...", classes: "bg-amber-50 text-amber-700 ring-amber-200" }
    : hasErrorStatus
      ? { label: "Unsaved changes", classes: "bg-red-50 text-red-700 ring-red-200" }
      : hasSavedStatus
        ? { label: "Saved", classes: "bg-emerald-50 text-emerald-700 ring-emerald-200" }
        : { label: "Saved", classes: "bg-slate-100 text-slate-600 ring-slate-200" };
  const activeDesktopBreadcrumb = useMemo(() => {
    const item = adminDesktopNavItems.find((item) => item.targetSection === activeDesktopSection);
    return { group: "Admin", label: item?.label ?? "Admin Kullanıcıları" };
  }, [activeDesktopSection]);

  function handleMobileTabSelect(targetSection: AdminSectionId) {
    setActiveMobileSection(targetSection);
    window.requestAnimationFrame(() => {
      document.getElementById(targetSection)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function handleDesktopNavSelect(targetSection: AdminSectionId) {
    pendingDesktopScrollTarget.current = targetSection;
    if (pendingDesktopScrollTimeout.current !== null) {
      window.clearTimeout(pendingDesktopScrollTimeout.current);
    }
    pendingDesktopScrollTimeout.current = window.setTimeout(() => {
      pendingDesktopScrollTarget.current = null;
      pendingDesktopScrollTimeout.current = null;
    }, 900);
    setActiveDesktopSection(targetSection);
    document.getElementById(targetSection)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  useEffect(() => {
    function syncActiveDesktopSectionWithScroll() {
      if (!window.matchMedia("(min-width: 1024px)").matches) {
        return;
      }

      let currentSection = adminDesktopNavItems[0].targetSection;
      const activationOffset = 104;
      if (pendingDesktopScrollTarget.current !== null) {
        const pendingSection = document.getElementById(pendingDesktopScrollTarget.current);
        if (
          pendingSection &&
          Math.abs(pendingSection.getBoundingClientRect().top - activationOffset) > 24
        ) {
          return;
        }

        pendingDesktopScrollTarget.current = null;
        if (pendingDesktopScrollTimeout.current !== null) {
          window.clearTimeout(pendingDesktopScrollTimeout.current);
          pendingDesktopScrollTimeout.current = null;
        }
      }

      for (const item of adminDesktopNavItems) {
        const section = document.getElementById(item.targetSection);
        if (!section) {
          continue;
        }

        if (section.getBoundingClientRect().top <= activationOffset) {
          currentSection = item.targetSection;
        } else {
          break;
        }
      }

      setActiveDesktopSection(currentSection);
    }

    syncActiveDesktopSectionWithScroll();
    window.addEventListener("scroll", syncActiveDesktopSectionWithScroll, { passive: true });
    window.addEventListener("resize", syncActiveDesktopSectionWithScroll);

    return () => {
      window.removeEventListener("scroll", syncActiveDesktopSectionWithScroll);
      window.removeEventListener("resize", syncActiveDesktopSectionWithScroll);
      if (pendingDesktopScrollTimeout.current !== null) {
        window.clearTimeout(pendingDesktopScrollTimeout.current);
      }
    };
  }, []);

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
        donationDisplayResult,
        prayerTimeSourceSettingsResult,
        prayerTimesResult,
        dailyContentResult,
        tickerResult,
        announcementsResult,
      ] =
        await Promise.allSettled([
          fetchDisplaySettings(),
          fetchDonationCurrent(),
          fetchDonationDisplayConfig(),
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
      if (donationDisplayResult.status === "fulfilled" && donationDisplayResult.value) {
        const cfg = donationDisplayResult.value;
        setDonationDisplayConfig(cfg);
        setDonationDisplayDraft({
          titleLine1: cfg.titleLine1,
          titleLine2: cfg.titleLine2,
          subtitle: cfg.subtitle,
          mainMessage: cfg.mainMessage,
          ctaText: cfg.ctaText,
          qrUrl: cfg.qrUrl,
          impactText: cfg.impactText ?? "",
          showImpactText: cfg.showImpactText,
          showQrCode: cfg.showQrCode,
          displayMode: cfg.displayMode,
          backgroundImageUrl: cfg.backgroundImageUrl,
          qrOverlayEnabled: cfg.qrOverlayEnabled,
          qrOverlayXPercent: cfg.qrOverlayXPercent,
          qrOverlayYPercent: cfg.qrOverlayYPercent,
          qrOverlaySizePercent: cfg.qrOverlaySizePercent,
          motionEnabled: cfg.motionEnabled,
          slideshowEnabled: cfg.slideshowEnabled,
          backgroundSlideDurationSeconds: cfg.backgroundSlideDurationSeconds ?? 30,
          slideshowIntervalSeconds: cfg.slideshowIntervalSeconds,
          slideImages: cfg.slideImages,
        });
        setSlideImageUploadStates(cfg.slideImages.map(() => createIdleDonationImageUploadState()));
      }
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

  function handleHijriDateOffsetChange(nextOffset: NonNullable<DisplaySettings["hijriDateOffset"]>) {
    const nextSettings: DisplaySettings = {
      ...displaySettings,
      hijriDateOffset: nextOffset,
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

    const donationWithoutLegacySlides = { ...donation };
    delete donationWithoutLegacySlides.slideImageUrls;
    const nextDonation: DonationCurrent = {
      ...donationWithoutLegacySlides,
      donation_url: donationUrlDraft.trim(),
      weekly_amount: Number(donationAmountDraft),
      slideshowEnabled: donationDisplayDraft.slideshowEnabled,
      slideshowIntervalSeconds: clampSlideshowIntervalSeconds(donationDisplayDraft.slideshowIntervalSeconds),
      slideImages: normalizeSlideImages(donationDisplayDraft.slideImages),
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

  function handleDonationDisplayPresetSelect(presetId: string) {
    const preset = DONATION_DISPLAY_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setDonationDisplayDraft((prev) => ({
      ...prev,
      titleLine1: preset.titleLine1,
      titleLine2: preset.titleLine2,
      subtitle: preset.subtitle,
      ctaText: preset.ctaText,
    }));
  }

  function updateSlideImageUploadState(index: number, nextState: DonationImageUploadState) {
    setSlideImageUploadStates((prev) => {
      const next = [...prev];
      while (next.length <= index) {
        next.push(createIdleDonationImageUploadState());
      }
      next[index] = nextState;
      return next;
    });
  }

  async function handleDonationBackgroundImageUpload(file: File) {
    setBackgroundImageUploadState({ error: null, uploading: true });

    try {
      const result = await uploadDonationSlideImage(file);
      setDonationDisplayDraft((prev) => ({
        ...prev,
        backgroundImageUrl: result.secure_url,
      }));
      setBackgroundImageUploadState({ error: null, uploading: false });
    } catch (error) {
      setBackgroundImageUploadState({
        error: getDonationSlideUploadErrorMessage(error),
        uploading: false,
      });
    }
  }

  async function handleDonationSlideImageUpload(index: number, file: File) {
    updateSlideImageUploadState(index, { error: null, uploading: true });

    try {
      const result = await uploadDonationSlideImage(file);
      setDonationDisplayDraft((prev) => ({
        ...prev,
        slideImages: prev.slideImages.map((current, currentIndex) =>
          currentIndex === index ? { ...current, imageUrl: result.secure_url } : current,
        ),
      }));
      updateSlideImageUploadState(index, { error: null, uploading: false });
    } catch (error) {
      updateSlideImageUploadState(index, {
        error: getDonationSlideUploadErrorMessage(error),
        uploading: false,
      });
    }
  }

  function handleDonationDisplayReset() {
    const confirmed = window.confirm("Reset donation display to default values?");
    if (!confirmed) return;
    setDonationDisplayDraft({
      titleLine1: DEFAULT_DONATION_DISPLAY_CONFIG.titleLine1,
      titleLine2: DEFAULT_DONATION_DISPLAY_CONFIG.titleLine2,
      subtitle: DEFAULT_DONATION_DISPLAY_CONFIG.subtitle,
      mainMessage: DEFAULT_DONATION_DISPLAY_CONFIG.mainMessage,
      ctaText: DEFAULT_DONATION_DISPLAY_CONFIG.ctaText,
      qrUrl: DEFAULT_DONATION_DISPLAY_CONFIG.qrUrl,
      impactText: DEFAULT_DONATION_DISPLAY_CONFIG.impactText ?? "",
      showImpactText: DEFAULT_DONATION_DISPLAY_CONFIG.showImpactText,
      showQrCode: DEFAULT_DONATION_DISPLAY_CONFIG.showQrCode,
      displayMode: DEFAULT_DONATION_DISPLAY_CONFIG.displayMode,
      backgroundImageUrl: DEFAULT_DONATION_DISPLAY_CONFIG.backgroundImageUrl,
      qrOverlayEnabled: DEFAULT_DONATION_DISPLAY_CONFIG.qrOverlayEnabled,
      qrOverlayXPercent: DEFAULT_DONATION_DISPLAY_CONFIG.qrOverlayXPercent,
      qrOverlayYPercent: DEFAULT_DONATION_DISPLAY_CONFIG.qrOverlayYPercent,
      qrOverlaySizePercent: DEFAULT_DONATION_DISPLAY_CONFIG.qrOverlaySizePercent,
      motionEnabled: DEFAULT_DONATION_DISPLAY_CONFIG.motionEnabled,
      slideshowEnabled: DEFAULT_DONATION_DISPLAY_CONFIG.slideshowEnabled,
      backgroundSlideDurationSeconds: 30,
      slideshowIntervalSeconds: DEFAULT_DONATION_DISPLAY_CONFIG.slideshowIntervalSeconds,
      slideImages: DEFAULT_DONATION_DISPLAY_CONFIG.slideImages,
    });
    setBackgroundImageUploadState(createIdleDonationImageUploadState());
    setSlideImageUploadStates(DEFAULT_DONATION_DISPLAY_CONFIG.slideImages.map(() => createIdleDonationImageUploadState()));
    setShowDonationDisplayErrors(false);
  }

  async function handleDonationDisplaySubmit() {
    if (!donationDisplayQrUrlValidation.valid || !donationDisplayBackgroundImageUrlValidation.valid || !donationDisplaySlideUrlValidation.valid) {
      setShowDonationDisplayErrors(true);
      updateSectionStatus("donationDisplay", null);
      return;
    }

    const slideImages = normalizeSlideImages(donationDisplayDraft.slideImages);
    const nextConfig: DonationDisplayConfig = {
      ...donationDisplayConfig,
      titleLine1: donationDisplayDraft.titleLine1.trim(),
      titleLine2: donationDisplayDraft.titleLine2.trim(),
      subtitle: donationDisplayDraft.subtitle.trim(),
      mainMessage: donationDisplayDraft.mainMessage.trim(),
      ctaText: donationDisplayDraft.ctaText.trim(),
      qrUrl: donationDisplayDraft.qrUrl.trim(),
      impactText: donationDisplayDraft.impactText.trim(),
      showImpactText: donationDisplayDraft.showImpactText,
      showQrCode: donationDisplayDraft.showQrCode,
      displayMode: donationDisplayDraft.displayMode,
      backgroundImageUrl: donationDisplayDraft.backgroundImageUrl.trim(),
      qrOverlayEnabled: donationDisplayDraft.qrOverlayEnabled,
      qrOverlayXPercent: donationDisplayDraft.qrOverlayXPercent,
      qrOverlayYPercent: donationDisplayDraft.qrOverlayYPercent,
      qrOverlaySizePercent: donationDisplayDraft.qrOverlaySizePercent,
      motionEnabled: donationDisplayDraft.motionEnabled,
      slideshowEnabled: donationDisplayDraft.slideshowEnabled,
      backgroundSlideDurationSeconds: donationDisplayDraft.backgroundSlideDurationSeconds,
      slideshowIntervalSeconds: clampSlideshowIntervalSeconds(donationDisplayDraft.slideshowIntervalSeconds),
      slideImages,
    };
    const donationDisplayWithoutLegacySlides = { ...donation };
    delete donationDisplayWithoutLegacySlides.slideImageUrls;
    const nextDonation: DonationCurrent = {
      ...donationDisplayWithoutLegacySlides,
      slideshowEnabled: nextConfig.slideshowEnabled,
      slideshowIntervalSeconds: nextConfig.slideshowIntervalSeconds,
      slideImages: nextConfig.slideImages,
      updated_at: new Date().toISOString(),
    };

    updateSectionStatus("donationDisplay", createSavingStatus("Kaydediliyor..."));

    const result = await commitAdminSectionSave({
      isAuthenticated,
      nextValue: nextConfig,
      persist: async (config) => {
        await Promise.all([
          saveDonationDisplayConfig(config),
          saveDonationCurrent(nextDonation),
        ]);
      },
      successMessage: "Kaydedildi.",
    });

    if (result.valueToApply) {
      setDonationDisplayConfig(result.valueToApply);
      setDonationDisplayDraft({
        titleLine1: result.valueToApply.titleLine1,
        titleLine2: result.valueToApply.titleLine2,
        subtitle: result.valueToApply.subtitle,
        mainMessage: result.valueToApply.mainMessage,
        ctaText: result.valueToApply.ctaText,
        qrUrl: result.valueToApply.qrUrl,
        impactText: result.valueToApply.impactText ?? "",
        showImpactText: result.valueToApply.showImpactText,
        showQrCode: result.valueToApply.showQrCode,
        displayMode: result.valueToApply.displayMode,
        backgroundImageUrl: result.valueToApply.backgroundImageUrl,
        qrOverlayEnabled: result.valueToApply.qrOverlayEnabled,
        qrOverlayXPercent: result.valueToApply.qrOverlayXPercent,
        qrOverlayYPercent: result.valueToApply.qrOverlayYPercent,
        qrOverlaySizePercent: result.valueToApply.qrOverlaySizePercent,
        motionEnabled: result.valueToApply.motionEnabled,
        slideshowEnabled: result.valueToApply.slideshowEnabled,
        backgroundSlideDurationSeconds: result.valueToApply.backgroundSlideDurationSeconds ?? 30,
        slideshowIntervalSeconds: result.valueToApply.slideshowIntervalSeconds,
        slideImages: result.valueToApply.slideImages,
      });
      setDonation(nextDonation);
      setShowDonationDisplayErrors(false);
    }

    updateSectionStatus("donationDisplay", result.status);
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

  async function handleSwitchPrayerTimesToAutomatic() {
    const restoreResult = disableManualPrayerTimesOverride(
      prayerTimesCurrent,
      new Date().toISOString(),
    );

    updateSectionStatus("prayerTimes", createSavingStatus("Kaydediliyor..."));

    const result = await commitAdminSectionSave({
      isAuthenticated,
      nextValue: restoreResult.nextValue,
      persist: savePrayerTimesCurrent,
      successMessage: restoreResult.warningMessage ?? "Automatic prayer times restored.",
    });

    if (result.valueToApply) {
      setPrayerTimesCurrent(result.valueToApply);
      setPrayerTimesDraft(result.valueToApply.today);
      setShowPrayerTimeErrors(false);
    }

    updateSectionStatus("prayerTimes", result.status);
  }

  async function handlePrayerTimeSourceChange(nextSource: PrayerTimeSourceSettings["source"]) {
    const selectionUpdate = createPrayerTimeSourceSelectionUpdate({
      currentPrayerTimes: prayerTimesCurrent,
      currentSettings: prayerTimeSourceSettings,
      nextSource,
      updatedAt: new Date().toISOString(),
      updatedBy: userEmail,
    });

    updateSectionStatus("prayerTimes", createSavingStatus("Kaydediliyor..."));

    const settingsResult = await commitAdminSectionSave({
      isAuthenticated,
      nextValue: selectionUpdate.nextSettings,
      persist: savePrayerTimeSettings,
      successMessage: selectionUpdate.userMessage,
    });

    if (settingsResult.valueToApply) {
      setPrayerTimeSourceSettings(settingsResult.valueToApply);
    }

    if (!settingsResult.valueToApply || !selectionUpdate.nextPrayerTimesCurrent) {
      updateSectionStatus("prayerTimes", settingsResult.status);
      return;
    }

    const currentResult = await commitAdminSectionSave({
      isAuthenticated,
      nextValue: selectionUpdate.nextPrayerTimesCurrent,
      persist: savePrayerTimesCurrent,
      successMessage: selectionUpdate.userMessage,
    });

    if (currentResult.valueToApply) {
      setPrayerTimesCurrent(currentResult.valueToApply);
      setPrayerTimesDraft(currentResult.valueToApply.today);
      setShowPrayerTimeErrors(false);
    }

    updateSectionStatus("prayerTimes", currentResult.status);
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
    <main
      className="admin-dashboard min-h-[100dvh] overflow-x-clip bg-[#f4f7f4] text-slate-950"
      style={{ paddingBottom: "calc(5.5rem + env(safe-area-inset-bottom))" }}
    >
      <header className="sticky top-0 z-30 border-b border-emerald-950/10 bg-white/95 px-3 py-2 shadow-sm backdrop-blur sm:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[0.7rem] font-semibold uppercase tracking-wide text-emerald-700">
              ICMG Bexley TV
            </p>
            <h1 className="truncate text-base font-bold leading-6 text-slate-950">{activePageTitle}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className={`rounded-full px-2 py-1 text-[0.65rem] font-bold ring-1 ${connectionStatus.classes}`}>
              {connectionStatus.label}
            </span>
            <span className={`rounded-full px-2 py-1 text-[0.65rem] font-bold ring-1 ${saveState.classes}`}>
              {saveState.label}
            </span>
          </div>
        </div>
      </header>

      <div className="admin-dashboard-shell lg:flex lg:min-h-[100dvh] lg:items-stretch lg:bg-[#f2f6f1] lg:p-4">
        <aside className="hidden w-64 shrink-0 overflow-hidden rounded-2xl bg-[#0a3a2a] text-white shadow-[0_22px_50px_rgba(10,58,42,0.22)] lg:sticky lg:top-4 lg:flex lg:h-[calc(100dvh-2rem)] lg:flex-col">
          <div className="border-b border-white/10 px-4 py-4">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-[0.2rem] bg-[#1d9e75]" aria-hidden="true" />
              <p className="text-sm font-semibold leading-5">ICMG Bexley TV</p>
            </div>
            <p className="mt-1 pl-5 text-xs text-white/45">Admin Paneli</p>
          </div>

          <nav aria-label="Admin desktop navigation" className="flex-1 overflow-y-auto px-2 py-3">
            <div className="grid gap-1">
              {adminDesktopNavItems.map((item) => {
                const isActive = activeDesktopSection === item.targetSection;

                return (
                  <button
                    aria-current={isActive ? "page" : undefined}
                    className={`flex min-h-9 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                      isActive
                        ? "bg-[#1d9e75] text-white shadow-sm"
                        : "text-white/65 hover:bg-white/10 hover:text-white"
                    }`}
                    key={item.targetSection}
                    onClick={() => handleDesktopNavSelect(item.targetSection)}
                    type="button"
                  >
                    <AdminTabIcon icon={item.icon} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="border-t border-white/10 p-2">
            <button
              className="flex min-h-9 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-white/65 transition hover:bg-white/10 hover:text-white"
              onClick={() => {
                void onLogout();
              }}
              type="button"
            >
              <AdminTabIcon icon="settings" />
              <span>Çıkış</span>
            </button>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="hidden h-14 items-center justify-between gap-4 border-b border-emerald-950/10 bg-white px-5 shadow-sm lg:sticky lg:top-4 lg:z-20 lg:flex">
            <div className="min-w-0 text-sm text-slate-500">
              <span>{activeDesktopBreadcrumb.group}</span>
              <span className="px-2 text-slate-300">/</span>
              <span className="font-semibold text-slate-950">{activeDesktopBreadcrumb.label}</span>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-100">
                <span className="h-1.5 w-1.5 rounded-full bg-[#1d9e75]" aria-hidden="true" />
                Canlı
              </span>
              <a
                className="inline-flex min-h-9 items-center rounded-lg border border-emerald-900/15 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-900 transition hover:border-emerald-700 hover:text-emerald-700"
                href="/tv"
              >
                TV'yi Aç
              </a>
            </div>
          </header>

          <section className="mx-auto w-full max-w-6xl px-3 pb-4 pt-3 sm:px-6 sm:py-8 lg:max-w-5xl lg:px-6 lg:pb-8 lg:pt-5">
        <div className="hidden items-start justify-between gap-3 sm:flex lg:hidden">
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
        <p className="mt-3 hidden max-w-3xl text-base leading-7 text-slate-700 sm:block sm:text-lg lg:hidden">
          Bu sayfa Firebase Auth ile korunur. Her bölüm veri varsa Firestore'dan okunur ve siz
          kaydedene kadar yedek veriler kullanılabilir.
        </p>

        <div className="rounded-[1.25rem] border border-white bg-white/90 p-3 shadow-[0_12px_36px_rgba(15,23,42,0.08)] ring-1 ring-emerald-950/5 sm:hidden">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-lg font-bold leading-6 text-slate-950">{displaySettings.mosque_name}</p>
              <p className="mt-1 truncate text-xs text-slate-500">{userEmail}</p>
            </div>
            <button
              className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-emerald-400"
              onClick={() => {
                void onLogout();
              }}
              type="button"
            >
              Çıkış
            </button>
          </div>
        </div>

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

        <div
          className="mt-3 scroll-mt-24 rounded-[1.1rem] border border-emerald-950/10 bg-white px-3 py-2 shadow-[0_12px_34px_rgba(15,23,42,0.06)] sm:mt-6 sm:rounded-2xl sm:p-5 lg:mt-0 lg:scroll-mt-20 lg:rounded-xl lg:border-emerald-950/10 lg:p-4 lg:shadow-[0_10px_26px_rgba(15,23,42,0.05)]"
          id="admin-overview"
        >
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

        <div className="mt-3 grid gap-3 sm:mt-6 sm:gap-6">
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
            hijriDateOffset={normalizeHijriDateOffset(displaySettings.hijriDateOffset)}
            id="language-settings"
            language={displaySettings.language}
            mobileOpen={activeMobileSection === "language-settings"}
            onChange={handleLanguageChange}
            onHijriDateOffsetChange={handleHijriDateOffsetChange}
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

          <DonationDisplaySettingsSection
            backgroundImageUrl={donationDisplayDraft.backgroundImageUrl}
            backgroundImageUrlError={showDonationDisplayErrors ? donationDisplayBackgroundImageUrlValidation.fieldErrors.backgroundImageUrl : undefined}
            backgroundImageUploadState={backgroundImageUploadState}
            ctaText={donationDisplayDraft.ctaText}
            displayMode={donationDisplayDraft.displayMode}
            id="donation-display"
            impactText={donationDisplayDraft.impactText}
            mainMessage={donationDisplayDraft.mainMessage}
            mobileOpen={activeMobileSection === "donation-display"}
            motionEnabled={donationDisplayDraft.motionEnabled}
            slideImageUrlErrors={showDonationDisplayErrors ? donationDisplaySlideUrlValidation.fieldErrors.slideImages : undefined}
            slideImages={donationDisplayDraft.slideImages}
            slideImageUploadStates={slideImageUploadStates}
            slideshowEnabled={donationDisplayDraft.slideshowEnabled}
            slideshowIntervalSeconds={donationDisplayDraft.slideshowIntervalSeconds}
            backgroundSlideDurationSeconds={donationDisplayDraft.backgroundSlideDurationSeconds}
            onAddSlideImageUrl={() => {
              setDonationDisplayDraft((prev) => ({ ...prev, slideImages: [...prev.slideImages, { imageUrl: "", showQr: true }] }));
              setSlideImageUploadStates((prev) => [...prev, createIdleDonationImageUploadState()]);
            }}
            onBackgroundImageUpload={handleDonationBackgroundImageUpload}
            onBackgroundImageUrlChange={(value) => setDonationDisplayDraft((prev) => ({ ...prev, backgroundImageUrl: value }))}
            onCtaTextChange={(value) => setDonationDisplayDraft((prev) => ({ ...prev, ctaText: value }))}
            onDisplayModeChange={(value) => setDonationDisplayDraft((prev) => ({ ...prev, displayMode: value }))}
            onImpactTextChange={(value) => setDonationDisplayDraft((prev) => ({ ...prev, impactText: value }))}
            onMainMessageChange={(value) => setDonationDisplayDraft((prev) => ({ ...prev, mainMessage: value }))}
            onMobileToggle={() => setActiveMobileSection("donation-display")}
            onMoveSlideImageUrl={(index, direction) => {
              setDonationDisplayDraft((prev) => {
                const next = [...prev.slideImages];
                const targetIndex = index + direction;
                if (targetIndex < 0 || targetIndex >= next.length) {
                  return prev;
                }
                [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
                return { ...prev, slideImages: next };
              });
              setSlideImageUploadStates((prev) => {
                const next = [...prev];
                const targetIndex = index + direction;
                if (targetIndex < 0 || targetIndex >= next.length) {
                  return prev;
                }
                [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
                return next;
              });
            }}
            onMotionEnabledChange={(value) => setDonationDisplayDraft((prev) => ({ ...prev, motionEnabled: value }))}
            onQrOverlayEnabledChange={(value) => setDonationDisplayDraft((prev) => ({ ...prev, qrOverlayEnabled: value }))}
            onQrOverlaySizePercentChange={(value) => setDonationDisplayDraft((prev) => ({ ...prev, qrOverlaySizePercent: value }))}
            onQrOverlayXPercentChange={(value) => setDonationDisplayDraft((prev) => ({ ...prev, qrOverlayXPercent: value }))}
            onQrOverlayYPercentChange={(value) => setDonationDisplayDraft((prev) => ({ ...prev, qrOverlayYPercent: value }))}
            onQrUrlChange={(value) => setDonationDisplayDraft((prev) => ({ ...prev, qrUrl: value }))}
            onRemoveSlideImageUrl={(index) => {
              setDonationDisplayDraft((prev) => ({ ...prev, slideImages: prev.slideImages.filter((_, currentIndex) => currentIndex !== index) }));
              setSlideImageUploadStates((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
            }}
            onReset={handleDonationDisplayReset}
            onSlideImageUpload={handleDonationSlideImageUpload}
            onSlideImageUrlChange={(index, value) => setDonationDisplayDraft((prev) => ({
              ...prev,
              slideImages: prev.slideImages.map((current, currentIndex) => currentIndex === index ? { ...current, imageUrl: value } : current),
            }))}
            onSlideImageShowQrChange={(index, value) => setDonationDisplayDraft((prev) => ({
              ...prev,
              slideImages: prev.slideImages.map((current, currentIndex) => currentIndex === index ? { ...current, showQr: value } : current),
            }))}
            onSlideImageDurationSecondsChange={(index, value) => setDonationDisplayDraft((prev) => ({
              ...prev,
              slideImages: prev.slideImages.map((current, currentIndex) => currentIndex === index ? { ...current, durationSeconds: value } : current),
            }))}
            onShowImpactTextChange={(value) => setDonationDisplayDraft((prev) => ({ ...prev, showImpactText: value }))}
            onShowQrCodeChange={(value) => setDonationDisplayDraft((prev) => ({ ...prev, showQrCode: value }))}
            onSlideshowEnabledChange={(value) => setDonationDisplayDraft((prev) => ({ ...prev, slideshowEnabled: value }))}
            onSlideshowIntervalSecondsChange={(value) => setDonationDisplayDraft((prev) => ({ ...prev, slideshowIntervalSeconds: value }))}
            onBackgroundSlideDurationSecondsChange={(value) => setDonationDisplayDraft((prev) => ({ ...prev, backgroundSlideDurationSeconds: value }))}
            onPresetSelect={handleDonationDisplayPresetSelect}
            onSubmit={handleDonationDisplaySubmit}
            onSubtitleChange={(value) => setDonationDisplayDraft((prev) => ({ ...prev, subtitle: value }))}
            onTitleLine1Change={(value) => setDonationDisplayDraft((prev) => ({ ...prev, titleLine1: value }))}
            onTitleLine2Change={(value) => setDonationDisplayDraft((prev) => ({ ...prev, titleLine2: value }))}
            qrOverlayEnabled={donationDisplayDraft.qrOverlayEnabled}
            qrOverlaySizePercent={donationDisplayDraft.qrOverlaySizePercent}
            qrOverlayXPercent={donationDisplayDraft.qrOverlayXPercent}
            qrOverlayYPercent={donationDisplayDraft.qrOverlayYPercent}
            qrUrl={donationDisplayDraft.qrUrl}
            qrUrlError={showDonationDisplayErrors ? donationDisplayQrUrlValidation.fieldErrors.qrUrl : undefined}
            showImpactText={donationDisplayDraft.showImpactText}
            showQrCode={donationDisplayDraft.showQrCode}
            status={statusBySection.donationDisplay}
            subtitle={donationDisplayDraft.subtitle}
            titleLine1={donationDisplayDraft.titleLine1}
            titleLine2={donationDisplayDraft.titleLine2}
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
            onChange={setPrayerTimesDraft}
            onMobileToggle={() => setActiveMobileSection("prayer-times")}
            onSourceChange={handlePrayerTimeSourceChange}
            onSwitchToAutomatic={handleSwitchPrayerTimesToAutomatic}
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
        </div>
      </div>

      <nav
        aria-label="Admin bottom navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-emerald-950/10 bg-white/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur sm:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {adminBottomNavItems.map((item) => {
            const isActive = activeMobileSection === item.targetSection;

            return (
              <button
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-[3.6rem] flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[0.68rem] font-bold transition ${
                  isActive
                    ? "bg-emerald-700 text-white shadow-lg shadow-emerald-900/15"
                    : "text-slate-500 hover:bg-emerald-50 hover:text-emerald-800"
                }`}
                key={item.label}
                onClick={() => handleMobileTabSelect(item.targetSection)}
                type="button"
              >
                <AdminTabIcon icon={item.icon} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
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
