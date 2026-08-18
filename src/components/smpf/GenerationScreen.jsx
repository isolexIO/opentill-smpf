import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, Zap, ArrowLeft, Copy, Check, ShieldCheck, Key } from 'lucide-react';
import bs58 from 'bs58';

const VANITY_VALUES = ['SMPF', 'DUc', 'TILL'];

// Worker pool size: use multiple cores in parallel so a 4-char vanity
// suffix (~1 in 11.3M) is found in seconds rather than minutes.
const POOL_SIZE = Math.min(4, Math.max(1, (navigator.hardwareConcurrency || 2) - 1));

function b64ToBase58(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bs58.encode(bytes);
}

export default function GenerationScreen({ onFound, onBack, currentUserEmail = 'admin@isolex.net' }) {
  const [mode, setMode] = useState('suffix');
  const [value, setValue] = useState('SMPF');
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);
  const [tested, setTested] = useState(0);
  const [generatedKey, setGeneratedKey] = useState(null);
  const [copied, setCopied] = useState(false);

  const workersRef = useRef([]);
  const testedByWorkerRef = useRef({});
  const stopRef = useRef(false);

  // Clean up any workers on unmount
  useEffect(() => {
    return () => {
      stopRef.current = true;
      workersRef.current.forEach((w) => {
        try { w.postMessage({ type: 'cancel' }); } catch { /* noop */ }
        try { w.terminate(); } catch { /* noop */ }
      });
      workersRef.current = [];
    };
  }, []);

  const spawnWorker = () => {
    const w = new Worker(new URL('../../workers/smpfWorker.js', import.meta.url), { type: 'module' });
    w.onmessage = (e) => {
      const msg = e.data;
      if (!msg) return;
      if (msg.type === 'progress') {
        testedByWorkerRef.current[w.__id] = msg.tested || 0;
        const total = Object.values(testedByWorkerRef.current).reduce((a, b) => a + b, 0);
        setTested(total);
      } else if (msg.type === 'found') {
        if (stopRef.current) return;
        stopRef.current = true;

        const secretKeyBs58 = b64ToBase58(msg.secretKeyB64);
        const payload = {
          address: msg.address,
          publicKey: msg.address,
          secretKey: secretKeyBs58,
          secretKeyB64: msg.secretKeyB64,
          createdAt: new Date().toISOString(),
        };

        localStorage.setItem(`smpf_sk_${currentUserEmail}`, JSON.stringify(payload));
        localStorage.setItem(`smpf_pubkey_${currentUserEmail}`, msg.address);

        setGeneratedKey({ address: msg.address, privateKey: secretKeyBs58 });
        setTested((prev) => prev + (msg.tested || 0));
        setRunning(false);

        // Stop the rest of the pool
        workersRef.current.forEach((other) => {
          if (other !== w) {
            try { other.postMessage({ type: 'cancel' }); } catch { /* noop */ }
          }
        });

        if (onFound) {
          onFound({
            address: msg.address,
            publicKey: msg.address,
            secretKeyB64: msg.secretKeyB64,
            privateKeyBs58: secretKeyBs58,
          });
        }
      } else if (msg.type === 'error') {
        setError(msg.error || 'Generation error');
        setRunning(false);
        stopRef.current = true;
      }
    };
    w.onerror = (ev) => {
      setError(String(ev?.message || 'Worker error'));
      setRunning(false);
      stopRef.current = true;
    };
    return w;
  };

  const startGeneration = () => {
    setError('');
    setRunning(true);
    setTested(0);
    setGeneratedKey(null);
    stopRef.current = false;
    testedByWorkerRef.current = {};

    // Terminate any leftover workers
    workersRef.current.forEach((w) => { try { w.terminate(); } catch { /* noop */ } });
    workersRef.current = [];

    const targetValue = mode === 'none' ? '' : (value || 'SMPF');

    for (let i = 0; i < POOL_SIZE; i++) {
      const w = spawnWorker();
      w.__id = i;
      workersRef.current.push(w);
      w.postMessage({ type: 'start', mode, value: targetValue });
    }
  };

  const handleStop = () => {
    stopRef.current = true;
    setRunning(false);
    workersRef.current.forEach((w) => {
      try { w.postMessage({ type: 'cancel' }); } catch { /* noop */ }
    });
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
            <div className="text-xs text-indigo-300 font-mono flex items-center justify-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              Searching {POOL_SIZE}× in parallel for pattern {mode === 'prefix' ? 'starting' : 'ending'} in:{' '}
              <span className="text-white font-bold">{value}</span>
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