# Awqat Salah City Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a manual city discovery workflow that logs into Awqat Salah, searches UK/London/Bexley candidates, and prints a ranked shortlist without any Firestore writes.

**Architecture:** Reuse the existing Awqat login client for authenticated HTTP calls and add a separate pure discovery/ranking helper for matching countries and ranking city candidates. The CLI orchestrates login plus place lookups, while tests stay offline via injected mock fetch responses.

**Tech Stack:** TypeScript, Node 22 `--experimental-strip-types`, GitHub Actions, Node test runner

---

### Task 1: Lock city discovery behavior with failing tests

**Files:**
- Create: `tests/awqatSalahCityDiscovery.test.ts`
- Create: `tests/awqatSalahCityDiscoveryCommand.test.ts`
- Create: `tests/awqatSalahCityDiscoveryWorkflow.test.ts`
- Modify: `tests/awqatSalahClient.test.ts`

- [ ] **Step 1: Write failing tests for authenticated place lookups and country/city ranking**
- [ ] **Step 2: Run the targeted tests to verify they fail for missing behavior**

### Task 2: Add reusable Awqat place helpers and ranking logic

**Files:**
- Modify: `scripts/prayerTimes/awqatSalahClient.ts`
- Create: `scripts/prayerTimes/awqatSalahCityDiscovery.ts`

- [ ] **Step 1: Add authenticated GET helpers for countries, states, cities, and city detail**
- [ ] **Step 2: Add pure helpers for UK country matching and ranked shortlist generation with a fallback cap**
- [ ] **Step 3: Run targeted tests and make them pass**

### Task 3: Add the city discovery CLI and manual workflow

**Files:**
- Create: `scripts/prayerTimes/findAwqatSalahCity.ts`
- Create: `.github/workflows/awqat-salah-city-discovery.yml`
- Create: `docs/awqat-salah-city-discovery.md`

- [ ] **Step 1: Implement the CLI using the reusable client + ranking helpers**
- [ ] **Step 2: Add the manual-only workflow with Awqat secrets**
- [ ] **Step 3: Document manual usage and how to choose the final `cityId`**

### Task 4: Full verification

**Files:**
- Verify only

- [ ] **Step 1: Run the new targeted tests**
- [ ] **Step 2: Run `npm run test:unit`**
- [ ] **Step 3: Run `npm run build`**
- [ ] **Step 4: Review diff to confirm zero Firestore write code was introduced**
