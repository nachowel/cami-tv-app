import test from "node:test";
import assert from "node:assert/strict";

import {
  getAdminClaimStatusMessage,
  resolveAdminAccessState,
} from "../src/hooks/adminAccessState.ts";

test("unauthenticated user stays blocked from admin access", () => {
  const result = resolveAdminAccessState({
    authorizationError: null,
    isAdmin: false,
    loading: false,
    setupError: null,
    userPresent: false,
  });

  assert.equal(result, "unauthenticated");
});

test("authenticated user without admin claim is not authorized", () => {
  const result = resolveAdminAccessState({
    authorizationError: null,
    isAdmin: false,
    loading: false,
    setupError: null,
    userPresent: true,
  });

  assert.equal(result, "unauthorized");
  assert.equal(
    getAdminClaimStatusMessage("unauthorized"),
    "Hesabınız açık, ancak gerekli admin yetkisine sahip değil.",
  );
});

test("authenticated user with admin claim can access the admin panel", () => {
  const result = resolveAdminAccessState({
    authorizationError: null,
    isAdmin: true,
    loading: false,
    setupError: null,
    userPresent: true,
  });

  assert.equal(result, "authorized");
});

test("claim check failure produces a safe blocked error state", () => {
  const result = resolveAdminAccessState({
    authorizationError: "Unable to verify admin permissions.",
    isAdmin: false,
    loading: false,
    setupError: null,
    userPresent: true,
  });

  assert.equal(result, "error");
  assert.equal(
    getAdminClaimStatusMessage("error"),
    "Admin yetkisi doğrulanamadı. Lütfen tekrar deneyin veya bir yöneticiyle iletişime geçin.",
  );
});
