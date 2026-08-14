import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  serverTimestamp,
  Firestore
} from 'firebase/firestore';
import { getAuth, signInAnonymously, Auth } from 'firebase/auth';
import firebaseConfig from './firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db: Firestore = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export const auth: Auth = getAuth(app);

let authPromise: Promise<void> | null = null;

export const ensureAuth = async (): Promise<void> => {
  if (auth.currentUser) return;
  if (!authPromise) {
    authPromise = signInAnonymously(auth)
      .then(() => {
        console.log('Firebase auth ready (anonymous)');
      })
      .catch((err) => {
        console.warn('Anonymous auth failed or not configured, continuing with public access:', err);
      });
  }
  return authPromise;
};

export { doc, setDoc, getDoc, onSnapshot, serverTimestamp };
