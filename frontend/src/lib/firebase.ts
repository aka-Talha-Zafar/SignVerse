import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

function firebaseConfig() {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
    appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
  };
}

export function isFirebaseConfigured(): boolean {
  const c = firebaseConfig();
  return Boolean(
    c.apiKey && c.authDomain && c.projectId && c.messagingSenderId && c.appId,
  );
}

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

/**
 * Returns Firebase instances, or nulls if env is incomplete (app still runs on guest localStorage).
 */
export function getFirebase(): { app: FirebaseApp; auth: Auth; db: Firestore } | { app: null; auth: null; db: null } {
  if (!isFirebaseConfigured()) {
    return { app: null, auth: null, db: null };
  }
  if (!getApps().length) {
    const c = firebaseConfig();
    app = initializeApp({
      apiKey: c.apiKey!,
      authDomain: c.authDomain!,
      projectId: c.projectId!,
      storageBucket: c.storageBucket,
      messagingSenderId: c.messagingSenderId!,
      appId: c.appId!,
    });
  } else {
    app = getApps()[0]!;
  }
  if (!auth) auth = getAuth(app);
  if (!db) db = getFirestore(app);
  return { app, auth, db };
}
