import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import process from "node:process";

import { mockDisplayData } from "../src/data/mockDisplayData.ts";
import { FIRESTORE_PATHS, getAnnouncementDocumentPath } from "../src/shared/firestorePaths.ts";
import {
  buildFirestoreSeedPlan,
  parseSeedArguments,
  shouldWriteSeedTarget,
} from "../scripts/firestore/seedFirestoreShared.ts";

test("buildFirestoreSeedPlan maps mock display data into the required singleton document paths", () => {
  const plan = buildFirestoreSeedPlan(mockDisplayData);

  assert.deepEqual(plan.singletons, [
    {
      data: mockDisplayData.settings,
      path: FIRESTORE_PATHS.settingsDisplay,
    },
    {
      data: mockDisplayData.donation,
      path: FIRESTORE_PATHS.donationCurrent,
    },
    {
      data: mockDisplayData.prayerTimes,
      path: FIRESTORE_PATHS.prayerTimesCurrent,
    },
    {
      data: mockDisplayData.dailyContent,
      path: FIRESTORE_PATHS.dailyContentCurrent,
    },
    {
      data: mockDisplayData.ticker,
      path: FIRESTORE_PATHS.tickerCurrent,
    },
  ]);
});

test("buildFirestoreSeedPlan uses stable announcement document ids to avoid duplicates across reruns", () => {
  const plan = buildFirestoreSeedPlan(mockDisplayData);

  assert.deepEqual(
    plan.announcements.map((entry) => entry.documentId),
    mockDisplayData.announcements.map((announcement) => announcement.id),
  );
  assert.deepEqual(
    plan.announcements.map((entry) => entry.path),
    mockDisplayData.announcements.map((announcement) => getAnnouncementDocumentPath(announcement.id)),
  );
});

test("shouldWriteSeedTarget skips existing documents unless force is enabled", () => {
  assert.equal(shouldWriteSeedTarget({ exists: false, force: false }), true);
  assert.equal(shouldWriteSeedTarget({ exists: true, force: false }), false);
  assert.equal(shouldWriteSeedTarget({ exists: true, force: true }), true);
});

test("parseSeedArguments enables overwrite only with explicit --force", () => {
  assert.deepEqual(parseSeedArguments([]), {
    force: false,
    help: false,
  });
  assert.deepEqual(parseSeedArguments(["--force"]), {
    force: true,
    help: false,
  });
  assert.deepEqual(parseSeedArguments(["--help"]), {
    force: false,
    help: true,
  });
});

test("seedFirestore help path works without Firebase credentials", () => {
  const result = spawnSync(
    process.execPath,
    ["--experimental-strip-types", "scripts/firestore/seedFirestore.ts", "--help"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
    },
  );

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage: npm run seed:firestore -- \[--force\]/);
  assert.match(result.stdout, /Creates missing Firestore seed documents/);
  assert.doesNotMatch(result.stderr, /Firestore seed failed/);
});
