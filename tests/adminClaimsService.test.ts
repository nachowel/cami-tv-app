import test from "node:test";
import assert from "node:assert/strict";

import {
  getAdminUserManagementAvailability,
  readAdminUserManagementEnabledFromEnv,
} from "../src/services/adminClaimsService.ts";

test("admin user management is disabled by default", () => {
  assert.equal(readAdminUserManagementEnabledFromEnv({}), false);

  assert.deepEqual(getAdminUserManagementAvailability({}), {
    disabledReason:
      "Admin kullanıcı yönetimi şu anda kapalı. Firebase Functions ve Blaze planı etkinleştirildikten sonra açılabilir.",
    enabled: false,
  });
});

test("admin user management can be explicitly enabled once functions are deployed", () => {
  assert.equal(
    readAdminUserManagementEnabledFromEnv({
      VITE_ENABLE_ADMIN_USER_MANAGEMENT: "true",
    }),
    true,
  );

  assert.deepEqual(
    getAdminUserManagementAvailability({
      VITE_ENABLE_ADMIN_USER_MANAGEMENT: "true",
    }),
    {
      disabledReason: null,
      enabled: true,
    },
  );
});
