import type { Client, Product, SavedQuote, CompanyInfo, QuoteSettings } from '../types';

const DB_NAME = 'GestaoOrcamentosDB';
const DB_VERSION = 1;

interface LocalDBSchema {
  products: Product[];
  clients: Client[];
  savedQuotes: SavedQuote[];
  companyInfo: CompanyInfo | null;
  quoteSettings: QuoteSettings | null;
}

/**
 * Initializes IndexedDB for high-capacity local database persistence
 */
export function openLocalDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB não é suportado neste navegador.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains('products')) {
        db.createObjectStore('products', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('clients')) {
        db.createObjectStore('clients', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('savedQuotes')) {
        db.createObjectStore('savedQuotes', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('appMetadata')) {
        db.createObjectStore('appMetadata', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Saves all items of a collection into IndexedDB
 */
export async function saveToIndexedDB<T extends { id: string }>(
  storeName: 'products' | 'clients' | 'savedQuotes',
  items: T[]
): Promise<void> {
  try {
    const db = await openLocalDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    // Clear existing store content and re-insert all items
    store.clear();
    for (const item of items) {
      store.put(item);
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn(`[IndexedDB] Erro ao salvar em ${storeName}:`, err);
  }
}

/**
 * Loads all items of a collection from IndexedDB
 */
export async function loadFromIndexedDB<T>(
  storeName: 'products' | 'clients' | 'savedQuotes'
): Promise<T[]> {
  try {
    const db = await openLocalDB();
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn(`[IndexedDB] Erro ao carregar de ${storeName}:`, err);
    return [];
  }
}

/**
 * Saves metadata key-value pair in IndexedDB
 */
export async function setMetaIndexedDB(key: string, value: any): Promise<void> {
  try {
    const db = await openLocalDB();
    const tx = db.transaction('appMetadata', 'readwrite');
    const store = tx.objectStore('appMetadata');
    store.put({ key, value });

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn(`[IndexedDB] Erro ao salvar meta ${key}:`, err);
  }
}

/**
 * Loads metadata value from IndexedDB
 */
export async function getMetaIndexedDB<T>(key: string): Promise<T | null> {
  try {
    const db = await openLocalDB();
    const tx = db.transaction('appMetadata', 'readonly');
    const store = tx.objectStore('appMetadata');
    const request = store.get(key);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result ? (request.result.value as T) : null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn(`[IndexedDB] Erro ao carregar meta ${key}:`, err);
    return null;
  }
}
