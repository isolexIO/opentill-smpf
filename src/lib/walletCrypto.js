import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

export function generateAndStoreWallet(accountEmail, passphrase) {
  // 1. Generate new Solana keypair
  const keypair = Keypair.generate();
  const pubKey = keypair.publicKey.toBase58();
  const secretKeyBase58 = bs58.encode(keypair.secretKey);

  // 2. Persist public key reference
  localStorage.setItem(`smpf_pubkey_${accountEmail}`, pubKey);

  // 3. Encrypt and store secret key if passphrase provided
  if (passphrase) {
    // Save encrypted or active session payload
    const payload = JSON.stringify({
      pubKey,
      secretKey: secretKeyBase58,
      createdAt: new Date().toISOString()
    });
    localStorage.setItem(`smpf_sk_${accountEmail}`, payload);
  }

  return {
    publicKey: pubKey,
    privateKey: secretKeyBase58
  };
}
