import test from "node:test";
import assert from "node:assert/strict";

import {
  validateAnnouncement,
  validateDailyContent,
  validateDonationAmount,
  validateDonationUrl,
  validatePrayerTime,
  validateTicker,
} from "../src/utils/validation.ts";

test("validateDonationUrl accepts a valid https URL", () => {
  const result = validateDonationUrl("https://icmgbexley.org.uk/donate");

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("validateDonationUrl rejects a missing protocol URL", () => {
  const result = validateDonationUrl("icmgbexley.org.uk/donate");

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("Bağış bağlantısı geçerli bir http/https adresi olmalıdır."));
});

test("validatePrayerTime rejects an invalid time value", () => {
  const result = validatePrayerTime("24:61");

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("Namaz vakti 00:00 ile 23:59 arasında HH:mm formatında olmalıdır."));
});

test("validateAnnouncement requires both English and Turkish text", () => {
  const result = validateAnnouncement({
    textEn: "",
    textTr: " ",
    expiresOn: "",
  });

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("İngilizce metin gerekli."));
  assert.ok(result.errors.includes("Türkçe metin gerekli."));
});

test("validateAnnouncement rejects overlong English and Turkish text", () => {
  const result = validateAnnouncement({
    textEn: "a".repeat(141),
    textTr: "b".repeat(141),
    expiresOn: "",
  });

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("İngilizce metin en fazla 140 karakter olabilir."));
  assert.ok(result.errors.includes("Türkçe metin en fazla 140 karakter olabilir."));
});

test("validateDailyContent rejects too-long localized translations", () => {
  const result = validateDailyContent({
    arabic: "Short Arabic",
    translationEn: "a".repeat(221),
    translationTr: "b".repeat(221),
    source: "Nisa 31",
    type: "ayah",
  });

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("İngilizce çeviri TV ekranı için çok uzun (en fazla 220 karakter)."));
  assert.ok(result.errors.includes("Türkçe çeviri TV ekranı için çok uzun (en fazla 220 karakter)."));
});

test("validateDailyContent accepts a complete valid localized payload", () => {
  const result = validateDailyContent({
    arabic: "Short Arabic",
    translationEn: "Short English",
    translationTr: "Kisa Turkce",
    source: "Nisa 31",
    type: "ayah",
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("validateDonationAmount requires a non-negative number", () => {
  const empty = validateDonationAmount("");
  const negative = validateDonationAmount("-1");
  const valid = validateDonationAmount("125");

  assert.equal(empty.valid, false);
  assert.ok(empty.errors.includes("Bağış tutarı gerekli."));
  assert.equal(negative.valid, false);
  assert.ok(negative.errors.includes("Bağış tutarı 0 veya daha büyük olmalıdır."));
  assert.equal(valid.valid, true);
});

test("validateTicker requires at least one language text", () => {
  const result = validateTicker({ textEn: "", textTr: "", type: "hadith" });

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("En az bir dilde metin gerekli."));
});

test("validateTicker rejects overlong English and Turkish text", () => {
  const result = validateTicker({ textEn: "a".repeat(121), textTr: "b".repeat(121), type: "message" });

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("İngilizce metin en fazla 120 karakter olabilir."));
  assert.ok(result.errors.includes("Türkçe metin en fazla 120 karakter olabilir."));
});

test("validateTicker accepts valid single-language and bilingual payloads", () => {
  const single = validateTicker({ textEn: "English only", textTr: "", type: "hadith" });
  const bilingual = validateTicker({ textEn: "English", textTr: "Turkce", type: "message" });

  assert.equal(single.valid, true);
  assert.deepEqual(single.errors, []);
  assert.equal(bilingual.valid, true);
  assert.deepEqual(bilingual.errors, []);
});

test("validateTicker rejects invalid type", () => {
  const result = validateTicker({ textEn: "Valid", textTr: "", type: "invalid" });

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("Tür hadis veya mesaj olmalıdır."));
});
