import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const adminPanelSource = readFileSync(new URL("../src/routes/AdminPanel.tsx", import.meta.url), "utf8");
const adminSectionCardSource = readFileSync(
  new URL("../src/components/admin/AdminSectionCard.tsx", import.meta.url),
  "utf8",
);
const announcementsSectionSource = readFileSync(
  new URL("../src/components/admin/AnnouncementsSection.tsx", import.meta.url),
  "utf8",
);

test("admin panel blocks page-level horizontal overflow without duplicate mobile quick navigation", () => {
  assert.match(adminPanelSource, /overflow-x-clip/);
  assert.doesNotMatch(adminPanelSource, /aria-label="Admin section navigation"/);
  assert.doesNotMatch(adminPanelSource, /adminSectionNavItems\.map/);
});

test("authenticated admin uses a mobile-first shell with sticky status topbar", () => {
  assert.match(adminPanelSource, /admin-dashboard/);
  assert.match(adminPanelSource, /sticky top-0 z-30/);
  assert.match(adminPanelSource, /connectionStatus\.label/);
  assert.match(adminPanelSource, /saveState\.label/);
});

test("authenticated admin exposes fixed bottom tabs for primary mobile workflows", () => {
  assert.match(adminPanelSource, /adminBottomNavItems/);
  assert.match(adminPanelSource, /aria-label="Admin bottom navigation"/);
  assert.match(adminPanelSource, /fixed inset-x-0 bottom-0 z-40/);
  assert.match(adminPanelSource, /paddingBottom: "calc\(5\.5rem \+ env\(safe-area-inset-bottom\)\)"/);
  for (const label of ["Home", "Content", "Prayer", "Slides", "Settings"]) {
    assert.match(adminPanelSource, new RegExp(`label: "${label}"`));
  }
});

test("mobile bottom tabs map to existing admin sections without introducing routes", () => {
  assert.match(adminPanelSource, /targetSection: "announcements"/);
  assert.match(adminPanelSource, /targetSection: "daily-content"/);
  assert.match(adminPanelSource, /targetSection: "prayer-times"/);
  assert.match(adminPanelSource, /targetSection: "donation-display"/);
  assert.match(adminPanelSource, /targetSection: "language-settings"/);
  assert.doesNotMatch(adminPanelSource, /react-router-dom[\s\S]*adminBottomNavItems/);
});

test("admin section cards expose anchor ids and scroll offset for mobile jump navigation", () => {
  assert.match(adminSectionCardSource, /id\?: string/);
  assert.match(adminSectionCardSource, /scroll-mt-24/);
});

test("admin section cards support mobile-only accordion while desktop content remains expanded", () => {
  assert.match(adminSectionCardSource, /mobileOpen\?: boolean/);
  assert.match(adminSectionCardSource, /onMobileToggle\?: \(\) => void/);
  assert.match(adminSectionCardSource, /aria-expanded=\{mobileOpen\}/);
  assert.match(adminSectionCardSource, /sm:block/);
});

test("closed mobile section rows are compact and avoid helper text", () => {
  assert.match(adminSectionCardSource, /min-h-\[52px\]/);
  assert.match(adminSectionCardSource, /p-0[\s\S]*sm:p-6/);
  assert.match(adminSectionCardSource, /rounded-xl[\s\S]*sm:rounded-2xl/);
  assert.doesNotMatch(adminSectionCardSource, /Ayarları düzenlemek için açın/);
});

test("authenticated admin defaults mobile accordion to announcements and accordion headers open sections", () => {
  assert.match(adminPanelSource, /useState<AdminSectionId>\("announcements"\)/);
  assert.doesNotMatch(adminPanelSource, /setActiveMobileSection\(item\.id\)/);
  assert.match(adminPanelSource, /mobileOpen=\{activeMobileSection === "donation-settings"\}/);
  assert.match(adminPanelSource, /mobileOpen=\{activeMobileSection === "announcements"\}/);
});

test("authenticated admin keeps critical warnings visible while reducing helper text on mobile", () => {
  assert.match(adminPanelSource, /Yönetim verileri yükleniyor/);
  assert.match(adminPanelSource, /firestoreFallbackWarning/);
  assert.match(adminPanelSource, /className="mt-3 hidden max-w-3xl/);
  assert.match(announcementsSectionSource, /className="mt-1 hidden break-words text-sm text-slate-600 sm:block"/);
});

test("current data summary uses a single compact mobile row before desktop grid layout", () => {
  assert.match(adminPanelSource, /Dil: \{getDisplayLanguageLabel\(displaySettings\.language\)\} • Duyuru: \{announcements\.length\} • İmsak: \{prayerTimesCurrent\.today\.fajr\}/);
  assert.match(adminPanelSource, /hidden[\s\S]*sm:grid[\s\S]*lg:grid-cols-4/);
});

test("announcement form is hidden on mobile until creating or editing", () => {
  assert.match(adminPanelSource, /isAnnouncementFormVisible/);
  assert.match(adminPanelSource, /setIsAnnouncementFormVisible\(true\)/);
  assert.match(announcementsSectionSource, /isFormVisible\?: boolean/);
  assert.match(announcementsSectionSource, /isFormVisible \|\| isEditing/);
  assert.match(announcementsSectionSource, /\$\{showForm \? "block" : "hidden"\}[\s\S]*sm:block/);
});

test("announcement actions stack safely on narrow screens instead of forcing horizontal squeeze", () => {
  assert.match(announcementsSectionSource, /className="flex flex-col gap-2 sm:flex-row"/);
  assert.match(announcementsSectionSource, /min-h-11 w-full[\s\S]*sm:w-auto/);
});

test("unauthenticated admin login uses mobile app-style layout without changing submit behavior", () => {
  assert.match(adminPanelSource, /Welcome Back/);
  assert.match(adminPanelSource, /Sign in to manage the ICMG Bexley TV display/);
  assert.doesNotMatch(adminPanelSource, /\/admin yönetimi için giriş yapın/);
  assert.match(adminPanelSource, /src="\/favicon\.svg"/);
  assert.match(adminPanelSource, /min-h-\[100dvh\][\s\S]*items-center[\s\S]*justify-center/);
  assert.match(adminPanelSource, /min-h-12[\s\S]*type="email"/);
  assert.match(adminPanelSource, /min-h-12[\s\S]*type="password"/);
  assert.match(adminPanelSource, /min-h-12[\s\S]*type="submit"/);
  assert.match(adminPanelSource, /await login\(email, password\)/);
});
