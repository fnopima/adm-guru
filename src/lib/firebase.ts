import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { initializeFirestore, getFirestore, Firestore, setLogLevel } from 'firebase/firestore';
import firebaseConfigData from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: firebaseConfigData.apiKey,
  authDomain: firebaseConfigData.authDomain,
  projectId: firebaseConfigData.projectId,
  storageBucket: firebaseConfigData.storageBucket,
  messagingSenderId: firebaseConfigData.messagingSenderId,
  appId: firebaseConfigData.appId,
};

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// Silence noisy internal network connection warning logs from the browser console
try {
  setLogLevel('silent');
} catch {
  // Ignore fallback
}

// Use specific databaseId if provided in config
const databaseId = firebaseConfigData.firestoreDatabaseId || '(default)';

let firestoreDb: Firestore;
try {
  // Force long polling immediately to avoid the initial WebSocket failure in iframe and sandboxed environments
  firestoreDb = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  }, databaseId);
} catch {
  firestoreDb = getFirestore(app, databaseId);
}

export const db: Firestore = firestoreDb;

export default app;
