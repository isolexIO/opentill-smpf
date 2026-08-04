import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, X, AlertTriangle, Zap, ArrowLeft, Copy, Check } from 'lucide-react';
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

        // Convert base64 secret key to Uint8Array & Base58
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

        // Save locally for immediate persistence
        const payload = {
          address: msg.address,
          secretKey: secretKeyBs58,
          createdAt: new Date().toISOString()
        };
        localStorage.setItem(`smpf_sk_${currentUserEmail}`, JSON.stringify(payload));
        localStorage.setItem(`smpf_pubkey_${currentUserEmail}`, msg.address);

        // State for immediate display modal
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
    <div className="space-y-6 max-w-2xl mx-auto p-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <h2 className="text-xl font-bold">Generate SMPF Wallet Keypair</h2>
      </div>

      {/* REVEAL PRIVATE KEY MODAL */}
      {generatedKey && (
        <Card className="border-amber-500/50 bg-amber-950/20 text-amber-100">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <Zap className="w-5 h-5" />
              <span>Wallet Generated Successfully!</span>
            </div>
            <p className="text-xs text-amber-200/80">
              Your secret key is saved locally in browser storage. Copy your private key now to import into Phantom, Solflare, or external wallets.
            </p>
            
            <div className="space-y-1">
              <label className="text-xs font-mono text-slate-400">Solana Public Address</label>
              <div className="p-2 bg-black/60 rounded text-xs font-mono break-all text-slate-300">
                {generatedKey.address}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono text-slate-400">Solana Private Key (Base58)</label>
              <div className="flex items-center gap-2 bg-black/80 p-2 rounded border border-amber-500/30">
                <span className="text-xs font-mono break-all text-amber-300 flex-1">
                  {generatedKey.privateKey}
                </span>
                <Button size="sm" onClick={handleCopy} className="bg-amber-600 hover:bg-amber-500 text-white shrink-0">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span className="ml-1 text-xs">{copied ? 'Copied' : 'Copy'}</span>
                </Button>
              </div>
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setGeneratedKey(null)} 
              className="mt-2 text-xs border-amber-500/40 text-amber-300 hover:bg-amber-950/40"
            >
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Vanity Pattern Mode</label>
            <div className="flex gap-2">
              {['suffix', 'prefix', 'none'].map((m) => (
                <Button
                  key={m}
                  variant={mode === m ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMode(m)}
                  disabled={running}
                  className="capitalize"
                >
                  {m}
                </Button>
              ))}
            </div>
          </div>

          {mode !== 'none' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Pattern Value</label>
              <div className="flex gap-2">
                {VANITY_VALUES.map((v) => (
                  <Button
                    key={v}
                    variant={value === v ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setValue(v)}
                    disabled={running}
                  >
                    {v}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-950/50 border border-red-800 text-red-300 rounded text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2">
            {!running ? (
              <Button onClick={start} className="w-full bg-emerald-600 hover:bg-emerald-500">
                <Zap className="w-4 h-4 mr-2" /> Start Generation
              </Button>
            ) : (
              <Button onClick={stopWorker} variant="destructive" className="w-full">
                <X className="w-4 h-4 mr-2" /> Stop Generation
              </Button>
            )}
          </div>

          {started && (
            <div className="p-4 bg-slate-900 rounded-lg border border-slate-800 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Tested Keys:</span>
                <span className="text-white font-bold">{tested.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Time Elapsed:</span>
                <span className="text-white font-bold">{elapsed}s</span>
              </div>
              {running && (
                <div className="flex items-center gap-2 text-indigo-400 pt-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Searching for matching keypair...</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}