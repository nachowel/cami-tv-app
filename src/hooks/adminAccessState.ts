export type AdminAccessState =
  | "loading"
  | "setup-error"
  | "unauthenticated"
  | "unauthorized"
  | "authorized"
  | "error";

interface ResolveAdminAccessStateOptions {
  authorizationError: string | null;
  isAdmin: boolean;
  loading: boolean;
  setupError: string | null;
  userPresent: boolean;
}

export function resolveAdminAccessState({
  authorizationError,
  isAdmin,
  loading,
  setupError,
  userPresent,
}: ResolveAdminAccessStateOptions): AdminAccessState {
  if (loading) {
    return "loading";
  }

  if (setupError) {
    return "setup-error";
  }

  if (!userPresent) {
    return "unauthenticated";
  }

  if (authorizationError) {
    return "error";
  }

  return isAdmin ? "authorized" : "unauthorized";
}

export function getAdminClaimStatusMessage(state: AdminAccessState) {
  if (state === "unauthorized") {
    return "Hesabınız açık, ancak gerekli admin yetkisine sahip değil.";
  }

  if (state === "error") {
    return "Admin yetkisi doğrulanamadı. Lütfen tekrar deneyin veya bir yöneticiyle iletişime geçin.";
  }

  return null;
}
