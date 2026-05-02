import test from "node:test";
import assert from "node:assert/strict";

import {
  getFirebaseSetupError,
  readFirebaseConfigFromImportMetaEnv,
  readFirebaseConfigFromEnv,
} from "../src/services/firebaseCore.ts";

test("readFirebaseConfigFromEnv returns config when all required env values exist", () => {
  const config = readFirebaseConfigFromEnv({
    VITE_FIREBASE_API_KEY: "api-key",
    VITE_FIREBASE_APP_ID: "app-id",
    VITE_FIREBASE_AUTH_DOMAIN: "example.firebaseapp.com",
    VITE_FIREBASE_PROJECT_ID: "project-id",
  });

  assert.deepEqual(config, {
    apiKey: "api-key",
    appId: "app-id",
    authDomain: "example.firebaseapp.com",
    projectId: "project-id",
  });
  assert.equal(getFirebaseSetupError(config), null);
});

test("readFirebaseConfigFromEnv returns null and exposes a setup error when env is incomplete", () => {
  const config = readFirebaseConfigFromEnv({
    VITE_FIREBASE_API_KEY: "api-key",
    VITE_FIREBASE_APP_ID: "",
    VITE_FIREBASE_AUTH_DOMAIN: "example.firebaseapp.com",
    VITE_FIREBASE_PROJECT_ID: "",
  });

  assert.equal(config, null);
  assert.equal(
    getFirebaseSetupError(config),
    "Firebase Auth yapılandırılmamış. /admin kullanımı için gerekli Vite Firebase ortam değişkenlerini ekleyin.",
  );
});

test("readFirebaseConfigFromImportMetaEnv reads Vite env values from import.meta", () => {
  const config = readFirebaseConfigFromImportMetaEnv({
    env: {
      VITE_FIREBASE_API_KEY: "api-key",
      VITE_FIREBASE_APP_ID: "app-id",
      VITE_FIREBASE_AUTH_DOMAIN: "example.firebaseapp.com",
      VITE_FIREBASE_PROJECT_ID: "project-id",
    },
  });

  assert.deepEqual(config, {
    apiKey: "api-key",
    appId: "app-id",
    authDomain: "example.firebaseapp.com",
    projectId: "project-id",
  });
});
