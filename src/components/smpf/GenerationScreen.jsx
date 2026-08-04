import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, X, AlertTriangle, Zap, ArrowLeft, Copy, Check, ShieldCheck, Key } from 'lucide-react';
import bs58 from 'bs58';

const VANITY_VALUES = ['SMPF', 'DUc', 'TILL'];

export default function GenerationScreen({ onFound, onBack, currentUserEmail = 'admin@isolex.net' }) {
  const [mode, setMode] = useState('suffix');
  const [value, setValue] = useState('SMPF');
  const [tested, setTested] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const [generatedKey, setGeneratedKey] = useState(null);
  const [copied, setCopied] = useState(false);
  const workerRef = useRef(null);

  useEffect(() => () => stopWorker(), []);

  function stopWorker() {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setRunning(false);
  }

  function start() {
    setError('');
    setTested(0);
    setElapsed(0);
    setRunning(true);
    setStarted(true);

    const worker = new Worker(new URL('../../workers/smpfWorker.js', import.meta.url), { type: 'module' });
    workerRef.current = worker;

    worker.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === 'progress') {
        setTested(msg.tested);
        setElapsed(msg.elapsed);
      } else if (msg.type === 'found') {
        setRunning(false);
        setTested(msg.tested);
        setElapsed(msg.elapsed);
        worker.terminate();
        workerRef.current = null;

        let secretKeyBs58 = '';
        try {
          const binaryStr = atob(msg.secretKeyB64);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          secretKeyBs58 = bs58.encode(bytes);
        } catch (err) {
          secretKeyBs58 = msg.secretKeyB64;
        }

        // Save locally
        const payload = {
          address: msg.address,
          secretKey: secretKeyBs58,
          createdAt: new Date().toISOString()
        };
        localStorage.setItem(`smpf_sk_${currentUserEmail}`, JSON.stringify(payload));
        localStorage.setItem(`smpf_pubkey_${currentUserEmail}`, msg.address);

        setGeneratedKey({
          address: msg.address,
          privateKey: secretKeyBs58
        });

        if (onFound) {
          onFound({
            address: msg.address,
            secretKeyB64: msg.secretKeyB64,
            publicKeyB64: msg.publicKeyB64,
            privateKeyBs58: secretKeyBs58
          });
        }
      }
    };

    worker.onerror = (err) => {
      setError(err.message || 'Worker error');
      stopWorker();
    };

    worker.postMessage({
      cmd: 'start',
      mode: mode === 'none' ? 'none' : mode,
      value: mode === 'none' ? '' : value
    });
  }

  const handleCopy = () => {
    if (generatedKey?.privateKey) {
      navigator.clipboard.writeText(generatedKey.privateKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center px-4 py-8 max-w-4xl mx-auto w-full">
      {/* Top Header Navigation */}
      <div className="w-full flex items-center justify-between mb-8 border-b border-slate-800 pb-4">
        <Button variant="ghost" onClick={onBack} className="text-slate-400 hover:text-white gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Key className="w-6 h-6 text-indigo-400" /> Generate Keypair
        </h1>
      </div>

      {/* REVEAL PRIVATE KEY MODAL / BANNER */}
      {generatedKey && (
        <div className="w-full mb-8 p-6 bg-gradient-to-r from-amber-950/60 to-slate-900 border border-amber-500/40 rounded-xl shadow-2xl space-y-4">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-lg">
            <ShieldCheck className="w-6 h-6 shrink-0" />
            <span>Wallet Generated Successfully!</span>
          </div>
          <p className="text-xs text-amber-200/80">
            Your keypair is active and backed up to browser session storage. Copy your private key below to import directly into external wallets like Solflare or Phantom.
          </p>

          <div className="space-y-2">
            <label className="text-xs font-mono text-slate-400 uppercase tracking-wider">Public Address</label>
            <div className="p-3 bg-black/70 rounded-lg text-xs font-mono text-slate-200 break-all border border-slate-800">
              {generatedKey.address}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono text-slate-400 uppercase tracking-wider">Private Key (Base58)</label>
            <div className="flex items-center gap-2 bg-black/90 p-3 rounded-lg border border-amber-500/40">
              <span className="text-xs font-mono text-amber-300 break-all flex-1">
                {generatedKey.privateKey}
              </span>
              <Button size="sm" onClick={handleCopy} className="bg-amber-600 hover:bg-amber-500 text-white shrink-0 font-semibold">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span className="ml-1 text-xs">{copied ? 'Copied' : 'Copy Key'}</span>
              </Button>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGeneratedKey(null)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Main Controls Center */}
      <div className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
        <div className="space-y-3">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">1. Select Vanity Pattern Mode</label>
          <div className="grid grid-cols-3 gap-3">
            {['suffix', 'prefix', 'none'].map((m) => (
              <Button
                key={m}
                variant={mode === m ? 'default' : 'outline'}
                onClick={() => setMode(m)}
                disabled={running}
                className={`capitalize h-12 font-semibold text-sm ${
                  mode === m ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {m}
              </Button>
            ))}
          </div>
        </div>

        {mode !== 'none' && (
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">2. Choose Pattern Value</label>
            <div className="grid grid-cols-3 gap-3">
              {VANITY_VALUES.map((v) => (
                <Button
                  key={v}
                  variant={value === v ? 'default' : 'outline'}
                  onClick={() => setValue(v)}
                  disabled={running}
                  className={`h-12 font-mono font-bold text-sm ${
                    value === v ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {v}
                </Button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-950/50 border border-red-800 text-red-300 rounded-lg text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="pt-4">
          {!running ? (
            <Button onClick={start} className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 text-white text-base font-bold rounded-xl shadow-lg shadow-emerald-950/50">
              <Zap className="w-5 h-5 mr-2" /> Start Generation
            </Button>
          ) : (
            <Button onClick={stopWorker} variant="destructive" className="w-full h-14 text-base font-bold rounded-xl">
              <X className="w-5 h-5 mr-2" /> Stop Generation
            </Button>
          )}
        </div>

        {started && (
          <div className="p-6 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3 text-sm font-mono">
            <div className="flex justify-between text-slate-400">
              <span>Tested Keys:</span>
              <span className="text-white font-bold text-base">{tested.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Time Elapsed:</span>
              <span className="text-white font-bold text-base">{elapsed}s</span>
            </div>
            {running && (
              <div className="flex items-center gap-3 text-indigo-400 pt-2 border-t border-slate-900">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs uppercase tracking-wide">Searching for matching keypair...</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}