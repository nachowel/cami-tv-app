import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";

type FirebaseEnvKey =
  | "VITE_FIREBASE_API_KEY"
  | "VITE_FIREBASE_AUTH_DOMAIN"
  | "VITE_FIREBASE_PROJECT_ID"
  | "VITE_FIREBASE_APP_ID";

type FirebaseEnv = Partial<Record<FirebaseEnvKey, string | undefined>>;

export interface FirebaseClientConfig {
  apiKey: string;
  appId: string;
  authDomain: string;
  projectId: string;
}

const firebaseSetupErrorMessage =
  "Firebase Auth yapılandırılmamış. /admin kullanımı için gerekli Vite Firebase ortam değişkenlerini ekleyin.";

function trimEnvValue(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function readFirebaseConfigFromEnv(env?: FirebaseEnv): FirebaseClientConfig | null {
  const apiKey = trimEnvValue(env?.VITE_FIREBASE_API_KEY);
  const authDomain = trimEnvValue(env?.VITE_FIREBASE_AUTH_DOMAIN);
  const projectId = trimEnvValue(env?.VITE_FIREBASE_PROJECT_ID);
  const appId = trimEnvValue(env?.VITE_FIREBASE_APP_ID);

  if (!apiKey || !authDomain || !projectId || !appId) {
    return null;
  }

  return {
    apiKey,
    appId,
    authDomain,
    projectId,
  };
}

export function getFirebaseSetupError(config: FirebaseClientConfig | null) {
  return config ? null : firebaseSetupErrorMessage;
}

export function readFirebaseConfigFromImportMetaEnv(
  meta: ImportMeta & {
    env?: FirebaseEnv;
  },
): FirebaseClientConfig | null {
  return readFirebaseConfigFromEnv({
    VITE_FIREBASE_API_KEY: meta.env?.VITE_FIREBASE_API_KEY,
    VITE_FIREBASE_AUTH_DOMAIN: meta.env?.VITE_FIREBASE_AUTH_DOMAIN,
    VITE_FIREBASE_PROJECT_ID: meta.env?.VITE_FIREBASE_PROJECT_ID,
    VITE_FIREBASE_APP_ID: meta.env?.VITE_FIREBASE_APP_ID,
  });
}

const runtimeFirebaseEnv: FirebaseEnv =
  typeof import.meta.env === "object" && import.meta.env !== null
    ? {
        VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
        VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
      }
    : {};

export const firebaseConfig = readFirebaseConfigFromEnv(runtimeFirebaseEnv);
export const firebaseSetupError = getFirebaseSetupError(firebaseConfig);
export const firebaseApp: FirebaseApp | null = firebaseConfig
  ? getApps().length > 0
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;
