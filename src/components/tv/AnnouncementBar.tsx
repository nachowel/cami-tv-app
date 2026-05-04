import { useEffect, useState } from "react";
import { useTranslation } from "../../i18n/useTranslation";
import type { Announcement, DisplayLanguage } from "../../types/display";
import { getActiveAnnouncements } from "../../utils/announcementFilters";

interface AnnouncementBarProps {
  announcements: Announcement[];
  language: DisplayLanguage;
}

function getRotationDelay() {
  return 8000 + Math.floor(Math.random() * 4001);
}

export function AnnouncementBar({ announcements, language }: AnnouncementBarProps) {
  const { t } = useTranslation(language);
  const [now, setNow] = useState(() => new Date());
  const [currentIndex, setCurrentIndex] = useState(0);
  const activeAnnouncements = getActiveAnnouncements(announcements, now);
  const announcementItems = activeAnnouncements.map((announcement) => announcement.text[language]);
  const fallbackText = language === "tr" ? "Şu anda duyuru yok." : "No announcements at the moment.";
  const visibleAnnouncements = announcementItems.length
    ? [announcementItems[currentIndex % announcementItems.length]]
    : [fallbackText];

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 10_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    setCurrentIndex(0);
  }, [language, announcementItems.length]);

  useEffect(() => {
    if (announcementItems.length <= 1) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCurrentIndex((value) => (value + 1) % announcementItems.length);
    }, getRotationDelay());

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [announcementItems.length, currentIndex]);

  return (
    <section className="overflow-hidden rounded-2xl bg-white px-[clamp(0.9rem,1.4vw,2rem)] py-[clamp(0.85rem,1.25vw,1.5rem)] shadow-[0_12px_35px_rgba(21,54,35,0.10)]">
      <div className="flex items-center gap-[clamp(0.65rem,0.95vw,1.25rem)]">
        <div className="text-[clamp(1.35rem,2.2vw,2.6rem)] text-emerald-800">◢</div>
        <p className="text-[clamp(1rem,1.7vw,1.7rem)] font-black uppercase tracking-[0.06em] text-emerald-800">
          {t("announcements")}
        </p>
      </div>
      <ul className="mt-[clamp(0.5rem,0.85vw,1rem)] space-y-[clamp(0.35rem,0.6vw,0.75rem)] text-[clamp(0.9rem,1.25vw,1.35rem)] font-medium leading-snug text-slate-700">
        {visibleAnnouncements.map((announcement) => (
          <li className="flex gap-3" key={announcement}>
            <span className="text-emerald-800">•</span>
            <span>{announcement}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
