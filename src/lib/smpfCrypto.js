// Local, non-custodial wallet backup cryptography.
// Uses audited Web Crypto primitives: PBKDF2-SHA256 for key derivation and
// AES-256-GCM for authenticated encryption. No proprietary cryptography.

const enc = new TextEncoder();
const dec = new TextDecoder();

export function bufToB64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

export function b64ToBuf(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function b64ToUtf8(b64) {
  return dec.decode(b64ToBuf(b64));
}

export function utf8ToB64(str) {
  return bufToB64(enc.encode(str));
}

const ITERATIONS = 250000;

async function deriveKey(password, salt, iterations = ITERATIONS) {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypts the 64-byte Ed25519 secret key (plus address metadata) into a
// versioned, portable backup blob. Only ciphertext leaves the device.
export async function encryptWallet(secretKeyBytes, password, address) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const payload = enc.encode(JSON.stringify({ address, secretKey: bufToB64(secretKeyBytes) }));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, payload));
  return {
    version: 1,
    kdf: 'PBKDF2-SHA256',
    iterations: ITERATIONS,
    salt: bufToB64(salt),
    iv: bufToB64(iv),
    ciphertext: bufToB64(ciphertext),
    createdAt: new Date().toISOString(),
  };
}

export async function decryptWallet(backup, password) {
  if (!backup || backup.version !== 1) throw new Error('Unsupported backup format');
  const salt = b64ToBuf(backup.salt);
  const iv = b64ToBuf(backup.iv);
  const key = await deriveKey(password, salt, backup.iterations || ITERATIONS);
  let plain;
  try {
    plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, b64ToBuf(backup.ciphertext));
  } catch {
    throw new Error('Incorrect wallet password or corrupted backup');
  }
  const data = JSON.parse(dec.decode(plain));
  return { address: data.address, secretKeyB64: data.secretKey, secretKey: b64ToBuf(data.secretKey) };
}

// Verify a backup file can be read and decrypted with the given password.
export async function verifyBackupFile(fileText, password) {
  const backup = JSON.parse(fileText);
  const result = await decryptWallet(backup, password);
  if (!result.address || !result.address.endsWith('SMPF')) {
    throw new Error('Backup does not contain a valid SMPF address');
  }
  return result;
}