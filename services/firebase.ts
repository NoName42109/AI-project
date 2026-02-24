import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getAuth, Auth } from "firebase/auth";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

let app: FirebaseApp | undefined;
let db: Firestore;
let storage: FirebaseStorage;
let auth: Auth;

let isFirebaseInitialized = false;

try {
  if (!firebaseConfig.apiKey) {
    console.warn("Firebase API Key is missing. App will run in Mock Mode.");
  } else {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    db = getFirestore(app);
    storage = getStorage(app);
    auth = getAuth(app);
    isFirebaseInitialized = true;
  }
} catch (error) {
  console.error("Firebase initialization error:", error);
  // Create dummy objects to prevent crash on import
  db = {} as Firestore;
  storage = {} as FirebaseStorage;
  auth = {} as Auth;
  isFirebaseInitialized = false;
}

export { db, storage, auth, isFirebaseInitialized };
