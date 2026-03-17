/// <reference types="vite/client" />
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  initializeAuth, 
  browserLocalPersistence, 
  browserPopupRedirectResolver,
  indexedDBLocalPersistence
} from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Validate config
const requiredKeys = {
  apiKey: 'VITE_FIREBASE_API_KEY',
  authDomain: 'VITE_FIREBASE_AUTH_DOMAIN',
  projectId: 'VITE_FIREBASE_PROJECT_ID',
  appId: 'VITE_FIREBASE_APP_ID'
} as const;

const missingKeys = (Object.keys(requiredKeys) as Array<keyof typeof requiredKeys>)
  .filter(key => !firebaseConfig[key]);

let app: any;
let auth: any;
let db: any;
let storage: any;
let isConfigured = false;

if (missingKeys.length > 0) {
  const errorMessage = `Firebase configuration error: Missing required environment variables: ${missingKeys.map(k => requiredKeys[k]).join(', ')}`;
  console.error(errorMessage);
  console.warn('To fix this, please create a /.env file and add your Firebase project credentials. See /.env.example for the required format.');
} else {
  // Initialize Firebase
  app = initializeApp(firebaseConfig);
  
  // Use initializeAuth with explicit persistence for better iframe support
  try {
    auth = initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence],
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  } catch (e) {
    // Fallback if already initialized
    auth = getAuth(app);
  }
  
  // Initialize Firestore with settings to prevent internal assertion failures in iframe/proxy environments
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  });
  
  storage = getStorage(app);
  isConfigured = true;
}

export { auth, db, storage, isConfigured };
export default app;
