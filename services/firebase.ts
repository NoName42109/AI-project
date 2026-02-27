import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getAuth, Auth } from "firebase/auth";

// Helper to get env variables in both Vite and Node.js environments
const getEnv = (key: string) => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    // @ts-ignore
    return import.meta.env[key];
  }
  return undefined;
};

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY'),
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('VITE_FIREBASE_APP_ID'),
  measurementId: getEnv('VITE_FIREBASE_MEASUREMENT_ID')
};

let app: FirebaseApp | undefined;
let db: Firestore;
let storage: FirebaseStorage;
let auth: Auth;

let isFirebaseInitialized = false;

function initialize() {
  try {
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      console.warn("Firebase configuration is incomplete. App will run in Mock Mode.");
      // Create dummy objects to prevent crash on import
      db = {} as Firestore;
      storage = {} as FirebaseStorage;
      auth = {} as Auth;
      isFirebaseInitialized = false;
    } else {
      app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
      db = getFirestore(app);
      storage = getStorage(app);
      auth = getAuth(app);
      isFirebaseInitialized = true;
      console.log("[Firebase] Initialized successfully for project:", firebaseConfig.projectId);
    }
  } catch (error) {
    console.error("Firebase initialization error:", error);
    // Create dummy objects to prevent crash on import
    db = {} as Firestore;
    storage = {} as FirebaseStorage;
    auth = {} as Auth;
    isFirebaseInitialized = false;
  }
}

initialize();

export { db, storage, auth, isFirebaseInitialized };
