# Awqat Mapper Phase 2D Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a pure Awqat mapper that returns the full `PrayerTimesCurrent` shape while preserving Awqat HH:MM prayer values exactly and keeping existing manual/aladhan documents compatible.

**Architecture:** Add a pure mapper module under `scripts/prayerTimes/` that accepts the current prayer document, confirmed Awqat day payloads, and a fetch timestamp. Widen the existing source unions narrowly to allow `"awqat-salah"` and update normalization so legacy documents still parse while the mapper can return Awqat metadata without any Firestore or sync integration.

**Tech Stack:** TypeScript, Node test runner, existing shared prayer-time types and normalizers

---

### Task 1: Lock Mapper Contract In Tests

**Files:**
- Create: `tests/awqatPrayerTimeMapper.test.ts`
- Modify: `tests/prayerTimeDocument.test.ts`

- [ ] Add failing tests for:
  - preserved Awqat HH:MM values with no timezone shift
  - `date` derived from `gregorianDateLongIso8601`
  - automatic mode setting `effectiveSource: "awqat-salah"`
  - manual override preserving top-level effective fields while refreshing `automaticTimes`
  - existing manual/aladhan compatibility
  - acceptance of `"awqat-salah"` in `providerSource` / `effectiveSource`

### Task 2: Implement Pure Mapper And Narrow Union Support

**Files:**
- Create: `scripts/prayerTimes/awqatPrayerTimeMapper.ts`
- Modify: `src/types/display.ts`
- Modify: `src/utils/prayerTimeDocument.ts`

- [ ] Widen existing source unions narrowly to include `"awqat-salah"`
- [ ] Update document normalization so legacy values remain backward-compatible and Awqat values are accepted
- [ ] Implement the pure mapper that:
  - preserves Awqat HH:MM values exactly
  - uses `gregorianDateLongIso8601` only for normalized `date`
  - returns the full `PrayerTimesCurrent` shape
  - preserves manual override semantics

### Task 3: Verify

**Files:**
- Verify only

- [ ] Run targeted tests for the mapper and document normalization
- [ ] Run `npm run test:unit`
- [ ] Run `npm run build`
- [ ] Confirm no Firestore writes or sync integration were added
