import type { DisplayData } from "../types/display";

// Shared mock fixture for local fallback rendering and initial Firestore seed defaults.
export const mockDisplayData = {
  settings: {
    mosque_name: "ICMG Bexley",
    language: "en",
    theme_mode: "auto",
    auto_theme_start: "08:00",
    auto_theme_end: "18:00",
    updated_at: "2026-05-01T18:00:00Z",
  },
  donation: {
    weekly_amount: 750,
    currency: "GBP",
    donation_url: "https://icmgbexley.org.uk/donate",
    updated_at: "2026-05-01T18:00:00Z",
  },
  prayerTimes: {
    date: "2026-05-01",
    today: {
      fajr: "06:44",
      sunrise: "08:44",
      dhuhr: "12:47",
      asr: "14:22",
      maghrib: "16:41",
      isha: "18:27",
    },
    tomorrow: null,
    updated_at: "2026-05-01T18:00:00Z",
    effectiveSource: "manual",
    providerSource: null,
    method: null,
    fetchedAt: null,
    manualOverride: true,
    offsets: {
      fajr: 0,
      sunrise: 0,
      dhuhr: 0,
      asr: 0,
      maghrib: 0,
      isha: 0,
    },
    automaticTimes: null,
  },
  dailyContent: {
    arabic: "إن تجتنبوا كبائر ما تنهون عنه نكفر عنكم سيئاتكم وندخلكم مدخلا كريما",
    translation: {
      en: "If you avoid the major sins forbidden to you, We will remove your lesser sins and admit you to a noble entrance.",
      tr: "Eğer size yasaklanan günahların büyüklerinden kaçınırsanız, sizin küçük günahlarınızı örteriz ve sizi güzel bir yere koyarız.",
    },
    source: "Nisâ Suresi 31. Ayet",
    type: "ayah",
    updated_at: "2026-05-01T18:00:00Z",
  },
  ticker: {
    text: {
      en: "Cleanliness is part of faith. (Hadith)",
      tr: "Temizlik imandandır. (Hadis-i Şerif)",
    },
    type: "hadith",
    updated_at: "2026-05-01T18:00:00Z",
  },
  announcements: [
    {
      id: "announcement-1",
      text: {
        en: "Jumu'ah prayer will be held at 13:15.",
        tr: "Cuma namazı 13:15'te kılınacaktır.",
      },
      active: true,
      expires_at: "2026-06-01T23:59:59Z",
      created_at: "2026-05-01T18:00:00Z",
      updated_at: "2026-05-01T18:00:00Z",
    },
  ],
} satisfies DisplayData;
