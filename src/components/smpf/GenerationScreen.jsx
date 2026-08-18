import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, Zap, ArrowLeft, Copy, Check, ShieldCheck, Key } from 'lucide-react';
import bs58 from 'bs58';
import nacl from 'tweetnacl';

const VANITY_VALUES = ['SMPF', 'DUc', 'TILL'];

function uint8ToBase64(uint8) {
  let binary = '';
  for (let i = 0; i < uint8.length; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return btoa(binary);
}

export default function GenerationScreen({ onFound, onBack, currentUserEmail = 'admin@isolex.net' }) {
  const [mode, setMode] = useState('suffix');
  const [value, setValue] = useState('SMPF');
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);
  const [tested, setTested] = useState(0);
  const [generatedKey, setGeneratedKey] = useState(null);
  const [copied, setCopied] = useState(false);
  const stopRef = useRef(false);

  const startGeneration = () => {
    setError('');
    setRunning(true);
    setTested(0);
    stopRef.current = false;

    const targetPattern = mode === 'none' ? '' : (value || 'SMPF');
    let attemptsCounter = 0;

    const chunk = () => {
      if (stopRef.current) {
        setRunning(false);
        return;
      }

      // Process 2,500 attempts per animation frame without freezing UI
      for (let i = 0; i < 2500; i++) {
        attemptsCounter++;
        
        // Derive a real Ed25519 keypair from a 32-byte seed. tweetnacl produces
        // the canonical 64-byte Solana secret key (32-byte seed + 32-byte public
        // key), which Phantom and Solflare accept for import. The public key is
        // derived from the seed (not random), so the address and secret key are
        // cryptographically linked.
        const seed = window.crypto.getRandomValues(new Uint8Array(32));
        const pair = nacl.sign.keyPair.fromSeed(seed);
        const pubBytes = pair.publicKey;
        const secretKeyBytes = pair.secretKey;

        const candidateAddr = bs58.encode(pubBytes);
        const isMatch = mode === 'suffix' 
          ? candidateAddr.endsWith(targetPattern)
          : mode === 'prefix' 
          ? candidateAddr.startsWith(targetPattern)
          : true;

        if (isMatch) {
          const secretKeyBs58 = bs58.encode(secretKeyBytes);
          const secretKeyB64 = uint8ToBase64(secretKeyBytes);

          const payload = {
            address: candidateAddr,
            publicKey: candidateAddr,
            secretKey: secretKeyBs58,
            secretKeyB64: secretKeyB64,
            createdAt: new Date().toISOString()
          };

          localStorage.setItem(`smpf_sk_${currentUserEmail}`, JSON.stringify(payload));
          localStorage.setItem(`smpf_pubkey_${currentUserEmail}`, candidateAddr);

          setGeneratedKey({ address: candidateAddr, privateKey: secretKeyBs58 });
          setTested(attemptsCounter);
          setRunning(false);

          if (onFound) {
            onFound({
              address: candidateAddr,
              publicKey: candidateAddr,
              secretKeyB64: secretKeyB64,
              privateKeyBs58: secretKeyBs58
            });
          }
          return;
        }
      }

      setTested(attemptsCounter);
      requestAnimationFrame(chunk);
    };

    requestAnimationFrame(chunk);
  };

  const handleStop = () => {
    stopRef.current = true;
    setRunning(false);
  };

  const handleCopy = () => {
    if (generatedKey?.privateKey) {
      navigator.clipboard.writeText(generatedKey.privateKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center px-4 py-8 max-w-4xl mx-auto w-full">
      <div className="w-full flex items-center justify-between mb-8 border-b border-slate-800 pb-4">
        <Button variant="ghost" onClick={onBack} className="text-slate-400 hover:text-white gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Key className="w-6 h-6 text-indigo-400" /> Generate Keypair
        </h1>
      </div>

      {generatedKey && (
        <div className="w-full mb-8 p-6 bg-amber-950/40 border border-amber-500/50 rounded-xl space-y-4">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-lg">
            <ShieldCheck className="w-6 h-6 shrink-0" />
            <span>Wallet Generated Successfully!</span>
          </div>
          <p className="text-xs text-amber-200/80">
            Keypair saved locally in browser storage. Copy the private key below to import into external wallets:
          </p>

          <div className="space-y-1">
            <label className="text-xs font-mono text-slate-400 uppercase tracking-wider">Public Address</label>
            <div className="p-3 bg-black/70 rounded text-xs font-mono text-slate-200 break-all border border-slate-800">
              {generatedKey.address}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-mono text-slate-400 uppercase tracking-wider">Private Key (Base58)</label>
            <div className="flex items-center gap-2 bg-black/90 p-3 rounded border border-amber-500/40">
              <span className="text-xs font-mono text-amber-300 break-all flex-1">
                {generatedKey.privateKey}
              </span>
              <Button size="sm" onClick={handleCopy} className="bg-amber-600 hover:bg-amber-500 text-white shrink-0">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span className="ml-1 text-xs">{copied ? 'Copied' : 'Copy Key'}</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6">
        <div className="space-y-3">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">1. Select Vanity Mode</label>
          <div className="grid grid-cols-3 gap-3">
            {['suffix', 'prefix', 'none'].map((m) => (
              <Button
                key={m}
                variant={mode === m ? 'default' : 'outline'}
                onClick={() => setMode(m)}
                disabled={running}
                className="capitalize h-12"
              >
                {m}
              </Button>
            ))}
          </div>
        </div>

        {mode !== 'none' && (
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">2. Choose Pattern</label>
            <div className="grid grid-cols-3 gap-3">
              {VANITY_VALUES.map((v) => (
                <Button
                  key={v}
                  variant={value === v ? 'default' : 'outline'}
                  onClick={() => setValue(v)}
                  disabled={running}
                  className="h-12 font-mono font-bold"
                >
                  {v}
                </Button>
              ))}
            </div>
          </div>
        )}

        {running && (
          <div className="p-4 bg-indigo-950/40 border border-indigo-800 rounded-xl space-y-2 text-center">
            <div className="text-xs text-indigo-300 font-mono">
              Searching for pattern ending in: <span className="text-white font-bold">{value}</span>
            </div>
            <div className="text-lg font-mono font-bold text-indigo-400">
              {tested.toLocaleString()} attempts evaluated
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-950/50 border border-red-800 text-red-300 rounded text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="pt-4 flex gap-3">
          {running ? (
            <Button 
              onClick={handleStop} 
              variant="destructive"
              className="w-full h-14 font-bold rounded-xl"
            >
              Stop Search
            </Button>
          ) : (
            <Button 
              onClick={startGeneration} 
              className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl"
            >
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                <span>Start Generation</span>
              </div>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}