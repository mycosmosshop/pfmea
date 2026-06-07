
const DB_NAME = 'fmea-file-storage';
const DB_VERSION = 1;
const STORE_NAME = 'files';

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
        dbInstance.createObjectStore(STORE_NAME, { keyPath: 'name' });
      }
    };
  });
}

export async function saveFile(file: File): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put({ name: file.name, file });

    request.onsuccess = () => resolve();
    request.onerror = () => {
        console.error('Error saving file:', request.error);
        reject(request.error);
    };
  });
}

export async function getFile(fileName: string): Promise<File | undefined> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(fileName);

    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result.file);
      } else {
        resolve(undefined);
      }
    };
    request.onerror = () => {
        console.error('Error getting file:', request.error);
        reject(request.error);
    };
  });
}

export async function deleteFile(fileName: string): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(fileName);

    request.onsuccess = () => resolve();
    request.onerror = () => {
        console.error('Error deleting file:', request.error);
        reject(request.error);
    };
  });
}

export async function checkFileExists(fileName: string): Promise<boolean> {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getKey(fileName);

        request.onsuccess = () => {
            resolve(request.result !== undefined);
        };
        request.onerror = () => {
            console.error('Error checking file:', request.error);
            reject(request.error)
        };
    });
}
