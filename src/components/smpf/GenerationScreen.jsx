import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, X, AlertTriangle, Zap } from 'lucide-react';

// Generates a real Solana keypair whose base58 address ends with "SMPF"
// inside a Web Worker so the UI stays responsive.
export default function GenerationScreen({ onFound, onBack }) {
  const [tested, setTested] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);
  const workerRef = useRef(null);

  useEffect(() => {
    start();
    return () => stopWorker();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function start() {
    setError('');
    setTested(0);
    setElapsed(0);
    setRunning(true);
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
        onFound({ address: msg.address, secretKeyB64: msg.secretKeyB64, publicKeyB64: msg.publicKeyB64, tested: msg.tested, elapsed: msg.elapsed });
      } else if (msg.type === 'cancelled') {
        setRunning(false);
      } else if (msg.type === 'error') {
        setRunning(false);
        setError(msg.error);
      }
    };
    worker.postMessage({ type: 'start' });
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

  const secs = (elapsed / 1000).toFixed(1);
  const rate = elapsed > 0 ? Math.round(tested / (elapsed / 1000)).toLocaleString() : '0';

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Creating your SMPF wallet</h2>
        <p className="text-white/70 mt-2">
          Your SMPF wallet is being forged on Solana. Its address will be uniquely yours and end in SMPF.
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

          <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
            <AlertTriangle className="w-4 h-4 text-yellow-300 shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-100/90">
              Custom address generation may take longer than standard wallet creation. A 4-character
              base58 suffix is rare, so please keep this tab open. You can cancel and restart anytime.
            </p>
          </div>

          <div className="flex gap-3">
            {running ? (
              <Button variant="outline" className="flex-1 border-white/30 text-white bg-transparent" onClick={handleCancel}>
                <X className="w-4 h-4 mr-2" /> Cancel
              </Button>
            ) : (
              <Button variant="outline" className="flex-1 border-white/30 text-white bg-transparent" onClick={handleRestart}>
                Restart
              </Button>
            )}
            <Button variant="outline" className="flex-1 border-white/30 text-white bg-transparent" onClick={onBack}>
              Back
            </Button>
          </div>

          {error && <p className="text-sm text-red-300 text-center">Generation error: {error}</p>}
        </CardContent>
      </Card>
    </div>
  );
}