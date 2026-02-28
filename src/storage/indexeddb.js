// Lightweight IndexedDB wrapper for persisting app data
// Stores critical data (quizzes, folders) while keeping theme in localStorage

const DB_NAME = "quiz-manager";
const DB_VERSION = 1;
const STORE_KV = "kv"; // simple key-value store: { key, value }

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_KV)) {
        db.createObjectStore(STORE_KV, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function withStore(mode, fn) {
  return openDatabase().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_KV], mode);
      const store = tx.objectStore(STORE_KV);
      Promise.resolve(fn(store))
        .then((result) => {
          tx.oncomplete = () => resolve(result);
          tx.onerror = () => reject(tx.error);
        })
        .catch(reject);
    });
  });
}

async function getItem(key) {
  return withStore("readonly", (store) => {
    return new Promise((resolve, reject) => {
      const req = store.get(key);
      req.onsuccess = () => {
        resolve(req.result ? req.result.value : null);
      };
      req.onerror = () => reject(req.error);
    });
  });
}

async function setItem(key, value) {
  return withStore("readwrite", (store) => {
    return new Promise((resolve, reject) => {
      const req = store.put({ key, value });
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  });
}

async function removeItem(key) {
  return withStore("readwrite", (store) => {
    return new Promise((resolve, reject) => {
      const req = store.delete(key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  });
}

async function keys() {
  return withStore("readonly", (store) => {
    return new Promise((resolve, reject) => {
      const req = store.getAllKeys();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  });
}

async function clearAll() {
  return withStore("readwrite", (store) => {
    return new Promise((resolve, reject) => {
      const req = store.clear();
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  });
}

async function requestPersistentStorage() {
  if (!navigator.storage || !navigator.storage.persist) return false;
  try {
    const alreadyPersisted = await navigator.storage.persisted();
    if (alreadyPersisted) return true;
    return await navigator.storage.persist();
  } catch (_e) {
    return false;
  }
}

async function migrateFromLocalStorageIfNeeded() {
  // Only migrate quizzes and folders; leave theme in localStorage
  const existingQuizzes = await getItem("quizzes");
  const existingFolders = await getItem("folders");
  const hasDBData = (existingQuizzes && existingQuizzes.length) || (existingFolders && existingFolders.length);
  const lsQuizzes = localStorage.getItem("quizzes");
  const lsFolders = localStorage.getItem("folders");

  if (!hasDBData) {
    let migrated = false;
    if (lsQuizzes) {
      try {
        const mapArray = JSON.parse(lsQuizzes);
        if (Array.isArray(mapArray)) {
          await setItem("quizzes", mapArray);
          migrated = true;
        }
      } catch (_e) {}
    }
    if (lsFolders) {
      try {
        const mapArray = JSON.parse(lsFolders);
        if (Array.isArray(mapArray)) {
          await setItem("folders", mapArray);
          migrated = true;
        }
      } catch (_e) {}
    }
    if (migrated) {
      // Clean up LS copies of critical data to avoid divergence
      try {
        localStorage.removeItem("quizzes");
        localStorage.removeItem("folders");
      } catch (_e) {}
    }
  }
}

export const storage = {
  get: getItem,
  set: setItem,
  remove: removeItem,
  keys,
  clearAll,
  requestPersistentStorage,
  migrateFromLocalStorageIfNeeded,
};


