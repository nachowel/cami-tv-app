import type { DisplayLanguage } from "../types/display";

export const defaultLanguage: DisplayLanguage = "en";

export const translations = {
  en: {
    announcements: "Announcements",
    cleanliness_hadith: "Cleanliness is part of faith. (Hadith)",
    daily_ayah: "Daily Ayah",
    daily_ayah_source: "Surah An-Nisa 31",
    daily_ayah_translation:
      "If you avoid the major sins forbidden to you, We will remove your lesser sins and admit you to a noble entrance.",
    donation_support_message: "Your donations help keep our mosque services running.",
    hijri: "13 Dhul Qadah 1447",
    islamic_community: "Islamic Community",
    millennium_centre: "Millennium Centre",
    next_prayer: "Next Prayer",
    no_announcements: "No active announcements.",
    partly_cloudy: "Partly Cloudy",
    prayer_asr: "Asr",
    prayer_dhuhr: "Dhuhr",
    prayer_fajr: "Fajr",
    prayer_isha: "Isha",
    prayer_maghrib: "Maghrib",
    prayer_source_note: "Prayer times are shown from the current local timetable.",
    prayer_sunrise: "Sunrise",
    prayer_times: "Prayer Times",
    scan_to_donate: "Scan to donate or visit our website.",
    support_our_mosque: "Support Our Mosque",
    time_until_maghrib: "Time until Maghrib",
    time_until_next_prayer: "Time until next prayer",
    weekly_donations: "Weekly Donations",
  },
  tr: {
    announcements: "Duyurular",
    cleanliness_hadith: "Temizlik imandandır. (Hadis-i Şerif)",
    daily_ayah: "Günün Ayeti",
    daily_ayah_source: "Nisâ Suresi 31. Ayet",
    daily_ayah_translation:
      "Eğer size yasaklanan günahların büyüklerinden kaçınırsanız, sizin küçük günahlarınızı örteriz ve sizi güzel bir yere koyarız.",
    donation_support_message: "Cami faaliyetlerimizin devamı için bağışlarınız çok kıymetli.",
    hijri: "13 Dhul Qadah 1447",
    islamic_community: "Islamic Community",
    millennium_centre: "Millennium Centre",
    next_prayer: "Sıradaki Namaz",
    no_announcements: "Aktif duyuru bulunmuyor.",
    partly_cloudy: "Parçalı Bulutlu",
    prayer_asr: "İkindi",
    prayer_dhuhr: "Öğle",
    prayer_fajr: "İmsak",
    prayer_isha: "Yatsı",
    prayer_maghrib: "Akşam",
    prayer_source_note: "Vakitler Diyanet İşleri Başkanlığı verilerine göredir.",
    prayer_sunrise: "Güneş",
    prayer_times: "Namaz Vakitleri",
    scan_to_donate: "QR kodu okutabilir veya web sitemizi ziyaret edebilirsiniz.",
    support_our_mosque: "Camimize Destek Olun",
    time_until_maghrib: "Akşama kalan süre",
    time_until_next_prayer: "Sıradaki namaza kalan süre",
    weekly_donations: "Bu Hafta Toplanan Bağış",
  },
} satisfies Record<DisplayLanguage, Record<string, string>>;

export type TranslationKey = keyof typeof translations.en;
