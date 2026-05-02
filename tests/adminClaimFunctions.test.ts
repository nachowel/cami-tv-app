import test from "node:test";
import assert from "node:assert/strict";

import {
  AdminClaimFunctionError,
  executeAdminClaimChange,
  type AuthGatewayUser,
} from "../functions/src/adminClaimFunctions.ts";

function createGateway(user: AuthGatewayUser) {
  const calls: Array<Record<string, unknown> | null> = [];

  return {
    calls,
    gateway: {
      async getUserByEmail(email: string) {
        return {
          ...user,
          email,
        };
      },
      async setCustomUserClaims(_uid: string, claims: Record<string, unknown> | null) {
        calls.push(claims);
      },
    },
  };
}

test("grant admin claim preserves existing claims and sets admin true", async () => {
  const { calls, gateway } = createGateway({
    customClaims: {
      editor: true,
      location: "bexley",
    },
    email: "someone@example.com",
    uid: "user-1",
  });

  const result = await executeAdminClaimChange({
    auth: {
      token: {
        admin: true,
      },
      uid: "caller-1",
    },
    email: " someone@example.com ",
    gateway,
    remove: false,
  });

  assert.deepEqual(calls, [
    {
      admin: true,
      editor: true,
      location: "bexley",
    },
  ]);
  assert.deepEqual(result, {
    admin: true,
    email: "someone@example.com",
    ok: true,
  });
});

test("remove admin claim deletes only admin and preserves other claims", async () => {
  const { calls, gateway } = createGateway({
    customClaims: {
      admin: true,
      editor: true,
      location: "bexley",
    },
    email: "someone@example.com",
    uid: "user-2",
  });

  const result = await executeAdminClaimChange({
    auth: {
      token: {
        admin: true,
      },
      uid: "caller-2",
    },
    email: "someone@example.com",
    gateway,
    remove: true,
  });

  assert.deepEqual(calls, [
    {
      editor: true,
      location: "bexley",
    },
  ]);
  assert.deepEqual(result, {
    admin: false,
    email: "someone@example.com",
    ok: true,
  });
});

test("invalid email is rejected before any auth lookup", async () => {
  let called = false;

  await assert.rejects(
    () =>
      executeAdminClaimChange({
        auth: {
          token: {
            admin: true,
          },
          uid: "caller-3",
        },
        email: "invalid-email",
        gateway: {
          async getUserByEmail() {
            called = true;
            throw new Error("should not run");
          },
          async setCustomUserClaims() {
            called = true;
          },
        },
        remove: false,
      }),
    (error: unknown) => {
      assert.ok(error instanceof AdminClaimFunctionError);
      assert.equal(error.code, "invalid-argument");
      return true;
    },
  );

  assert.equal(called, false);
});

test("non-admin caller is rejected", async () => {
  const { gateway } = createGateway({
    customClaims: {},
    email: "someone@example.com",
    uid: "user-3",
  });

  await assert.rejects(
    () =>
      executeAdminClaimChange({
        auth: {
          token: {},
          uid: "caller-4",
        },
        email: "someone@example.com",
        gateway,
        remove: false,
      }),
    (error: unknown) => {
      assert.ok(error instanceof AdminClaimFunctionError);
      assert.equal(error.code, "permission-denied");
      return true;
    },
  );
});

test("missing Firebase Auth user becomes a safe not-found error", async () => {
  await assert.rejects(
    () =>
      executeAdminClaimChange({
        auth: {
          token: {
            admin: true,
          },
          uid: "caller-5",
        },
        email: "missing@example.com",
        gateway: {
          async getUserByEmail() {
            const error = new Error("user not found") as Error & {
              code?: string;
            };
            error.code = "auth/user-not-found";
            throw error;
          },
          async setCustomUserClaims() {},
        },
        remove: false,
      }),
    (error: unknown) => {
      assert.ok(error instanceof AdminClaimFunctionError);
      assert.equal(error.code, "not-found");
      assert.equal(error.message, "No Firebase Auth user exists for that email.");
      return true;
    },
  );
});
