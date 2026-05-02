import {
  getIdTokenResult,
  getAuth,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signOut,
  type IdTokenResult,
  type Unsubscribe,
  type User,
} from "firebase/auth";
import { firebaseApp, firebaseSetupError } from "./firebaseCore.ts";

const firebaseAuth = firebaseApp ? getAuth(firebaseApp) : null;

function requireFirebaseAuth() {
  if (!firebaseAuth) {
    throw new Error(
      firebaseSetupError ?? "Firebase Auth is unavailable. Check the Firebase configuration.",
    );
  }

  return firebaseAuth;
}

export async function loginWithEmailPassword(email: string, password: string) {
  return signInWithEmailAndPassword(requireFirebaseAuth(), email, password);
}

export async function logout() {
  return signOut(requireFirebaseAuth());
}

export function subscribeToAuthState(callback: (user: User | null) => void): Unsubscribe {
  if (!firebaseAuth) {
    callback(null);
    return () => {};
  }

  return onIdTokenChanged(firebaseAuth, callback);
}

export function readUserIdTokenResult(user: User): Promise<IdTokenResult> {
  return getIdTokenResult(user);
}

export function forceRefreshIdTokenResult(user: User): Promise<IdTokenResult> {
  return getIdTokenResult(user, true);
}

export function getAuthSetupError() {
  return firebaseSetupError;
}
