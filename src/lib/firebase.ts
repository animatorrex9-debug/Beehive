/// <reference types="vite/client" />
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  initializeAuth, 
  browserLocalPersistence, 
  browserPopupRedirectResolver,
  indexedDBLocalPersistence
} from "firebase/auth";
import { getFirestore, initializeFirestore, doc, getDocFromServer } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { safeStringify } from "./utils";
import firebaseConfig from "../../firebase-applet-config.json";

let app: any;
let auth: any;
let db: any;
let storage: any;
let isConfigured = false;

// Validate config
const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'appId'];
const missingKeys = requiredKeys.filter(key => !firebaseConfig[key as keyof typeof firebaseConfig]);

if (missingKeys.length > 0) {
  const errorMessage = `Firebase configuration error: Missing required fields in firebase-applet-config.json: ${missingKeys.join(', ')}`;
  console.error(errorMessage);
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
  // Auto-detect long polling to ensure stability when WebSockets are unreliable
  db = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
  }, (firebaseConfig as any).firestoreDatabaseId || '(default)');
  
  storage = getStorage(app);
  isConfigured = true;

  // Test connection to Firestore
  const testConnection = async () => {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
      console.log("[Firebase] Firestore connection test successful.");
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : String(error);
      if (errMessage.includes('the client is offline')) {
        console.error(`[Firebase] Connection Error: The client is offline. This usually means your projectId ("${firebaseConfig.projectId}") or other config is incorrect, or the backend is unreachable.`);
      } else {
        console.warn(`[Firebase] Firestore connection test failed with error: ${errMessage}`);
      }
    }
  };
  testConnection();
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  // Extract error message safely
  let errorMessage = 'Unknown error';
  let errorCode = '';
  
  if (error instanceof Error) {
    errorMessage = error.message;
    if ('code' in error) errorCode = String((error as any).code);
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else if (error && typeof error === 'object') {
    try {
      errorMessage = (error as any).message || (error as any).description || 'Object error (see console)';
      if ('code' in error) errorCode = String((error as any).code);
    } catch (e) {
      errorMessage = 'Error object could not be processed';
    }
  } else {
    errorMessage = String(error);
  }

  // Safely extract auth info without including circular objects
  const currentAuth = auth;
  const currentUser = currentAuth?.currentUser;
  
  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: currentUser?.uid || undefined,
      email: currentUser?.email || undefined,
      emailVerified: currentUser?.emailVerified || undefined,
      isAnonymous: currentUser?.isAnonymous || undefined,
      tenantId: currentUser?.tenantId || undefined,
      providerInfo: Array.isArray(currentUser?.providerData) 
        ? currentUser?.providerData.map((provider: any) => ({
            providerId: String(provider.providerId || ''),
            displayName: provider.displayName ? String(provider.displayName) : null,
            email: provider.email ? String(provider.email) : null,
            photoUrl: provider.photoURL ? String(provider.photoURL) : null
          })) 
        : []
    },
    operationType,
    path
  }
  
  // Add error code if available
  if (errorCode) {
    (errInfo as any).code = errorCode;
  }
  
  let errString = '';
  try {
    errString = safeStringify(errInfo);
  } catch (e) {
    // Fallback if safeStringify still fails for some reason
    errString = `[Circular Error Info] ${errorMessage} at ${path} (${operationType})`;
    console.error('Failed to stringify Firestore error info:', e);
  }
  
  console.error('Firestore Error: ', errString);
  throw new Error(errString);
}

export { auth, db, storage, isConfigured };
export default app;
