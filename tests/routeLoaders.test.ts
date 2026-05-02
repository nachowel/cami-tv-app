import test from "node:test";
import assert from "node:assert/strict";

import { ADMIN_PANEL_ROUTE_IMPORT_PATH } from "../src/routes/routeLoaders.ts";

test("admin route loader points to a separate admin module for lazy loading", () => {
  assert.equal(ADMIN_PANEL_ROUTE_IMPORT_PATH, "./AdminPanel");
});
