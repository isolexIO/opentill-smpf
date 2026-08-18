import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Lock, LogIn, Wallet, ShieldCheck, Send, ArrowDownLeft, Coins, Cpu, KeyRound, Copy, Check, AlertCircle, RefreshCw, History } from 'lucide-react';
import { Connection, PublicKey } from '@solana/web3.js';
import { getPrice, WSOL } from '@/lib/smpfPrices';
import { getWallet, listWallets, clearAllWallets } from '@/lib/smpfWalletStore';

// Import your SMPF sub-components
import PrivateKeyExport from '@/components/smpf/PrivateKeyExport';
import TokensTab from '@/components/smpf/TokensTab';
import TransactionHistoryTab from '@/components/smpf/TransactionHistoryTab';

export default function SMPFWallet() {
  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [solAddress, setSolAddress] = useState('');
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [solBalance, setSolBalance] = useState(null);
  const [solLoading, setSolLoading] = useState(false);
  const [solUsd, setSolUsd] = useState(null);
  const [solError, setSolError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Receive Modal States
  const [isReceiveOpen, setIsReceiveOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [ackTransferred, setAckTransferred] = useState(false);
  const [ackBackedUp, setAckBackedUp] = useState(false);
  const [ackLiability, setAckLiability] = useState(false);

  // Open the regeneration warning dialog. The actual wipe happens in performReset
  // only after the user acknowledges the fund-loss / no-liability warnings.
  function handleResetWallet() {
    setAckTransferred(false);
    setAckBackedUp(false);
    setAckLiability(false);
    setIsResetDialogOpen(true);
  }

  async function performReset() {
    setResetting(true);
    try {
      await clearAllWallets();
      // Clear the backend wallet binding so the one-per-email check won't block re-onboarding
      await base44.auth.updateMe({ wallet_address: null, pos_settings: {} }).catch(() => {});
      window.location.href = createPageUrl('SMPFWalletOnboarding');
    } catch (e) {
      console.error('Wallet reset failed:', e);
      setResetting(false);
      setIsResetDialogOpen(false);
    }
  }

  useEffect(() => {
    initWallet();
  }, []);

  // Fetch live SOL balance. Retries across multiple public RPCs and surfaces an
  // error so the UI can show a retry button instead of silently showing "—".
  const refreshBalance = useCallback(async () => {
    if (!solAddress) return;
    setSolLoading(true);
    setSolError(null);
    const net = settings?.default_network === 'devnet' ? 'devnet' : 'mainnet';
    const configured = net === 'mainnet' ? settings?.rpc_mainnet : settings?.rpc_devnet;
    const publicRpcs = net === 'mainnet'
      ? ['https://solana-rpc.publicnode.com', 'https://api.mainnet-beta.solana.com']
      : ['https://api.devnet.solana.com'];
    const rpcs = Array.from(new Set([
      (typeof configured === 'string' && /^https?:\/\//.test(configured)) ? configured : null,
      ...publicRpcs,
    ].filter(Boolean)));
    for (const rpc of rpcs) {
      try {
        const conn = new Connection(rpc, 'confirmed');
        const lamports = await conn.getBalance(new PublicKey(solAddress));
        setSolBalance(lamports / 1e9);
        setSolLoading(false);
        setSolError(null);
        return;
      } catch (e) {
        console.warn('SOL balance fetch failed on', rpc, e);
      }
    }
    setSolLoading(false);
    setSolError('Unable to fetch balance — public RPC may be rate-limited.');
  }, [solAddress, settings?.rpc_mainnet, settings?.rpc_devnet, settings?.default_network]);

  // Initial fetch + re-fetch whenever the address / RPC config changes
  useEffect(() => {
    refreshBalance();
  }, [refreshBalance]);

  // Auto-refresh balance every 30 seconds
  useEffect(() => {
    if (!solAddress) return;
    const id = setInterval(refreshBalance, 30000);
    return () => clearInterval(id);
  }, [refreshBalance]);

  // Fetch USD price of SOL (auto-refreshed every 60s)
  useEffect(() => {
    let cancelled = false;
    const fetchPrice = () =>
      getPrice(WSOL)
        .then((p) => { if (!cancelled) setSolUsd(p); })
        .catch((e) => console.warn('SOL price fetch failed:', e));
    fetchPrice();
    const id = setInterval(fetchPrice, 60000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  async function initWallet() {
    setLoading(true);
    try {
      // 1. Check logged-in user session
      const currentUser = await base44.auth.me();
      if (!currentUser) {
        setUser(null);
        setLoading(false);
        return;
      }
      setUser(currentUser);

      // 2. Load global wallet settings & configurations
      const settingsList = await base44.entities.DUCWalletSettings.list().catch(() => []);
      const currentSettings = settingsList?.[0] || null;
      setSettings(currentSettings);

      // 3. Retrieve local IndexedDB Solana Wallet entry — pick the funded one (highest on-chain SOL balance)
      const localWallets = await listWallets(currentUser.id).catch(() => []);
      let activeWallet = localWallets?.[0] || null;
      if (localWallets && localWallets.length > 1) {
        const net = currentSettings?.default_network === 'devnet' ? 'devnet' : 'mainnet';
        const configured = net === 'mainnet' ? currentSettings?.rpc_mainnet : currentSettings?.rpc_devnet;
        const publicRpcs = net === 'mainnet'
          ? ['https://solana-rpc.publicnode.com', 'https://api.mainnet-beta.solana.com']
          : ['https://api.devnet.solana.com'];
        const rpcs = Array.from(new Set([
          (typeof configured === 'string' && /^https?:\/\//.test(configured)) ? configured : null,
          ...publicRpcs,
        ].filter(Boolean)));
        const fetchBalance = async (addr) => {
          for (const rpc of rpcs) {
            try {
              const conn = new Connection(rpc, 'confirmed');
              return await conn.getBalance(new PublicKey(addr));
            } catch (e) { /* try next rpc */ }
          }
          return -1;
        };
        const results = await Promise.all(localWallets.map(async (w) => {
          const addr = w.address || w.public_key;
          if (!addr) return { w, bal: -1 };
          return { w, bal: await fetchBalance(addr) };
        }));
        results.sort((a, b) => b.bal - a.bal);
        if (results[0] && results[0].bal > 0) activeWallet = results[0].w;
      }

      if (activeWallet) {
        setWallet(activeWallet);
        setSolAddress(activeWallet.address || activeWallet.public_key || '');
      } else {
        // Fallback check against remote DB record
        const remoteWallets = await base44.entities.DUCWalletSettings.list({ user_id: currentUser.id }).catch(() => []);
        if (remoteWallets?.[0]) {
          setSolAddress(remoteWallets[0].solana_address || remoteWallets[0].public_key || '');
        }
      }
    } catch (err) {
      console.error('Error initializing openTILL SMPF Wallet:', err);
    } finally {
      setLoading(false);
    }
  }

  // Handle address copy
  const handleCopyAddress = () => {
    if (solAddress) {
      navigator.clipboard.writeText(solAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto" />
          <p className="text-xs text-white/60 font-mono">Loading openTILL SMPF Engine...</p>
        </div>
      </div>
    );
  }

  // Authentication Fallback Screen
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-slate-900 border-white/10 text-white text-center p-6 space-y-4">
          <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center mx-auto border border-indigo-500/20">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-black">Authentication Required</h2>
            <p className="text-white/60 text-xs">
              Please log in with your openTILL account to access your SMPF wallet, tokens, and hardware keys.
            </p>
          </div>
          <Button onClick={() => base44.auth.redirectToLogin()} className="w-full bg-indigo-600 hover:bg-indigo-500 font-semibold text-xs">
            <LogIn className="w-4 h-4 mr-2" /> Log In to openTILL
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 space-y-6">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* openTILL Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600/20 border border-indigo-500/40 rounded-xl flex items-center justify-center">
              <Wallet className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                openTILL Wallet
              </h1>
              <p className="text-xs text-white/60 font-mono">Structured Merchant Participation Framework</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="text-right text-xs">
              <span className="text-white/40 block text-[10px] uppercase tracking-wider">Account</span>
              <span className="font-mono text-indigo-300 font-medium break-all">{user.email}</span>
            </div>
            {(user.role === 'admin' || user.is_admin) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => (window.location.href = createPageUrl('SMPFWalletAdmin'))}
                className="border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 text-xs"
              >
                <ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> Admin Panel
              </Button>
            )}
          </div>
        </div>

        {/* Main Wallet Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-900 border border-white/10 p-1 rounded-xl flex w-full overflow-x-auto gap-1 sm:grid sm:grid-cols-5">
            <TabsTrigger value="overview" className="flex-1 whitespace-nowrap data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-xs px-3">
              <Wallet className="w-3.5 h-3.5 mr-1.5" /> <span>Balance</span>
            </TabsTrigger>
            <TabsTrigger value="tokens" className="flex-1 whitespace-nowrap data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-xs px-3">
              <Coins className="w-3.5 h-3.5 mr-1.5" /> <span>Tokens</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1 whitespace-nowrap data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-xs px-3">
              <History className="w-3.5 h-3.5 mr-1.5" /> <span>History</span>
            </TabsTrigger>
            <TabsTrigger value="chips" className="flex-1 whitespace-nowrap data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-xs px-3">
              <Cpu className="w-3.5 h-3.5 mr-1.5" /> <span>Chips</span>
            </TabsTrigger>
            <TabsTrigger value="keys" className="flex-1 whitespace-nowrap data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-xs px-3">
              <KeyRound className="w-3.5 h-3.5 mr-1.5" /> <span>Keys</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab Content */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-slate-900 border-white/10 text-white md:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs text-white/60 font-mono uppercase tracking-wider">SOL Balance</CardTitle>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-white/50 hover:text-white" onClick={refreshBalance} title="Refresh balance">
                      <RefreshCw className={solLoading ? 'w-3.5 h-3.5 animate-spin' : 'w-3.5 h-3.5'} />
                    </Button>
                  </div>
                  <div className="text-3xl font-black font-mono tracking-tight text-white flex items-baseline gap-2">
                    {solLoading && solBalance === null ? (
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                    ) : solBalance !== null ? (
                      solBalance.toFixed(4)
                    ) : (
                      '—'
                    )} <span className="text-xs font-normal text-white/40">SOL</span>
                  </div>
                  {solUsd !== null && solBalance !== null && (
                    <p className="text-xs text-white/50 font-mono">≈ ${(solBalance * solUsd).toFixed(2)} USD</p>
                  )}
                  {solError && (
                    <p className="text-xs text-amber-400 flex items-center gap-1.5 mt-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {solError}
                    </p>
                  )}
                  <p className="text-[10px] text-white/30 font-mono">Auto-refreshes every 30s</p>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row gap-3">
                  <Button disabled={settings?.is_paused} className="bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold w-full sm:w-auto">
                    <Send className="w-3.5 h-3.5 mr-1.5" /> Send SOL / Token
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsReceiveOpen(true)}
                    className="border-white/10 bg-slate-950 text-white hover:bg-white/5 text-xs font-semibold w-full sm:w-auto"
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5 mr-1.5" /> Receive
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-slate-900 border-white/10 text-white">
                <CardHeader>
                  <CardTitle className="text-xs text-white/60 font-mono uppercase tracking-wider">Account Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-white/60">Status:</span>
                    <span className="text-emerald-400 font-semibold">Active & Bound</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5 font-mono">
                    <span className="text-white/60">Solana Address:</span>
                    <span className="text-indigo-300 truncate max-w-[120px]" title={solAddress || 'Not initialized'}>
                      {solAddress ? `${solAddress.slice(0, 4)}...${solAddress.slice(-4)}` : 'None'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tokens">
            {solAddress ? (
              <TokensTab address={solAddress} rpc={settings?.default_network === 'devnet' ? settings?.rpc_devnet : settings?.rpc_mainnet} settings={settings} />
            ) : (
              <Card className="bg-slate-900 border-white/10 text-white">
                <CardContent className="p-6 text-center text-xs text-white/60">
                  No Solana address found. Onboard a wallet to view token balances.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history">
            {solAddress ? (
              <TransactionHistoryTab address={solAddress} settings={settings} />
            ) : (
              <Card className="bg-slate-900 border-white/10 text-white">
                <CardContent className="p-6 text-center text-xs text-white/60">
                  No Solana address found. Onboard a wallet to view transaction history.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="keys">
            <Card className="bg-slate-900 border-white/10 text-white">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-purple-400" /> Private Key Export
                </CardTitle>
                <CardDescription className="text-white/60 text-xs">
                  Decrypt and export your wallet's Ed25519 private key as base58 for import into Phantom, Solflare, or other Solana wallets.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => setIsExportOpen(true)}
                  disabled={!solAddress}
                  className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
                >
                  <KeyRound className="w-3.5 h-3.5 mr-1.5" /> Export Private Key
                </Button>
                <div className="pt-2 border-t border-white/10">
                  <p className="text-[11px] text-white/50 mb-2">
                    If your key won't import into Solflare/Phantom (created by an older broken generator), reset and generate a new wallet.
                  </p>
                  <Button
                    onClick={handleResetWallet}
                    disabled={resetting}
                    variant="destructive"
                    className="text-xs font-semibold"
                  >
                    {resetting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <AlertCircle className="w-3.5 h-3.5 mr-1.5" />}
                    Reset &amp; Regenerate Wallet
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chips">
            <Card className="bg-slate-900 border-white/10 text-white">
              <CardHeader>
                <CardTitle className="text-lg">Hardware & NFC Chips</CardTitle>
                <CardDescription className="text-white/60 text-xs">Registered openTILL chips linked to your POS workspace.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-white/40 italic">Scan or attach an openTILL NFC chip to link hardware credentials.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Receive Assets Modal */}
        <Dialog open={isReceiveOpen} onOpenChange={setIsReceiveOpen}>
          <DialogContent className="bg-slate-900 border-white/10 text-white max-w-sm rounded-xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-black flex items-center gap-2">
                <ArrowDownLeft className="w-5 h-5 text-indigo-400" /> Receive Assets
              </DialogTitle>
              <DialogDescription className="text-white/60 text-xs">
                Scan or copy your Solana public address to receive SOL, $DUC, or whitelisted tokens.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {solAddress ? (
                <>
                  <div className="p-3 bg-slate-950 border border-white/10 rounded-lg text-center space-y-2">
                    <span className="text-[10px] text-white/40 font-mono uppercase tracking-wider block">Your Solana Public Key</span>
                    <p className="font-mono text-xs text-indigo-300 break-all select-all px-2">{solAddress}</p>
                  </div>

                  <Button onClick={handleCopyAddress} className="w-full bg-indigo-600 hover:bg-indigo-500 font-semibold text-xs">
                    {copied ? <Check className="w-4 h-4 mr-2 text-emerald-300" /> : <Copy className="w-4 h-4 mr-2" />}
                    {copied ? 'Copied Address!' : 'Copy Solana Address'}
                  </Button>
                </>
              ) : (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-300 text-xs space-y-3 text-center">
                  <AlertCircle className="w-5 h-5 mx-auto text-amber-400" />
                  <p>No active Solana keypair found in local storage for this user.</p>
                  <Button
                    onClick={() => (window.location.href = createPageUrl('SMPFWalletOnboarding'))}
                    className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs"
                  >
                    Generate / Onboard Solana Wallet
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Private Key Export Modal */}
        {isExportOpen && (
          <PrivateKeyExport
            wallet={{ address: solAddress }}
            onClose={() => setIsExportOpen(false)}
          />
        )}

        {/* Regenerate Wallet Warning Dialog */}
        <AlertDialog
          open={isResetDialogOpen}
          onOpenChange={(open) => {
            setIsResetDialogOpen(open);
            if (!open) {
              setAckTransferred(false);
              setAckBackedUp(false);
              setAckLiability(false);
            }
          }}
        >
          <AlertDialogContent className="bg-slate-900 border-red-500/30 text-white max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-lg font-black flex items-center gap-2 text-red-400">
                <AlertCircle className="w-5 h-5" /> Regenerate Wallet Keypair
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3 text-xs text-white/70">
                  <p>Regenerating creates a brand-new Solana wallet and permanently deletes the current keypair from this device.</p>
                  <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 space-y-2 text-red-200">
                    <p className="font-bold uppercase tracking-wide">Warning — possible loss of funds</p>
                    <p>If you have <span className="font-bold">not transferred your funds</span> out of the current wallet, or <span className="font-bold">backed up your private key</span>, you will lose access to all assets in the current wallet <span className="font-bold">permanently</span>.</p>
                    <p className="text-red-300/90">openTILL cannot recover lost funds. We have <span className="font-bold">no liability</span> and cannot help recover assets from a discarded wallet.</p>
                  </div>
                  <p className="text-white/50">Please confirm all of the following before continuing:</p>
                  <div className="space-y-2">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <Checkbox checked={ackTransferred} onCheckedChange={setAckTransferred} className="mt-0.5 border-white/30 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600" />
                      <span>I have transferred all funds out of my current wallet (or it has a zero balance).</span>
                    </label>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <Checkbox checked={ackBackedUp} onCheckedChange={setAckBackedUp} className="mt-0.5 border-white/30 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600" />
                      <span>I have backed up my current private key / encrypted backup file.</span>
                    </label>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <Checkbox checked={ackLiability} onCheckedChange={setAckLiability} className="mt-0.5 border-white/30 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600" />
                      <span>I understand openTILL has no liability and cannot help recover any assets left in the old wallet.</span>
                    </label>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-white/10 text-white hover:bg-white/5">Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={!ackTransferred || !ackBackedUp || !ackLiability || resetting}
                onClick={(e) => { e.preventDefault(); performReset(); }}
                className="bg-red-600 hover:bg-red-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {resetting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <AlertCircle className="w-4 h-4 mr-1.5" />}
                I understand — Regenerate Wallet
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </div>
  );
}