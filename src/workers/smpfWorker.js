// SMPF vanity keypair generation worker.
// Generates real Solana Ed25519 keypairs until the base58 public address
// matches the requested vanity pattern. Supports a prefix, a suffix, or a
// plain standard keypair (no vanity). Runs off the main thread so the UI
// stays responsive. Private keys never leave the user's device.
import { Keypair } from '@solana/web3.js';
import nacl from 'tweetnacl';

let running = false;

function toB64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

self.onmessage = async (e) => {
  const msg = e.data;
  if (!msg) return;

  if (msg.type === 'start') {
    if (running) return;
    running = true;
    const mode = msg.mode || 'suffix';            // 'none' | 'prefix' | 'suffix'
    const value = String(msg.value || '').toUpperCase();
    const startedAt = Date.now();
    let tested = 0;

    const matches = (pub) => {
      if (mode === 'none') return true;
      if (!value) return true;
      return mode === 'prefix' ? pub.startsWith(value) : pub.endsWith(value);
    };

    try {
      while (running) {
        for (let i = 0; i < 2000 && running; i++) {
          const kp = Keypair.generate();
          tested++;
          const pub = kp.publicKey.toBase58();
          if (!matches(pub)) continue;

          // Integrity: round-trip the secret key and confirm the address matches,
          // and confirm the keypair can sign a test message via tweetnacl
          // (Keypair.sign is not exposed in the worker bundle).
          const roundTrip = Keypair.fromSecretKey(kp.secretKey);
          if (roundTrip.publicKey.toBase58() !== pub) continue;
          const msg = new TextEncoder().encode('openTILL-SMPF-verify');
          const sig = nacl.sign.detached(msg, kp.secretKey);
          if (!sig || sig.length !== 64) continue;

          self.postMessage({
            type: 'found',
            address: pub,
            secretKeyB64: toB64(kp.secretKey),
            publicKeyB64: toB64(kp.publicKey.toBytes()),
            tested,
            elapsed: Date.now() - startedAt,
          });
          running = false;
          return;
        }
        self.postMessage({ type: 'progress', tested, elapsed: Date.now() - startedAt });
        await new Promise((r) => setTimeout(r, 0));
      }
      self.postMessage({ type: 'cancelled', tested, elapsed: Date.now() - startedAt });
    } catch (err) {
      self.postMessage({ type: 'error', error: String((err && err.message) || err) });
    }
  } else if (msg.type === 'cancel') {
    running = false;
  }
};