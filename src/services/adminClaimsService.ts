import { getFunctions, httpsCallable } from "firebase/functions";
import { firebaseApp, firebaseSetupError } from "./firebaseCore.ts";

type AdminUserManagementEnvKey = "VITE_ENABLE_ADMIN_USER_MANAGEMENT";
type AdminUserManagementEnv = Partial<Record<AdminUserManagementEnvKey, string | undefined>>;

interface AdminClaimCallableRequest {
  email: string;
}

interface AdminClaimCallableResponse {
  admin: boolean;
  email: string;
  ok: true;
}

const adminUserManagementDisabledReason =
  "Admin kullanıcı yönetimi şu anda kapalı. Firebase Functions ve Blaze planı etkinleştirildikten sonra açılabilir.";
const firebaseFunctions = firebaseApp ? getFunctions(firebaseApp) : null;

function trimEnvValue(value: string | undefined) {
  const trimmed = value?.trim().toLowerCase();
  return trimmed ? trimmed : null;
}

export function readAdminUserManagementEnabledFromEnv(env?: AdminUserManagementEnv) {
  return trimEnvValue(env?.VITE_ENABLE_ADMIN_USER_MANAGEMENT) === "true";
}

export function getAdminUserManagementAvailability(env?: AdminUserManagementEnv) {
  const enabled = readAdminUserManagementEnabledFromEnv(env);

  return {
    disabledReason: enabled ? null : adminUserManagementDisabledReason,
    enabled,
  };
}

function requireFirebaseFunctions() {
  if (!firebaseFunctions) {
    throw new Error(
      firebaseSetupError ?? "Firebase Functions kullanılamıyor. Firebase yapılandırmasını kontrol edin.",
    );
  }

  return firebaseFunctions;
}

async function callAdminClaimFunction(functionName: "grantAdminClaim" | "removeAdminClaim", email: string) {
  const callable = httpsCallable<AdminClaimCallableRequest, AdminClaimCallableResponse>(
    requireFirebaseFunctions(),
    functionName,
  );

  return callable({
    email,
  });
}

export async function grantAdminClaim(email: string) {
  await callAdminClaimFunction("grantAdminClaim", email);
}

export async function removeAdminClaim(email: string) {
  await callAdminClaimFunction("removeAdminClaim", email);
}
