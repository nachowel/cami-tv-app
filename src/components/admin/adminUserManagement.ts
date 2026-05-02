import {
  createErrorStatus,
  createSavedStatus,
  type AdminSaveResult,
} from "./adminPersistence.ts";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface CommitAdminUserClaimChangeOptions {
  email: string;
  mutation: (email: string) => Promise<void>;
  successMessage: (email: string) => string;
}

export interface AdminUserClaimChangeResult extends AdminSaveResult<string> {
  normalizedEmail: string | null;
}

function isValidEmail(email: string) {
  return emailPattern.test(email);
}

function getFirebaseFunctionErrorCode(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error) {
    return String(error.code);
  }

  return null;
}

export function getAdminUserManagementErrorMessage(error: unknown) {
  const code = getFirebaseFunctionErrorCode(error);

  if (code === "functions/invalid-argument" || code === "invalid-argument") {
    return "Geçerli bir e-posta adresi girin.";
  }

  if (code === "functions/not-found" || code === "not-found") {
    return "Bu e-posta adresi için Firebase Auth kullanıcısı bulunamadı.";
  }

  if (code === "functions/permission-denied" || code === "permission-denied") {
    return "Admin kullanıcılarını yönetme yetkiniz yok.";
  }

  return "Admin kullanıcı güncellemesi başarısız oldu. Lütfen tekrar deneyin.";
}

export async function commitAdminUserClaimChange({
  email,
  mutation,
  successMessage,
}: CommitAdminUserClaimChangeOptions): Promise<AdminUserClaimChangeResult> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!isValidEmail(normalizedEmail)) {
    return {
      committed: false,
      normalizedEmail: null,
      status: createErrorStatus("Geçerli bir e-posta adresi girin."),
      valueToApply: null,
    };
  }

  try {
    await mutation(normalizedEmail);

    return {
      committed: true,
      normalizedEmail,
      status: createSavedStatus(successMessage(normalizedEmail)),
      valueToApply: normalizedEmail,
    };
  } catch (error) {
    return {
      committed: false,
      normalizedEmail: null,
      status: createErrorStatus(getAdminUserManagementErrorMessage(error)),
      valueToApply: null,
    };
  }
}
