import type { FullProjectState } from '../types';

const DB_NAME = 'fmea-project-database';
const DB_VERSION = 1;
const STORE_NAME = 'projects';

let db: IDBDatabase;

function getDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('IndexedDB error:', request.error);
      reject('IndexedDB error');
    };

    request.onsuccess = (event) => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
        dbInstance.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

export async function saveProject(project: FullProjectState): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(project);

    request.onsuccess = () => resolve();
    request.onerror = () => {
        console.error('Error saving project:', request.error);
        reject(request.error);
    };
  });
}

export async function getProject(id: string): Promise<FullProjectState | undefined> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
        console.error('Error getting project:', request.error);
        reject(request.error);
    };
  });
}

export async function getAllProjects(): Promise<FullProjectState[]> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      console.error('Error getting all projects:', request.error);
      reject(request.error);
    };
  });
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => {
        console.error('Error deleting project:', request.error);
        reject(request.error);
    };
  });
}
