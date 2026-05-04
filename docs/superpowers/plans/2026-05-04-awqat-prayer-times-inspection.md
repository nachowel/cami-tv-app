# Awqat Salah Prayer Times Inspection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a manual inspection workflow that fetches Awqat prayer times for city `14096` and prints a short sanitized field/shape summary without writing anything to Firestore.

**Architecture:** Extend the existing Awqat client with read-only prayer-time endpoints and build a separate inspection CLI/formatter that summarizes response shape and candidate keys for manual review. Keep mapping decisions out of this phase.

**Tech Stack:** TypeScript, Node 22 `--experimental-strip-types`, GitHub Actions, Node test runner

---

### Task 1: Lock inspection behavior with failing tests

**Files:**
- Modify: `tests/awqatSalahClient.test.ts`
- Create: `tests/awqatSalahPrayerTimesInspectCommand.test.ts`
- Create: `tests/awqatSalahPrayerTimesInspectWorkflow.test.ts`

- [ ] **Step 1: Write failing tests for prayer-time endpoint calls**
- [ ] **Step 2: Write failing CLI tests for sanitized inspection output**
- [ ] **Step 3: Write failing workflow test**
- [ ] **Step 4: Run targeted tests to verify they fail**

### Task 2: Add read-only client methods and inspection formatter

**Files:**
- Modify: `scripts/prayerTimes/awqatSalahClient.ts`
- Create: `scripts/prayerTimes/awqatSalahPrayerTimesInspection.ts`

- [ ] **Step 1: Add Daily/Weekly/Monthly read-only methods**
- [ ] **Step 2: Add pure inspection summary helpers**
- [ ] **Step 3: Run targeted tests and make them pass**

### Task 3: Add CLI, workflow, and docs

**Files:**
- Create: `scripts/prayerTimes/inspectAwqatSalahPrayerTimes.ts`
- Create: `.github/workflows/awqat-salah-prayer-times-inspect.yml`
- Create: `docs/awqat-salah-prayer-times-inspect.md`

- [ ] **Step 1: Implement the CLI with required Daily fetch and optional `--monthly`**
- [ ] **Step 2: Add the manual-only workflow**
- [ ] **Step 3: Document manual usage and how to read the output**

### Task 4: Verification

**Files:**
- Verify only

- [ ] **Step 1: Run the new targeted tests**
- [ ] **Step 2: Run `npm run test:unit`**
- [ ] **Step 3: Run `npm run build`**
- [ ] **Step 4: Confirm no Firestore write code was introduced**
