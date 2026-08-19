import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Lock, LogIn, Wallet, ShieldCheck, Send, ArrowDownLeft, Coins, Cpu, KeyRound, Copy, Check, AlertCircle, RefreshCw, History, Rocket, ArrowLeftRight, ExternalLink, LayoutDashboard } from 'lucide-react';
import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { getPrice, WSOL } from '@/lib/smpfPrices';
import { getWallet, listWallets, clearAllWallets } from '@/lib/smpfWalletStore';
import { getNetworkRpcList, withTimeout } from '@/lib/smpfRpc';
import { getTokenMeta } from '@/lib/smpfTokenMeta';
import { DUC_LOGO_URL, JUPITER_REFERRAL_LINK } from '@/lib/smpfConstants';

// Import your SMPF sub-components
import PrivateKeyExport from '@/components/smpf/PrivateKeyExport';
import TokensTab from '@/components/smpf/TokensTab';
import TransactionHistoryTab from '@/components/smpf/TransactionHistoryTab';
import SendScreen from '@/components/smpf/SendScreen';
import DucPresaleCard from '@/components/smpf/DucPresaleCard';
import ConnectRewardsCard from '@/components/smpf/ConnectRewardsCard';
import RestoreFromBackup from '@/components/smpf/RestoreFromBackup';

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
  const [tokenRefresh, setTokenRefresh] = useState(0);
  const [ducBalance, setDucBalance] = useState(null);
  const [ducLoading, setDucLoading] = useState(false);
  const [ducMeta, setDucMeta] = useState(null);
  const [dashboardUrl, setDashboardUrl] = useState(createPageUrl('SystemMenu'));

  // Receive Modal States
  const [isReceiveOpen, setIsReceiveOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSendOpen, setIsSendOpen] = useState(false);
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
    // Use the admin-selected Solana cluster (mainnet / testnet / devnet).
    const rpcs = getNetworkRpcList(settings);
    let bestLamports = -1;
    for (const rpc of rpcs) {
      try {
        const conn = new Connection(rpc, 'confirmed');
        const lamports = await conn.getBalance(new PublicKey(solAddress));
        if (lamports > bestLamports) bestLamports = lamports;
      } catch (e) {
        console.warn('SOL balance fetch failed on', rpc, e);
      }
    }
    if (bestLamports >= 0) {
      setSolBalance(bestLamports / 1e9);
      setSolError(null);
    } else {
      setSolError('Unable to fetch balance — public RPC may be rate-limited.');
    }
    setSolLoading(false);
  }, [solAddress, settings?.default_network, settings?.rpc_mainnet, settings?.rpc_testnet, settings?.rpc_devnet]);

  // Fetch $DUC (verified mint) balance via a backend function. Browser RPCs
  // can't reliably call getTokenAccountsByOwner (mainnet-beta 403s on Origin,
  // publicnode times out), so the lookup runs server-side where it works.
  const refreshDuc = useCallback(async () => {
    const ducMint = settings?.verified_duc_mint;
    if (!solAddress || !ducMint) { setDucBalance(0); setDucLoading(false); return; }
    setDucLoading(true);
    try {
      const res = await base44.functions.invoke('getDucBalance', { address: solAddress });
      const data = res.data || {};
      setDucBalance(typeof data.ducBalance === 'number' ? data.ducBalance : 0);
    } catch (e) {
      console.warn('DUC balance fetch failed:', e);
      setDucBalance(0);
    } finally {
      setDucLoading(false);
    }
  }, [solAddress, settings?.verified_duc_mint, settings?.default_network]);

  // Fetch $DUC token metadata (image/name) for the overview card.
  useEffect(() => {
    const m = settings?.verified_duc_mint;
    if (!m) return;
    getTokenMeta(m, settings).then(setDucMeta).catch(() => {});
  }, [settings?.verified_duc_mint, settings?.default_network]);

  // Initial fetch + re-fetch whenever the address / RPC config changes
  useEffect(() => {
    refreshBalance();
    refreshDuc();
  }, [refreshBalance, refreshDuc]);

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

      // Determine the user's role-based dashboard for the "Back to Dashboard" button.
      // Admin → SuperAdmin, Ambassador/Dealer → DealerDashboard,
      // Builder → BuilderDashboard, Merchant (default) → SystemMenu.
      if (currentUser.role === 'admin' || currentUser.is_admin) {
        setDashboardUrl(createPageUrl('SuperAdmin'));
      } else if (localStorage.getItem('dealerToken') || currentUser.dealer_id) {
        setDashboardUrl(createPageUrl('DealerDashboard'));
      } else {
        try {
          const builders = await base44.entities.Builder.filter({ user_email: currentUser.email });
          if (builders && builders.length > 0) {
            setDashboardUrl(createPageUrl('BuilderDashboard'));
          } else {
            setDashboardUrl(createPageUrl('SystemMenu'));
          }
        } catch {
          setDashboardUrl(createPageUrl('SystemMenu'));
        }
      }

      // 2. Load global wallet settings & configurations
      const settingsList = await base44.entities.DUCWalletSettings.list().catch(() => []);
      const currentSettings = settingsList?.[0] || null;
      setSettings(currentSettings);

      // 3. Retrieve local IndexedDB Solana Wallet entries.
      let localWallets = await listWallets(currentUser.id).catch(() => []);
      // Fallback: if no wallets matched this user, try all local wallets (handles
      // wallets saved before per-user isolation or with a mismatched user_id).
      if (!localWallets || localWallets.length === 0) {
        localWallets = await listWallets(null).catch(() => []);
      }

      const boundAddress = (currentUser.wallet_address || '').trim();

      // The backend-bound wallet address is the source of truth. A stale local
      // keypair with a DIFFERENT address must never silently override it — that
      // was causing the actual app (different browser origin than the preview)
      // to surface an old wallet instead of the bound one.
      let activeWallet = null;
      if (boundAddress) {
        activeWallet = (localWallets || []).find((w) => {
          const addr = (w.address || w.public_key || '').trim();
          return addr && addr === boundAddress;
        }) || null;
      }

      // Only if there is no bound address do we fall back to local-keystore selection.
      if (!activeWallet && !boundAddress) {
        activeWallet = localWallets?.[0] || null;
        if (localWallets && localWallets.length > 1) {
          const rpcs = getNetworkRpcList(currentSettings);
          const fetchBalance = async (addr) => {
            let best = -1;
            for (const rpc of rpcs) {
              try {
                const conn = new Connection(rpc, 'confirmed');
                const lam = await conn.getBalance(new PublicKey(addr));
                if (lam > best) best = lam;
              } catch (e) { /* try next rpc */ }
            }
            return best;
          };
          const results = await Promise.all(localWallets.map(async (w) => {
            const addr = w.address || w.public_key;
            if (!addr) return { w, bal: -1 };
            return { w, bal: await fetchBalance(addr) };
          }));
          results.sort((a, b) => b.bal - a.bal);
          if (results[0] && results[0].bal > 0) activeWallet = results[0].w;
        }
      }

      if (activeWallet) {
        setWallet(activeWallet);
        setSolAddress(activeWallet.address || activeWallet.public_key || '');
      } else if (boundAddress) {
        // No matching local keypair, but the account has a bound wallet address —
        // use it so balance/history still render. (Private key export won't be
        // available until the wallet is restored from backup on this device.)
        setSolAddress(boundAddress);
      }
    } catch (err) {
      console.error('Error initializing openTILL SMPF Wallet:', err);
    } finally {
      setLoading(false);
    }
  }

  async function refreshUser() {
    try {
      const u = await base44.auth.me();
      setUser(u);
    } catch {}
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => (window.location.href = dashboardUrl)}
              className="border-white/20 bg-white/5 text-white hover:bg-white/10 text-xs"
            >
              <LayoutDashboard className="w-3.5 h-3.5 mr-1.5" /> Dashboard
            </Button>
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

        {/* $DUC Presale — above the tab menu so it's always visible */}
        <DucPresaleCard />

        {/* Main Wallet Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Mobile: dropdown menu */}
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="md:hidden w-full bg-slate-900 border-white/10 text-white rounded-xl h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/10 text-white">
              <SelectItem value="overview" className="text-white focus:bg-indigo-600 focus:text-white">Balance</SelectItem>
              <SelectItem value="tokens" className="text-white focus:bg-indigo-600 focus:text-white">Tokens</SelectItem>
              <SelectItem value="history" className="text-white focus:bg-indigo-600 focus:text-white">History</SelectItem>
              <SelectItem value="chips" className="text-white focus:bg-indigo-600 focus:text-white">Chips</SelectItem>
              <SelectItem value="keys" className="text-white focus:bg-indigo-600 focus:text-white">Keys</SelectItem>
            </SelectContent>
          </Select>

          {/* Desktop: tab grid */}
          <TabsList className="hidden md:grid md:grid-cols-5 bg-slate-900 border border-white/10 p-1 rounded-xl w-full gap-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-xs px-3 py-2 flex-1">
              <Wallet className="w-3.5 h-3.5 mr-1.5" /> <span>Balance</span>
            </TabsTrigger>
            <TabsTrigger value="tokens" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-xs px-3 py-2 flex-1">
              <Coins className="w-3.5 h-3.5 mr-1.5" /> <span>Tokens</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-xs px-3 py-2 flex-1">
              <History className="w-3.5 h-3.5 mr-1.5" /> <span>History</span>
            </TabsTrigger>
            <TabsTrigger value="chips" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-xs px-3 py-2 flex-1">
              <Cpu className="w-3.5 h-3.5 mr-1.5" /> <span>Chips</span>
            </TabsTrigger>
            <TabsTrigger value="keys" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-xs px-3 py-2 flex-1">
              <KeyRound className="w-3.5 h-3.5 mr-1.5" /> <span>Keys</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab Content */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
              {/* Left main column: SOL balance on top, $DUC balance below */}
              <div className="md:col-span-2 flex flex-col gap-4">
                <Card className="bg-slate-900 border-white/10 text-white">
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
                    <Button
                      disabled={settings?.is_paused || !solAddress}
                      onClick={() => setIsSendOpen(true)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold w-full sm:w-auto"
                    >
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
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs text-white/60 font-mono uppercase tracking-wider">$DUC Balance</CardTitle>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-white/50 hover:text-white" onClick={refreshDuc} title="Refresh $DUC">
                        <RefreshCw className={ducLoading ? 'w-3.5 h-3.5 animate-spin' : 'w-3.5 h-3.5'} />
                      </Button>
                    </div>
                    <div className="flex items-center gap-3">
                      <img src={DUC_LOGO_URL} alt="$DUC" className="w-10 h-10 rounded-full object-cover border border-indigo-400/40" />
                      <div className="text-3xl font-black font-mono tracking-tight text-white flex items-baseline gap-2">
                        {ducLoading && ducBalance === null ? (
                          <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                        ) : ducBalance !== null ? (
                          ducBalance.toFixed(2)
                        ) : (
                          '0.00'
                        )} <span className="text-xs font-normal text-white/40">$DUC</span>
                      </div>
                    </div>
                    {!settings?.verified_duc_mint && (
                      <p className="text-xs text-emerald-400 flex items-center gap-1.5 mt-1">
                        <Rocket className="w-3.5 h-3.5 shrink-0" /> $DUC is in presale — balance shows on-chain holdings
                      </p>
                    )}
                  </CardHeader>
                </Card>
              </div>

              {/* Right sidebar: Account Status (fills space) + Swap tile */}
              <div className="flex flex-col gap-4">
                <Card className="bg-slate-900 border-white/10 text-white flex-1 flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-xs text-white/60 font-mono uppercase tracking-wider">Account Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs flex-1">
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
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-white/60">Network:</span>
                      <span className="text-indigo-300 font-semibold capitalize">{settings?.default_network || 'mainnet'}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-white/60">Wallet:</span>
                      <span className="text-emerald-400 font-semibold">{wallet ? 'Local Keystore' : 'Bound (read-only)'}</span>
                    </div>
                  </CardContent>
                </Card>

                <ConnectRewardsCard user={user} solAddress={solAddress} wallet={wallet} onLinked={refreshUser} />

                {/* Swap on Jupiter (admin referral link) */}
                <Card className="bg-gradient-to-br from-indigo-600/20 to-purple-600/10 border-indigo-500/30 text-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-white/80 font-mono uppercase tracking-wider flex items-center gap-1.5">
                      <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-300" /> Swap on Jupiter
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-[11px] text-white/60">
                      Trade SOL, USDC, and SPL tokens at the best on-chain rates.
                    </p>
                    <Button
                      asChild
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold"
                    >
                      <a href={JUPITER_REFERRAL_LINK} target="_blank" rel="noopener noreferrer">
                        <ArrowLeftRight className="w-3.5 h-3.5 mr-1.5" /> Open Jupiter Swap
                        <ExternalLink className="w-3 h-3 ml-1.5 opacity-70" />
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tokens">
            {solAddress ? (
              <TokensTab
                address={solAddress}
                rpc={settings?.default_network === 'devnet' ? settings?.rpc_devnet : settings?.rpc_mainnet}
                settings={settings}
                refreshTrigger={tokenRefresh}
                ducBalance={ducBalance}
                ducLoading={ducLoading}
                onRefreshDuc={refreshDuc}
              />
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

        {/* Send Assets Modal */}
        <Dialog open={isSendOpen} onOpenChange={setIsSendOpen}>
          <DialogContent className="bg-slate-900 border-white/10 text-white max-w-md rounded-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-black flex items-center gap-2">
                <Send className="w-5 h-5 text-indigo-400" /> Send Assets
              </DialogTitle>
              <DialogDescription className="text-white/60 text-xs">
                Transfer SOL or SPL tokens from your openTILL wallet.
              </DialogDescription>
            </DialogHeader>
            {wallet && solAddress ? (
              <SendScreen
                address={solAddress}
                rpc={getNetworkRpcList(settings)[0] || 'https://api.mainnet-beta.solana.com'}
                network={settings?.default_network || 'mainnet'}
                onSent={() => {
                  refreshBalance();
                  refreshDuc();
                  setTokenRefresh((n) => n + 1);
                  // RPCs can lag a few seconds behind confirmation — re-fetch so the
                  // balance reflects the just-confirmed transfer.
                  setTimeout(() => { refreshBalance(); refreshDuc(); setTokenRefresh((n) => n + 1); }, 3000);
                }}
              />
            ) : (
              <RestoreFromBackup
                expectedAddress={solAddress}
                onRestored={() => initWallet()}
              />
            )}
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