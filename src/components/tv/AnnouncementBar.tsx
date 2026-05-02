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
    <section className="overflow-hidden rounded-2xl bg-white px-5 py-4 shadow-[0_12px_35px_rgba(21,54,35,0.10)] 2xl:px-9 2xl:py-6">
      <div className="flex items-center gap-4">
        <div className="text-3xl text-emerald-800 2xl:text-5xl">◢</div>
        <p className="text-xl font-black uppercase tracking-[0.06em] text-emerald-800 2xl:text-3xl">
          {t("announcements")}
        </p>
      </div>
      <ul className="mt-3 space-y-2 text-base font-medium leading-snug text-slate-700 2xl:mt-5 2xl:space-y-3 2xl:text-2xl">
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
