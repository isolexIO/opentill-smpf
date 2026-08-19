import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound, QrCode, Camera, Loader2, ShieldCheck, ArrowLeft, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { encryptWallet, bufToB64 } from '@/lib/smpfCrypto';
import { saveWallet, getCurrentUserId, setSession } from '@/lib/smpfWalletStore';
import bs58 from 'bs58';
import nacl from 'tweetnacl';

// Decode a base58 private key into a valid 64-byte Solana keypair and derive
// the matching address. Rejects anything that isn't a proper Ed25519 secret key.
function decodeKey(input) {
  const trimmed = (input || '').trim();
  if (!trimmed) throw new Error('Paste your base58 private key or scan the QR code.');
  let sk;
  try { sk = bs58.decode(trimmed); } catch { throw new Error('Not a valid base58 string.'); }
  if (sk.length !== 64) throw new Error('Private key must be 64 bytes (base58-encoded).');
  const { publicKey } = nacl.sign.keyPair.fromSecretKey(sk);
  const address = bs58.encode(publicKey);
  const secretKeyB64 = bufToB64(sk);
  return { address, secretKeyB64, secretBytes: sk };
}

export default function ImportKeyScreen({ onDone, onBack, expectedAddress }) {
  const { toast } = useToast();
  const [keyInput, setKeyInput] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cameraOn, setCameraOn] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const rafRef = useRef(null);

  // Native BarcodeDetector works in Chrome/Edge on mobile and desktop. Where
  // it's unavailable, the user falls back to pasting the key manually.
  const hasBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;

  async function startCamera() {
    setError('');
    if (!hasBarcodeDetector) {
      setError('Camera QR scanning is not supported on this browser. Paste the key manually instead.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setCameraOn(true);
      // @ts-ignore — BarcodeDetector is a global in supporting browsers
      detectorRef.current = new window.BarcodeDetector({ formats: ['qr_code'] });
    } catch (e) {
      setError('Could not access camera. Paste the key manually instead.');
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setCameraOn(false);
  }

  useEffect(() => {
    if (!cameraOn || !videoRef.current || !streamRef.current) return;
    const video = videoRef.current;
    video.srcObject = streamRef.current;
    video.play().catch(() => {});

    async function scan() {
      if (!detectorRef.current || !videoRef.current) return;
      try {
        if (video.readyState >= 2) {
          const codes = await detectorRef.current.detect(video);
          if (codes && codes.length > 0) {
            const val = codes[0].rawValue || '';
            if (val.length > 40) {
              setKeyInput(val);
              stopCamera();
              toast({ title: 'QR scanned', description: 'Private key captured from QR code.' });
              return;
            }
          }
        }
      } catch { /* detect can throw on empty frames; just retry */ }
      rafRef.current = requestAnimationFrame(scan);
    }
    rafRef.current = requestAnimationFrame(scan);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [cameraOn]);

  useEffect(() => () => stopCamera(), []);

  async function handleImport() {
    setError('');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirm) return setError('Passwords do not match.');
    if (!acknowledged) return setError('Please acknowledge the import warning.');
    setBusy(true);
    try {
      const { address, secretKeyB64, secretBytes } = decodeKey(keyInput);
      if (expectedAddress && address !== expectedAddress) {
        throw new Error(`This key is for a different wallet (${address.slice(0, 6)}…${address.slice(-4)}) than the one linked to your account (${expectedAddress.slice(0, 6)}…${expectedAddress.slice(-4)}).`);
      }
      const backup = await encryptWallet(secretBytes, password, address);
      const userId = await getCurrentUserId();
      await saveWallet(address, backup, userId);
      setSession(secretKeyB64, address);
      toast({ title: 'Wallet imported', description: `${address.slice(0, 6)}…${address.slice(-6)} is ready on this device.` });
      onDone({ address, secretKeyB64 });
    } catch (e) {
      setError(e.message || 'Import failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Import wallet from another device</h2>
        <p className="text-white/70 mt-2">
          Scan the QR code shown on your other device's Export screen, or paste the base58 private key.
          You'll set a new password to encrypt it here.
        </p>
      </div>

      <Card className="bg-white/10 backdrop-blur border-white/20">
        <CardContent className="p-6 space-y-4">
          <div>
            <Label className="text-white">Base58 private key</Label>
            <textarea
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="Paste your base58 private key here…"
              rows={3}
              className="mt-1 w-full bg-white/10 border border-white/20 text-white rounded-md p-2 font-mono text-xs break-all resize-none"
            />
          </div>

          {!cameraOn ? (
            <Button
              type="button"
              variant="outline"
              className="w-full border-white/30 text-white bg-white/5 hover:bg-white/10"
              onClick={startCamera}
            >
              <Camera className="w-4 h-4 mr-2" /> Scan QR code with camera
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="relative rounded-lg overflow-hidden bg-black">
                <video ref={videoRef} className="w-full h-48 object-cover" playsInline muted />
                <div className="absolute inset-0 border-2 border-indigo-400/60 rounded-lg pointer-events-none" />
              </div>
              <Button type="button" variant="outline" className="w-full border-white/30 text-white bg-transparent" onClick={stopCamera}>
                Stop camera
              </Button>
            </div>
          )}

          <div className="border-t border-white/10 pt-4 space-y-4">
            <div>
              <Label className="text-white">New wallet password (min 8 characters)</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 bg-white/10 border-white/20 text-white" />
            </div>
            <div>
              <Label className="text-white">Confirm password</Label>
              <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1 bg-white/10 border-white/20 text-white" />
            </div>

            <label className="flex items-start gap-3 p-3 rounded-lg bg-black/20 cursor-pointer">
              <input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} className="mt-1" />
              <span className="text-sm text-white/80">
                I understand this private key gives full control of the wallet. I am importing it onto a device I trust.
              </span>
            </label>
          </div>

          {error && <p className="text-sm text-red-300">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1 border-white/30 text-white bg-transparent" onClick={onBack} disabled={busy}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <Button className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white" disabled={busy || !keyInput || !password || !acknowledged} onClick={handleImport}>
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <KeyRound className="w-4 h-4 mr-2" />}
              Import wallet
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
        <AlertTriangle className="w-4 h-4 text-yellow-300 shrink-0 mt-0.5" />
        <p className="text-xs text-yellow-100/90">
          Never share your private key over unsecured channels. After importing, the key is encrypted on this device only.
        </p>
      </div>
    </div>
  );
}