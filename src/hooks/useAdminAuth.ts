import { useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";
import {
  forceRefreshIdTokenResult,
  getAuthSetupError,
  loginWithEmailPassword,
  readUserIdTokenResult,
  logout as logoutFromAuth,
  subscribeToAuthState,
} from "../services/authService.ts";

function getAuthErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = String(error.code);

    if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
      return "E-posta veya şifre hatalı.";
    }

    if (code === "auth/invalid-email") {
      return "Geçerli bir e-posta adresi girin.";
    }

    if (code === "auth/too-many-requests") {
      return "Çok fazla başarısız deneme yapıldı. Lütfen daha sonra tekrar deneyin.";
    }

    if (code === "auth/network-request-failed") {
      return "Ağ bağlantısı kurulamadı. Lütfen tekrar deneyin.";
    }
  }

  return "Giriş işlemi başarısız oldu. Lütfen tekrar deneyin.";
}

export function useAdminAuth() {
  const setupError = getAuthSetupError();
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(setupError == null);
  const [error, setError] = useState<string | null>(setupError);
  const [authorizationError, setAuthorizationError] = useState<string | null>(null);
  const hasForceRefreshedRef = useRef(false);

  useEffect(() => {
    if (setupError) {
      setAuthorizationError(null);
      setIsAdmin(false);
      setLoading(false);
      setError(setupError);
      return;
    }

    let cancelled = false;
    let requestId = 0;

    const unsubscribe = subscribeToAuthState((nextUser) => {
      requestId += 1;
      const currentRequestId = requestId;

      setLoading(true);

      void (async () => {
        setUser(nextUser);

        if (!nextUser) {
          if (cancelled || currentRequestId !== requestId) {
            return;
          }

          setAuthorizationError(null);
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        try {
          let tokenResult = await readUserIdTokenResult(nextUser);

          if (!tokenResult.claims.admin && !hasForceRefreshedRef.current) {
            hasForceRefreshedRef.current = true;
            try {
              tokenResult = await forceRefreshIdTokenResult(nextUser);
            } catch {
              // Fall back to the cached token result
            }
          }

          if (cancelled || currentRequestId !== requestId) {
            return;
          }

          setAuthorizationError(null);
          setIsAdmin(tokenResult.claims.admin === true);
          setLoading(false);
        } catch (tokenError) {
          if (cancelled || currentRequestId !== requestId) {
            return;
          }

          setAuthorizationError(getAuthErrorMessage(tokenError));
          setIsAdmin(false);
          setLoading(false);
        }
      })();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [setupError]);

  async function login(email: string, password: string) {
    if (setupError) {
      setError(setupError);
      setLoading(false);
      return;
    }

    setError(null);
    setAuthorizationError(null);
    setLoading(true);

    try {
      await loginWithEmailPassword(email.trim(), password);
    } catch (loginError) {
      setError(getAuthErrorMessage(loginError));
      setLoading(false);
    }
  }

  async function logout() {
    if (setupError) {
      setError(setupError);
      setLoading(false);
      return;
    }

    setError(null);
    setAuthorizationError(null);
    setLoading(true);

    try {
      await logoutFromAuth();
    } catch (logoutError) {
      setError(getAuthErrorMessage(logoutError));
      setLoading(false);
    }
  }

  return {
    authorizationError,
    error,
    isAdmin,
    loading,
    login,
    logout,
    setupError,
    user,
  };
}
