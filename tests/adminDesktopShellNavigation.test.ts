import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const adminPanelSource = readFileSync(new URL("../src/routes/AdminPanel.tsx", import.meta.url), "utf8");
const globalsCss = readFileSync(new URL("../src/styles/globals.css", import.meta.url), "utf8");

function extractDesktopNavItems() {
  const navMatch = adminPanelSource.match(
    /const adminDesktopNavItems: AdminDesktopNavItem\[\] = \[([\s\S]*?)\];/,
  );
  assert.ok(navMatch, "desktop nav items config should be a flat ordered array");

  return [...navMatch[1].matchAll(/\{ icon: "[^"]+", label: "([^"]+)", targetSection: "([^"]+)" \}/g)].map(
    ([, label, targetSection]) => ({ label, targetSection }),
  );
}

test("authenticated admin renders a desktop sidebar shell ordered like the real card flow", () => {
  const navItems = extractDesktopNavItems();

  assert.match(adminPanelSource, /aria-label="Admin desktop navigation"/);
  assert.match(adminPanelSource, /ICMG Bexley TV/);
  assert.match(adminPanelSource, /Admin Paneli/);
  assert.deepEqual(navItems.map((item) => item.label), [
    "Admin Kullanıcıları",
    "Dil Ayarı",
    "Bağış Bilgileri",
    "Donation Display",
    "Duyurular",
    "Namaz Vakitleri",
    "Günün İçeriği",
    "Alt Şerit Yazısı",
    "Ekran Ayarları",
  ]);
});

test("desktop sidebar items scroll to existing admin sections without creating admin routes", () => {
  assert.deepEqual(extractDesktopNavItems().map((item) => item.targetSection), [
    "admin-users",
    "language-settings",
    "donation-settings",
    "donation-display",
    "announcements",
    "prayer-times",
    "daily-content",
    "footer-ticker",
    "theme-mode",
  ]);
  assert.match(adminPanelSource, /function handleDesktopNavSelect\(targetSection: AdminSectionId\)/);
  assert.match(adminPanelSource, /document\.getElementById\(targetSection\)\?\.scrollIntoView/);
  assert.match(adminPanelSource, /setActiveDesktopSection\(targetSection\)/);
  assert.match(adminPanelSource, /onClick=\{\(\) => handleDesktopNavSelect\(item\.targetSection\)\}/);
  assert.doesNotMatch(adminPanelSource, /react-router-dom[\s\S]*adminDesktopNavItems/);
});

test("desktop active sidebar item follows scroll position and updates breadcrumb source", () => {
  assert.match(adminPanelSource, /syncActiveDesktopSectionWithScroll/);
  assert.match(adminPanelSource, /window\.addEventListener\("scroll", syncActiveDesktopSectionWithScroll/);
  assert.match(adminPanelSource, /window\.removeEventListener\("scroll", syncActiveDesktopSectionWithScroll/);
  assert.match(adminPanelSource, /getBoundingClientRect\(\)\.top/);
  assert.match(adminPanelSource, /setActiveDesktopSection\(currentSection\)/);
  assert.match(adminPanelSource, /adminDesktopNavItems\.find\(\(item\) => item\.targetSection === activeDesktopSection\)/);
});

test("desktop click navigation keeps the clicked item active while smooth scrolling", () => {
  assert.match(adminPanelSource, /pendingDesktopScrollTarget/);
  assert.match(adminPanelSource, /pendingDesktopScrollTarget\.current = targetSection/);
  assert.match(adminPanelSource, /pendingDesktopScrollTarget\.current !== null/);
  assert.match(adminPanelSource, /return;/);
});

test("desktop topbar shows breadcrumb and live status without a fake global save action", () => {
  assert.match(adminPanelSource, /activeDesktopBreadcrumb/);
  assert.match(adminPanelSource, /Canlı/);
  assert.match(adminPanelSource, /TV'yi Aç/);
  assert.doesNotMatch(adminPanelSource, /Global Kaydet/);
});

test("desktop shell styles stay scoped to admin and protect mobile overflow", () => {
  assert.match(globalsCss, /\.admin-dashboard-shell/);
  assert.match(globalsCss, /@media \(max-width: 1023px\)[\s\S]*\.admin-dashboard-shell/);
  assert.match(globalsCss, /\.admin-dashboard-shell\s*\{[\s\S]*overflow-x:\s*clip/);
  assert.doesNotMatch(globalsCss, /\.tv-dashboard[\s\S]*admin-dashboard-shell/);
});
