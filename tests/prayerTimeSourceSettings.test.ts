import test from "node:test";
import assert from "node:assert/strict";

import {
  createDefaultPrayerTimeSourceSettings,
  normalizePrayerTimeSourceSettings,
} from "../src/utils/prayerTimeSourceSettings.ts";

test("missing prayer time source settings defaults to manual", () => {
  assert.deepEqual(createDefaultPrayerTimeSourceSettings(), {
    cityId: undefined,
    cityName: undefined,
    source: "manual",
    updatedAt: null,
    updatedBy: undefined,
  });

  assert.deepEqual(normalizePrayerTimeSourceSettings(null), {
    cityId: undefined,
    cityName: undefined,
    source: "manual",
    updatedAt: null,
    updatedBy: undefined,
  });
});

test("prayer time source settings normalize supported source and timestamp-like values", () => {
  const timestampLike = {
    toDate() {
      return new Date("2026-05-04T09:30:00.000Z");
    },
  };

  assert.deepEqual(
    normalizePrayerTimeSourceSettings({
      cityId: "london-1",
      cityName: "London",
      source: "awqat-salah",
      updatedAt: timestampLike,
      updatedBy: "admin@example.com",
    }),
    {
      cityId: "london-1",
      cityName: "London",
      source: "awqat-salah",
      updatedAt: "2026-05-04T09:30:00.000Z",
      updatedBy: "admin@example.com",
    },
  );
});
