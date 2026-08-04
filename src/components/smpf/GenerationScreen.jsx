import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, X, AlertTriangle, Zap, ArrowLeft } from 'lucide-react';

const VANITY_VALUES = ['SMPF', 'DUC', 'TILL'];

// Generates a real Solana keypair whose base58 address matches the user's
// chosen vanity pattern (prefix, suffix, or a standard keypair) inside a
// Web Worker so the UI stays responsive.
export default function GenerationScreen({ onFound, onBack }) {
  const [mode, setMode] = useState('suffix'); // 'suffix' | 'prefix' | 'none'
  const [value, setValue] = useState('SMPF');
  const [tested, setTested] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const workerRef = useRef(null);

  useEffect(() => () => stopWorker(), []);

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
        onFound({
          address: msg.address,
          secretKeyB64: msg.secretKeyB64,
          publicKeyB64: msg.publicKeyB64,
          tested: msg.tested,
          elapsed: msg.elapsed,
        });
      } else if (msg.type === 'cancelled') {
        setRunning(false);
      } else if (msg.type === 'error') {
        setRunning(false);
        setError(msg.error);
      }
    };
    worker.postMessage({ type: 'start', mode, value: mode === 'none' ? '' : value });
  }

  function stopWorker() {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'cancel' });
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }

  function handleCancel() {
    stopWorker();
    setRunning(false);
  }

  function handleRestart() {
    stopWorker();
    start();
  }

  function handleEditConfig() {
    stopWorker();
    setRunning(false);
    setStarted(false);
  }

  const secs = (elapsed / 1000).toFixed(1);
  const rate = elapsed > 0 ? Math.round(tested / (elapsed / 1000)).toLocaleString() : '0';
  const targetLabel =
    mode === 'none'
      ? 'Standard Solana keypair'
      : mode === 'prefix'
      ? `Address starting with ${value}`
      : `Address ending with ${value}`;

  if (!started) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white">Customize your wallet</h2>
          <p className="text-white/70 mt-2">
            Choose a vanity pattern for your Solana address, or generate a standard keypair.
          </p>
        </div>

        <Card className="bg-white/10 backdrop-blur border-white/20">
          <CardContent className="p-6 space-y-5">
            {/* Mode selection */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Address style</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'suffix', label: 'Ends with' },
                  { id: 'prefix', label: 'Starts with' },
                  { id: 'none', label: 'Standard' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setMode(opt.id)}
                    className={`px-3 py-3 rounded-xl text-sm font-semibold border-2 transition-colors ${
                      mode === opt.id
                        ? 'bg-emerald-500/20 border-emerald-400 text-white'
                        : 'bg-white/5 border-white/10 text-white/70 hover:border-white/30'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Vanity value selection */}
            {mode !== 'none' && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Vanity text</p>
                <div className="grid grid-cols-3 gap-2">
                  {VANITY_VALUES.map((v) => (
                    <button
                      key={v}
                      onClick={() => setValue(v)}
                      className={`px-3 py-3 rounded-xl text-sm font-bold tracking-wider border-2 transition-colors ${
                        value === v
                          ? 'bg-emerald-500/20 border-emerald-400 text-white'
                          : 'bg-white/5 border-white/10 text-white/70 hover:border-white/30'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-lg bg-black/20 p-3 text-center">
              <p className="text-xs text-white/60 uppercase tracking-wide">Target</p>
              <p className="text-lg font-bold text-white font-mono">
                {mode === 'none' ? 'Any Solana address' : mode === 'prefix' ? `${value}…` : `…${value}`}
              </p>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <AlertTriangle className="w-4 h-4 text-yellow-300 shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-100/90">
                {mode === 'none'
                  ? 'A standard keypair is generated instantly — no matching required.'
                  : 'Vanity generation tries random keypairs until one matches. A 3–4 character base58 pattern is rare, so please keep this tab open. You can cancel and restart anytime.'}
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 border-white/30 text-white bg-transparent" onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white" onClick={start}>
                <Zap className="w-4 h-4 mr-2" /> Generate
              </Button>
            </div>

            {error && <p className="text-sm text-red-300 text-center">Generation error: {error}</p>}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Creating your SMPF wallet</h2>
        <p className="text-white/70 mt-2">
          {running ? `Forging a Solana address — ${targetLabel}.` : `${targetLabel} found!`}
        </p>
      </div>

      <Card className="bg-white/10 backdrop-blur border-white/20">
        <CardContent className="p-6 space-y-5">
          <div className="flex flex-col items-center gap-3 py-4">
            {running ? (
              <div className="relative">
                <Loader2 className="w-16 h-16 text-emerald-400 animate-spin" />
                <Zap className="w-7 h-7 text-yellow-300 absolute inset-0 m-auto" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-300 text-2xl">✓</div>
            )}
            <div className="grid grid-cols-2 gap-4 w-full mt-2">
              <div className="bg-black/20 rounded-lg p-3 text-center">
                <p className="text-xs text-white/60 uppercase tracking-wide">Addresses tested</p>
                <p className="text-xl font-bold text-white">{tested.toLocaleString()}</p>
              </div>
              <div className="bg-black/20 rounded-lg p-3 text-center">
                <p className="text-xs text-white/60 uppercase tracking-wide">Elapsed</p>
                <p className="text-xl font-bold text-white">{secs}s</p>
              </div>
            </div>
            <p className="text-xs text-white/50">~{rate} keys/sec</p>
          </div>

          <div className="flex gap-3">
            {running ? (
              <Button variant="outline" className="flex-1 border-white/30 text-white bg-transparent" onClick={handleCancel}>
                <X className="w-4 h-4 mr-2" /> Cancel
              </Button>
            ) : (
              <Button variant="outline" className="flex-1 border-white/30 text-white bg-transparent" onClick={handleRestart}>
                Retry
              </Button>
            )}
            <Button variant="outline" className="flex-1 border-white/30 text-white bg-transparent" onClick={handleEditConfig}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Change
            </Button>
          </div>

          {error && <p className="text-sm text-red-300 text-center">Generation error: {error}</p>}
        </CardContent>
      </Card>
    </div>
  );
}