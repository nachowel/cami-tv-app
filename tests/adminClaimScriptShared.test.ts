import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAdminClaimUpdate,
  parseAdminClaimArguments,
  validateAdminClaimEmail,
} from "../scripts/auth/adminClaimScriptShared.ts";

test("validateAdminClaimEmail accepts a valid email", () => {
  assert.equal(validateAdminClaimEmail("someone@example.com"), true);
});

test("validateAdminClaimEmail rejects an invalid email", () => {
  assert.equal(validateAdminClaimEmail("someone-example.com"), false);
  assert.equal(validateAdminClaimEmail(""), false);
});

test("parseAdminClaimArguments reads email and remove flag", () => {
  assert.deepEqual(
    parseAdminClaimArguments(["--email", "someone@example.com", "--remove"]),
    {
      email: "someone@example.com",
      help: false,
      remove: true,
    },
  );
});

test("buildAdminClaimUpdate preserves existing claims when setting admin", () => {
  assert.deepEqual(
    buildAdminClaimUpdate({
      existingClaims: {
        editor: true,
        location: "bexley",
      },
      remove: false,
    }),
    {
      admin: true,
      editor: true,
      location: "bexley",
    },
  );
});

test("buildAdminClaimUpdate removes only the admin claim", () => {
  assert.deepEqual(
    buildAdminClaimUpdate({
      existingClaims: {
        admin: true,
        editor: true,
        location: "bexley",
      },
      remove: true,
    }),
    {
      editor: true,
      location: "bexley",
    },
  );
});
