// Non-custodial local wallet storage. The encrypted backup lives in
// IndexedDB on the user's device. The plaintext keypair lives only in memory
// (session) and is never persisted or sent to any server.

const DB_NAME = 'smpf-wallet';
const STORE = 'wallets';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'address' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveWallet(address, backup, userId) {
  const db = await openDB();
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).put({ address, backup, user_id: userId || null, created_date: Date.now() });
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

// Resolve the current authenticated user's id (or null when not logged in).
// Used to isolate each user's non-custodial wallet on a shared device.
export async function getCurrentUserId() {
  try {
    const { base44 } = await import('@/api/base44Client');
    const u = await base44.auth.me();
    return u?.id || null;
  } catch {
    return null;
  }
}

export async function getWallet(address) {
  const db = await openDB();
  const tx = db.transaction(STORE, 'readonly');
  return new Promise((resolve, reject) => {
    const r = tx.objectStore(STORE).get(address);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export async function listWallets(userId) {
  const db = await openDB();
  const tx = db.transaction(STORE, 'readonly');
  return new Promise((resolve, reject) => {
    const r = tx.objectStore(STORE).getAll();
    r.onsuccess = () => {
      const all = r.result || [];
      resolve(userId ? all.filter((w) => w.user_id === userId) : all);
    };
    r.onerror = () => reject(r.error);
  });
}

export async function removeWallet(address) {
  const db = await openDB();
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).delete(address);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

// In-memory session only — never persisted. Cleared on reload / lock.
let sessionKeypairB64 = null;
let sessionAddress = null;

export function setSession(secretKeyB64, address) {
  sessionKeypairB64 = secretKeyB64;
  sessionAddress = address;
}

export function getSession() {
  return sessionKeypairB64 ? { secretKeyB64: sessionKeypairB64, address: sessionAddress } : null;
}

export function clearSession() {
  sessionKeypairB64 = null;
  sessionAddress = null;
}