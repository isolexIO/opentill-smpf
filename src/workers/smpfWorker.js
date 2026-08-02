// SMPF vanity keypair generation worker.
// Generates real Solana Ed25519 keypairs until the base58 public address
// ends with the exact suffix "SMPF". Runs off the main thread so the UI stays
// responsive. Private keys never leave the user's device.
import { Keypair } from '@solana/web3.js';

const SUFFIX = 'SMPF';
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
    const startedAt = Date.now();
    let tested = 0;
    try {
      while (running) {
        // Generate in batches, then yield to the event loop so cancel messages
        // can be processed and progress can be posted without blocking.
        for (let i = 0; i < 2000 && running; i++) {
          const kp = Keypair.generate();
          tested++;
          const pub = kp.publicKey.toBase58();
          if (!pub.endsWith(SUFFIX)) continue;

          // Integrity: round-trip the secret key and confirm the address matches,
          // and confirm the keypair can sign a test message.
          const roundTrip = Keypair.fromSecretKey(kp.secretKey);
          if (roundTrip.publicKey.toBase58() !== pub) continue;
          const sig = kp.sign(new TextEncoder().encode('openTILL-SMPF-verify'));
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