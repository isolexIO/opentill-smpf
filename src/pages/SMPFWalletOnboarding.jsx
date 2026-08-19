import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet, Plus, Link2, ArrowLeft, ArrowRight, Smartphone } from 'lucide-react';
import { listWallets, getCurrentUserId, setSession } from '@/lib/smpfWalletStore';
import GenerationScreen from '@/components/smpf/GenerationScreen';
import BackupScreen from '@/components/smpf/BackupScreen';
import ActivationScreen from '@/components/smpf/ActivationScreen';
import ImportKeyScreen from '@/components/smpf/ImportKeyScreen';
import { createPageUrl } from '@/utils';

const DUC_LOGO =
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6970e2871534100b4ebb8d45/8e45f76fe_DUC3.png';

export default function SMPFWalletOnboarding() {
  const [step, setStep] = useState('choice'); // choice | generate | backup | activate | import
  const [kp, setKp] = useState(null); // { address, secretKeyB64, publicKeyB64 }
  const [existingWallet, setExistingWallet] = useState(null);

  useEffect(() => {
    (async () => {
      const userId = await getCurrentUserId();
      const w = await listWallets(userId).catch(() => []);
      if (w.length) setExistingWallet(w[0]);
    })();
  }, []);

  function handleFound(keypair) {
    setKp(keypair);
    setStep('backup');
  }

  function handleBackupDone() {
    if (kp) {
      setSession(kp.secretKeyB64, kp.address);
    }
    setStep('activate');
  }

  function openWallet() {
    window.location.href = createPageUrl('SMPFWallet');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-4 py-10">
      <div className="max-w-lg mx-auto space-y-8">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <img src={DUC_LOGO} alt="$DUC" className="w-10 h-10 rounded-full bg-white/10 p-1" />
            <div className="text-left">
              <h1 className="text-2xl font-black text-white leading-none">openTILL SMPF Wallet</h1>
              <p className="text-white/60 text-xs mt-1">Your gateway to $DUC and the Solana ecosystem.</p>
            </div>
          </div>
        </div>

        {step === 'choice' && (
          <div className="space-y-6">
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardContent className="p-6 space-y-5">
                <div className="text-center">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center mb-3">
                    <Wallet className="w-7 h-7 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Choose your wallet</h2>
                  <p className="text-white/60 text-sm mt-1">
                    Create a custom $DUC, SMPF, or TILL address — or a standard Solana keypair.
                  </p>
                </div>

                {!existingWallet && (
                <button
                  onClick={() => setStep('generate')}
                  className="w-full text-left p-5 rounded-xl bg-gradient-to-r from-emerald-500/20 to-emerald-600/10 border-2 border-emerald-400/50 hover:border-emerald-400 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/30 flex items-center justify-center">
                      <Plus className="w-5 h-5 text-emerald-300" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold">Create My SMPF Wallet</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 font-semibold">
                          Recommended
                        </span>
                      </div>
                      <p className="text-white/60 text-xs mt-1">
                        A real Solana wallet with a custom $DUC, SMPF, or TILL address — or a standard keypair.
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-white/60" />
                  </div>
                </button>
                )}

                {!existingWallet && (
                <button
                  onClick={() => (window.location.href = createPageUrl('SMPFWallet'))}
                  className="w-full text-left p-5 rounded-xl bg-white/5 border-2 border-white/10 hover:border-white/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                      <Link2 className="w-5 h-5 text-white/80" />
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-bold">Connect an Existing Solana Wallet</span>
                      <p className="text-white/60 text-xs mt-1">Use a wallet-standard compatible wallet.</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-white/60" />
                  </div>
                </button>
                )}

                {!existingWallet && (
                <button
                  onClick={() => setStep('import')}
                  className="w-full text-left p-5 rounded-xl bg-gradient-to-r from-indigo-500/20 to-purple-600/10 border-2 border-indigo-400/40 hover:border-indigo-400 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/30 flex items-center justify-center">
                      <Smartphone className="w-5 h-5 text-indigo-200" />
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-bold">Import from Another Device</span>
                      <p className="text-white/60 text-xs mt-1">Scan a QR code or paste your private key to restore your wallet here.</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-white/60" />
                  </div>
                </button>
                )}

                {existingWallet && (
                  <div className="text-center pt-2 space-y-3">
                    <p className="text-amber-300/80 text-xs">Only one wallet may be bound per email. You already have a wallet bound to your account:</p>
                    <Button variant="outline" className="border-white/30 text-white bg-transparent" onClick={openWallet}>
                      Open {existingWallet.address.slice(0, 6)}…{existingWallet.address.slice(-6)}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {step === 'generate' && (
          <GenerationScreen onFound={handleFound} onBack={() => setStep('choice')} />
        )}

        {step === 'backup' && kp && (
          <BackupScreen
            secretKeyB64={kp.secretKeyB64}
            address={kp.address}
            onDone={handleBackupDone}
            onBack={() => setStep('generate')}
          />
        )}

        {step === 'activate' && kp && (
          <ActivationScreen address={kp.address} onOpenWallet={openWallet} />
        )}

        {step === 'import' && (
          <ImportKeyScreen
            onDone={(keypair) => {
              setKp(keypair);
              setStep('activate');
            }}
            onBack={() => setStep('choice')}
          />
        )}

        {step !== 'choice' && (
          <div className="text-center">
            <Button variant="ghost" className="text-white/60 hover:text-white" onClick={() => setStep('choice')}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Start over
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}