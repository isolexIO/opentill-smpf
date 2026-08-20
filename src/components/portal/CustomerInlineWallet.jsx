import React, { useState, useEffect, useCallback } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Wallet, Send, ArrowDownLeft, Copy, Check, Loader2, Plus, KeyRound, RefreshCw, Link2, ArrowRight, Smartphone, ArrowLeft } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { listWallets, setSession } from '@/lib/smpfWalletStore';
import { getNetworkRpcList } from '@/lib/smpfRpc';
import { getPrice, WSOL } from '@/lib/smpfPrices';
import { DUC_LOGO_URL } from '@/lib/smpfConstants';
import SendScreen from '@/components/smpf/SendScreen';
import GenerationScreen from '@/components/smpf/GenerationScreen';
import BackupScreen from '@/components/smpf/BackupScreen';
import ActivationScreen from '@/components/smpf/ActivationScreen';
import ImportKeyScreen from '@/components/smpf/ImportKeyScreen';
import QRCode from 'qrcode';
import { useToast } from '@/components/ui/use-toast';

export default function CustomerInlineWallet({ customerKey }) {
  const { toast } = useToast();
  const [settings, setSettings] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [address, setAddress] = useState('');
  const [solBalance, setSolBalance] = useState(null);
  const [solUsd, setSolUsd] = useState(null);
  const [ducBalance, setDucBalance] = useState(0);
  const [ducLoading, setDucLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showReceive, setShowReceive] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Onboarding flow state
  const [showOnboard, setShowOnboard] = useState(false);
  const [onboardStep, setOnboardStep] = useState('choice'); // choice | generate | backup | activate | import
  const [kp, setKp] = useState(null);

  const rpc = settings ? getNetworkRpcList(settings)[0] : 'https://api.mainnet-beta.solana.com';
  const network = settings?.default_network || 'mainnet';

  useEffect(() => { init(); }, []);

  const init = async () => {
    try {
      const settingsList = await base44.entities.DUCWalletSettings.list().catch(() => []);
      setSettings(settingsList?.[0] || null);

      const localWallets = await listWallets(customerKey || null).catch(() => []);
      if (localWallets && localWallets.length > 0) {
        const w = localWallets[0];
        setWallet(w);
        setAddress(w.address || w.public_key || '');
      }
    } catch (e) {
      console.error('Inline wallet init error:', e);
    } finally {
      setLoading(false);
    }
  };

  const refreshBalance = useCallback(async () => {
    if (!address) return;
    setRefreshing(true);
    try {
      const rpcs = settings ? getNetworkRpcList(settings) : ['https://api.mainnet-beta.solana.com'];
      let bestLamports = -1;
      for (const r of rpcs) {
        try {
          const conn = new Connection(r, 'confirmed');
          const lamports = await conn.getBalance(new PublicKey(address));
          if (lamports > bestLamports) bestLamports = lamports;
        } catch { /* try next */ }
      }
      if (bestLamports >= 0) setSolBalance(bestLamports / 1e9);
    } catch { /* ignore */ }
    setRefreshing(false);
  }, [address, settings]);

  const refreshDuc = useCallback(async () => {
    if (!address || !settings?.verified_duc_mint) { setDucBalance(0); return; }
    setDucLoading(true);
    try {
      const res = await base44.functions.invoke('getDucBalance', { address });
      setDucBalance(res.data?.ducBalance || 0);
    } catch { setDucBalance(0); }
    finally { setDucLoading(false); }
  }, [address, settings]);

  useEffect(() => {
    refreshBalance();
    refreshDuc();
  }, [refreshBalance, refreshDuc]);

  useEffect(() => {
    getPrice(WSOL).then(setSolUsd).catch(() => {});
  }, []);

  useEffect(() => {
    if (showReceive && address) {
      QRCode.toDataURL(address, { width: 240, margin: 1 }).then(setQrUrl).catch(() => {});
    }
  }, [showReceive, address]);

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const finishOnboarding = (keypair) => {
    if (keypair) setSession(keypair.secretKeyB64, keypair.address);
    setWallet({ address: keypair?.address || kp?.address });
    setAddress(keypair?.address || kp?.address);
    setShowOnboard(false);
    setOnboardStep('choice');
    setKp(null);
    toast({ title: 'Wallet ready!', description: 'Your SMPF wallet is now active.' });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  // No wallet yet — show onboarding entry
  if (!wallet) {
    return (
      <>
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">SMPF Wallet</p>
                <p className="text-xs text-gray-500">Your personal $DUC & Solana wallet</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Create a custom $DUC, SMPF, or TILL vanity address — or import an existing wallet.
            </p>
            <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600" onClick={() => setShowOnboard(true)}>
              <Plus className="w-4 h-4 mr-2" /> Set Up Wallet
            </Button>
          </CardContent>
        </Card>

        <Dialog open={showOnboard} onOpenChange={(open) => { if (!open) { setOnboardStep('choice'); setKp(null); } setShowOnboard(open); }}>
          <DialogContent className="max-w-lg bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 border-white/20">
            <div className="space-y-6">
              {onboardStep !== 'choice' && (
                <Button variant="ghost" className="text-white/60 hover:text-white" onClick={() => setOnboardStep('choice')}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Start over
                </Button>
              )}

              {onboardStep === 'choice' && (
                <div className="space-y-5">
                  <div className="text-center">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center mb-3">
                      <Wallet className="w-7 h-7 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-white">Choose your wallet</h2>
                    <p className="text-white/60 text-sm mt-1">
                      Create a custom $DUC, SMPF, or TILL address — or a standard Solana keypair.
                    </p>
                  </div>

                  <button
                    onClick={() => setOnboardStep('generate')}
                    className="w-full text-left p-5 rounded-xl bg-gradient-to-r from-emerald-500/20 to-emerald-600/10 border-2 border-emerald-400/50 hover:border-emerald-400 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/30 flex items-center justify-center">
                        <Plus className="w-5 h-5 text-emerald-300" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold">Create My SMPF Wallet</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 font-semibold">Recommended</span>
                        </div>
                        <p className="text-white/60 text-xs mt-1">A real Solana wallet with a custom $DUC, SMPF, or TILL vanity address.</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-white/60" />
                    </div>
                  </button>

                  <button
                    onClick={() => setOnboardStep('import')}
                    className="w-full text-left p-5 rounded-xl bg-gradient-to-r from-indigo-500/20 to-purple-600/10 border-2 border-indigo-400/40 hover:border-indigo-400 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-indigo-500/30 flex items-center justify-center">
                        <Smartphone className="w-5 h-5 text-indigo-200" />
                      </div>
                      <div className="flex-1">
                        <span className="text-white font-bold">Import from Another Device</span>
                        <p className="text-white/60 text-xs mt-1">Scan a QR code or paste your private key to restore your wallet.</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-white/60" />
                    </div>
                  </button>
                </div>
              )}

              {onboardStep === 'generate' && (
                <GenerationScreen
                  onFound={(keypair) => { setKp(keypair); setOnboardStep('backup'); }}
                  onBack={() => setOnboardStep('choice')}
                  currentUserEmail={customerKey}
                />
              )}

              {onboardStep === 'backup' && kp && (
                <BackupScreen
                  secretKeyB64={kp.secretKeyB64}
                  address={kp.address}
                  userId={customerKey}
                  onDone={() => setOnboardStep('activate')}
                  onBack={() => setOnboardStep('generate')}
                />
              )}

              {onboardStep === 'activate' && kp && (
                <ActivationScreen
                  address={kp.address}
                  onOpenWallet={() => finishOnboarding(kp)}
                />
              )}

              {onboardStep === 'import' && (
                <ImportKeyScreen
                  userId={customerKey}
                  onDone={(keypair) => finishOnboarding(keypair)}
                  onBack={() => setOnboardStep('choice')}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  const shortAddr = address ? `${address.slice(0, 4)}…${address.slice(-4)}` : '';

  return (
    <>
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">SMPF Wallet</p>
                <button onClick={handleCopy} className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
                  {shortAddr} {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
            <button onClick={() => { refreshBalance(); refreshDuc(); }} className="p-2 text-gray-400 hover:text-gray-600" title="Refresh">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between bg-white rounded-lg p-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white text-xs font-bold">S</div>
                <span className="text-sm font-medium text-gray-700">SOL</span>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900">{solBalance !== null ? solBalance.toFixed(4) : '—'}</p>
                {solUsd && solBalance !== null && <p className="text-xs text-gray-400">${(solBalance * solUsd).toFixed(2)}</p>}
              </div>
            </div>

            <div className="flex items-center justify-between bg-white rounded-lg p-3">
              <div className="flex items-center gap-2">
                <img src={DUC_LOGO_URL} alt="$DUC" className="w-7 h-7 rounded-full" />
                <span className="text-sm font-medium text-gray-700">$DUC</span>
              </div>
              <div className="text-right">
                {ducLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <p className="font-bold text-gray-900">{ducBalance.toFixed(2)}</p>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3">
            <Button variant="outline" size="sm" onClick={() => setShowReceive(true)}>
              <ArrowDownLeft className="w-4 h-4 mr-1" /> Receive
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowSend(true)}>
              <Send className="w-4 h-4 mr-1" /> Send
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showReceive} onOpenChange={setShowReceive}>
        <DialogContent>
          <div className="flex flex-col items-center gap-4">
            <h2 className="text-lg font-bold">Receive $DUC / SOL</h2>
            {qrUrl && <img src={qrUrl} alt="Wallet QR" className="w-56 h-56 rounded-lg border" />}
            <div className="w-full">
              <p className="text-sm font-medium text-gray-700 mb-1">Your Wallet Address</p>
              <div className="flex items-center gap-2">
                <input value={address} readOnly className="flex-1 text-xs font-mono px-3 py-2 border rounded-md bg-gray-50" />
                <Button size="icon" variant="outline" onClick={handleCopy}>
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSend} onOpenChange={setShowSend}>
        <DialogContent className="max-w-md">
          <SendScreen
            address={address}
            rpc={rpc}
            network={network}
            settings={settings}
            ducBalance={ducBalance}
            onSent={() => { setShowSend(false); refreshBalance(); refreshDuc(); }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}