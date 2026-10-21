import { 
  db, 
  auth, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot 
} from '../firebase';
import { sanitizeDataForFirestore } from './storage';
import type { Client, Product, SavedQuote, CompanyInfo, QuoteSettings, UserProfile } from '../types';

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
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function isOfflineError(error: unknown): boolean {
  if (!error) return false;
  const msg = error instanceof Error ? error.message : String(error);
  const code = (error as any)?.code;
  const combined = (msg + ' ' + (code || '')).toLowerCase();
  return (
    combined.includes('offline') ||
    combined.includes('failed to get document because the client is offline') ||
    combined.includes('client is offline') ||
    combined.includes('unavailable') ||
    combined.includes('network')
  );
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  // Gracefully handle offline or network disconnect without console.error or crashing
  if (isOfflineError(error)) {
    console.warn(`[Firestore Offline] Operação ${operationType} em ${path}: dispositivo está operando offline. Dados salvos localmente.`);
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface UserIsolatedData {
  uid: string;
  clients: Client[];
  products: Product[];
  savedQuotes: SavedQuote[];
  companyInfo: CompanyInfo | null;
  quoteSettings: QuoteSettings | null;
  professionalSegment?: string;
  customSegmentName?: string;
  lastUpdated: number;
}

/**
 * Returns a storage key scoped to the specific user's UID to prevent cross-contamination in localStorage.
 */
export function getScopedStorageKey(baseKey: string, uid?: string | null): string {
  if (!uid) return `${baseKey}_local`;
  return `${baseKey}_${uid}`;
}

/**
 * Saves all user data to their isolated cloud Firestore document: /users/{userId}/data/current
 */
export async function saveUserCloudData(
  uid: string,
  data: {
    clients: Client[];
    products: Product[];
    savedQuotes: SavedQuote[];
    companyInfo: CompanyInfo | null;
    quoteSettings: QuoteSettings | null;
    professionalSegment?: string;
    customSegmentName?: string;
  }
): Promise<void> {
  if (!uid || !db) return;
  const path = `users/${uid}/data/current`;

  const payload: UserIsolatedData = {
    uid,
    clients: data.clients || [],
    products: data.products || [],
    savedQuotes: data.savedQuotes || [],
    companyInfo: data.companyInfo || null,
    quoteSettings: data.quoteSettings || null,
    professionalSegment: data.professionalSegment || data.companyInfo?.professionalSegment || 'personalizado',
    customSegmentName: data.customSegmentName || data.companyInfo?.customSegmentName || '',
    lastUpdated: Date.now(),
  };

  const cleanPayload = sanitizeDataForFirestore(payload);

  try {
    const dataDocRef = doc(db, 'users', uid, 'data', 'current');
    await setDoc(dataDocRef, cleanPayload, { merge: true });

    // Also update user profile summary document
    const userDocRef = doc(db, 'users', uid);
    await setDoc(userDocRef, {
      uid,
      email: auth.currentUser?.email || '',
      displayName: auth.currentUser?.displayName || '',
      photoURL: auth.currentUser?.photoURL || '',
      professionalSegment: payload.professionalSegment,
      customSegmentName: payload.customSegmentName,
      lastUpdated: payload.lastUpdated,
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

/**
 * Fetches the user's isolated data from the cloud
 */
export async function fetchUserCloudData(uid: string): Promise<UserIsolatedData | null> {
  if (!uid || !db) return null;
  const path = `users/${uid}/data/current`;
  try {
    const dataDocRef = doc(db, 'users', uid, 'data', 'current');
    const snap = await getDoc(dataDocRef);
    if (snap.exists()) {
      return snap.data() as UserIsolatedData;
    }
    return null;
  } catch (err: any) {
    if (isOfflineError(err)) {
      console.warn(`[Firestore Offline] Cliente offline ao buscar dados de ${path}. Utilizando dados locais.`);
      return null;
    }
    handleFirestoreError(err, OperationType.GET, path);
    return null;
  }
}

/**
 * Listens in real-time to changes in the user's isolated database.
 * Ensures PC and Mobile devices stay automatically synchronized!
 */
export function subscribeToUserCloudData(
  uid: string,
  onData: (data: UserIsolatedData) => void,
  onError?: (error: any) => void
): () => void {
  if (!uid || !db) {
    return () => {};
  }
  const path = `users/${uid}/data/current`;
  const dataDocRef = doc(db, 'users', uid, 'data', 'current');

  return onSnapshot(dataDocRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data() as UserIsolatedData;
      onData(data);
    }
  }, (err) => {
    if (isOfflineError(err)) {
      console.warn(`[Firestore Offline] Sincronização em tempo real aguardando reconexão (${path}).`);
      return;
    }
    console.warn(`[UserSync] Erro na sincronização do usuário ${uid}:`, err);
    if (onError) onError(err);
  });
}
