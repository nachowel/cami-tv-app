const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type AdminClaimFunctionErrorCode =
  | "internal"
  | "invalid-argument"
  | "not-found"
  | "permission-denied";

export interface CallableAuthContext {
  token?: Record<string, unknown> | null;
  uid: string;
}

export interface AuthGatewayUser {
  customClaims?: Record<string, unknown>;
  email: string | null;
  uid: string;
}

export interface AdminClaimAuthGateway {
  getUserByEmail(email: string): Promise<AuthGatewayUser>;
  setCustomUserClaims(uid: string, claims: Record<string, unknown> | null): Promise<void>;
}

export interface ExecuteAdminClaimChangeOptions {
  auth: CallableAuthContext | null;
  email: string;
  gateway: AdminClaimAuthGateway;
  remove: boolean;
}

export class AdminClaimFunctionError extends Error {
  code: AdminClaimFunctionErrorCode;

  constructor(code: AdminClaimFunctionErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export function validateAdminEmail(email: string) {
  return emailPattern.test(email.trim());
}

export function buildNextAdminClaims(
  existingClaims: Record<string, unknown> | undefined,
  remove: boolean,
) {
  const nextClaims: Record<string, unknown> = {
    ...(existingClaims ?? {}),
  };

  if (remove) {
    delete nextClaims.admin;
    return Object.keys(nextClaims).length > 0 ? nextClaims : null;
  }

  nextClaims.admin = true;
  return nextClaims;
}

export function assertAdminCaller(auth: CallableAuthContext | null) {
  if (auth?.token?.admin === true) {
    return;
  }

  throw new AdminClaimFunctionError(
    "permission-denied",
    "Only admins can manage admin users.",
  );
}

function mapGatewayError(error: unknown): AdminClaimFunctionError {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : null;

  if (code === "auth/user-not-found") {
    return new AdminClaimFunctionError(
      "not-found",
      "No Firebase Auth user exists for that email.",
    );
  }

  return new AdminClaimFunctionError(
    "internal",
    "Unable to update the admin claim right now.",
  );
}

export async function executeAdminClaimChange({
  auth,
  email,
  gateway,
  remove,
}: ExecuteAdminClaimChangeOptions) {
  assertAdminCaller(auth);

  const normalizedEmail = email.trim().toLowerCase();
  if (!validateAdminEmail(normalizedEmail)) {
    throw new AdminClaimFunctionError("invalid-argument", "Enter a valid email address.");
  }

  try {
    const user = await gateway.getUserByEmail(normalizedEmail);
    const nextClaims = buildNextAdminClaims(user.customClaims, remove);
    await gateway.setCustomUserClaims(user.uid, nextClaims);

    return {
      admin: !remove,
      email: user.email?.trim().toLowerCase() || normalizedEmail,
      ok: true as const,
    };
  } catch (error) {
    throw mapGatewayError(error);
  }
}
