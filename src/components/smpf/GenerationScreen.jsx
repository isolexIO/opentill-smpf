import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, X, AlertTriangle, Zap, ArrowLeft, Copy, Check, ShieldCheck, Key } from 'lucide-react';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

const VANITY_VALUES = ['SMPF', 'DUc', 'TILL'];

export default function GenerationScreen({ onFound, onBack, currentUserEmail = 'admin@isolex.net' }) {
  const [mode, setMode] = useState('suffix');
  const [value, setValue] = useState('SMPF');
  const [tested, setTested] = useState(0);
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);
  const [generatedKey, setGeneratedKey] = useState(null);
  const [copied, setCopied] = useState(false);

  const startGeneration = async () => {
    setError('');
    setRunning(true);
    setTested(0);

    setTimeout(() => {
      try {
        let attempts = 0;
        let matchedKeypair = null;
        const target = mode === 'none' ? '' : value.toLowerCase();

        while (attempts < 50000) {
          attempts++;
          const kp = Keypair.generate();
          const pub = kp.publicKey.toBase58();

          if (mode === 'none') {
            matchedKeypair = kp;
            break;
          } else if (mode === 'suffix' && pub.toLowerCase().endsWith(target)) {
            matchedKeypair = kp;
            break;
          } else if (mode === 'prefix' && pub.toLowerCase().startsWith(target)) {
            matchedKeypair = kp;
            break;
          }
        }

        if (!matchedKeypair) {
          matchedKeypair = Keypair.generate(); // Fallback if vanity search times out
        }

        const pubKey = matchedKeypair.publicKey.toBase58();
        const secretKeyBs58 = bs58.encode(matchedKeypair.secretKey);

        // Store directly in local browser storage
        const payload = {
          address: pubKey,
          secretKey: secretKeyBs58,
          createdAt: new Date().toISOString()
        };
        localStorage.setItem(`smpf_sk_${currentUserEmail}`, JSON.stringify(payload));
        localStorage.setItem(`smpf_pubkey_${currentUserEmail}`, pubKey);

        setTested(attempts);
        setGeneratedKey({
          address: pubKey,
          privateKey: secretKeyBs58
        });

        if (onFound) {
          onFound({
            address: pubKey,
            privateKeyBs58: secretKeyBs58
          });
        }
      } catch (err) {
        setError(err.message || 'Generation failed.');
      } finally {
        setRunning(false);
      }
    }, 100);
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
            <label className="text-xs font-mono text-slate-400">Public Address</label>
            <div className="p-3 bg-black/70 rounded text-xs font-mono text-slate-200 break-all border border-slate-800">
              {generatedKey.address}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-mono text-slate-400">Private Key (Base58)</label>
            <div className="flex items-center gap-2 bg-black/90 p-3 rounded border border-amber-500/40">
              <span className="text-xs font-mono text-amber-300 break-all flex-1">
                {generatedKey.privateKey}
              </span>
              <Button size="sm" onClick={handleCopy} className="bg-amber-600 hover:bg-amber-500 text-white shrink-0">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span className="ml-1 text-xs">{copied ? 'Copied' : 'Copy'}</span>
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

        {error && (
          <div className="p-4 bg-red-950/50 border border-red-800 text-red-300 rounded text-sm">
            {error}
          </div>
        )}

        <div className="pt-4">
          <Button 
            onClick={startGeneration} 
            disabled={running}
            className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl"
          >
            {running ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Generating Keypair...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                <span>Start Generation</span>
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}