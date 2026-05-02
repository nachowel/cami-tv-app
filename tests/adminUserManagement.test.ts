import test from "node:test";
import assert from "node:assert/strict";

import { commitAdminUserClaimChange } from "../src/components/admin/adminUserManagement.ts";

test("grant admin access returns a saved status and trims the email", async () => {
  let calledWith: string | null = null;

  const result = await commitAdminUserClaimChange({
    email: " someone@example.com ",
    mutation: async (email) => {
      calledWith = email;
    },
    successMessage: (email) => `${email} için admin yetkisi verildi.`,
  });

  assert.equal(calledWith, "someone@example.com");
  assert.equal(result.committed, true);
  assert.equal(result.normalizedEmail, "someone@example.com");
  assert.equal(result.status.tone, "saved");
  assert.equal(result.status.message, "someone@example.com için admin yetkisi verildi.");
});

test("permission errors are converted into clean admin-user status messages", async () => {
  const result = await commitAdminUserClaimChange({
    email: "someone@example.com",
    mutation: async () => {
      const error = new Error("permission denied") as Error & {
        code?: string;
      };
      error.code = "functions/permission-denied";
      throw error;
    },
    successMessage: (email) => `${email} için admin yetkisi verildi.`,
  });

  assert.equal(result.committed, false);
  assert.equal(result.normalizedEmail, null);
  assert.equal(result.status.tone, "error");
  assert.equal(
    result.status.message,
    "Admin kullanıcılarını yönetme yetkiniz yok.",
  );
});

test("user-not-found errors are converted into a clean error message", async () => {
  const result = await commitAdminUserClaimChange({
    email: "missing@example.com",
    mutation: async () => {
      const error = new Error("missing user") as Error & {
        code?: string;
      };
      error.code = "functions/not-found";
      throw error;
    },
    successMessage: (email) => `${email} için admin yetkisi kaldırıldı.`,
  });

  assert.equal(result.committed, false);
  assert.equal(result.status.tone, "error");
  assert.equal(result.status.message, "Bu e-posta adresi için Firebase Auth kullanıcısı bulunamadı.");
});

test("invalid email is blocked with a clean message", async () => {
  const result = await commitAdminUserClaimChange({
    email: "invalid-email",
    mutation: async () => {},
    successMessage: (email) => `${email} için admin yetkisi verildi.`,
  });

  assert.equal(result.committed, false);
  assert.equal(result.normalizedEmail, null);
  assert.equal(result.status.tone, "error");
  assert.equal(result.status.message, "Geçerli bir e-posta adresi girin.");
});
