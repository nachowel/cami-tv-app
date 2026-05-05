export interface DonationDisplayPreset {
  id: string;
  label: string;
  titleLine1: string;
  titleLine2: string;
  subtitle: string;
  ctaText: string;
}

export const DONATION_DISPLAY_PRESETS: DonationDisplayPreset[] = [
  {
    id: "urgent-support",
    label: "Urgent Support",
    titleLine1: "DONATE",
    titleLine2: "HERE TODAY",
    subtitle: "Without your donation, this masjid cannot continue.",
    ctaText: "Donate Now",
  },
  {
    id: "community-support",
    label: "Community Support",
    titleLine1: "SUPPORT",
    titleLine2: "YOUR MASJID",
    subtitle: "Help keep your local masjid open and serving the community.",
    ctaText: "Support Now",
  },
  {
    id: "every-pound-counts",
    label: "Every Pound Counts",
    titleLine1: "EVERY £1",
    titleLine2: "COUNTS",
    subtitle: "Small donations make a big difference.",
    ctaText: "Donate Now",
  },
];
