import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Lock, LogIn, Wallet, ShieldCheck, Send, ArrowDownLeft, Coins, Cpu, KeyRound, Copy, Check, AlertCircle } from 'lucide-react';
import { getWallet, listWallets } from '@/lib/smpfWalletStore';

// Import your SMPF sub-components
import PrivateKeyExport from '@/components/smpf/PrivateKeyExport';
import TokensTab from '@/components/smpf/TokensTab';

export default function SMPFWallet() {
  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [solAddress, setSolAddress] = useState('');
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');

  // Receive Modal States
  const [isReceiveOpen, setIsReceiveOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    initWallet();
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

      // 3. Retrieve local IndexedDB Solana Wallet entry
      const localWallets = await listWallets(currentUser.id).catch(() => []);
      const activeWallet = localWallets?.[0] || null;

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
              <p className="text-xs text-white/60 font-mono">Solana Multi-Purpose Framework (SMPF)</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right text-xs">
              <span className="text-white/40 block text-[10px] uppercase tracking-wider">Account</span>
              <span className="font-mono text-indigo-300 font-medium">{user.email}</span>
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
          <TabsList className="bg-slate-900 border border-white/10 p-1 rounded-xl">
            <TabsTrigger value="overview" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-xs">
              <Wallet className="w-3.5 h-3.5 mr-1.5" /> Balance & Overview
            </TabsTrigger>
            <TabsTrigger value="tokens" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-xs">
              <Coins className="w-3.5 h-3.5 mr-1.5" /> Featured Tokens
            </TabsTrigger>
            <TabsTrigger value="chips" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-xs">
              <Cpu className="w-3.5 h-3.5 mr-1.5" /> Hardware Chips
            </TabsTrigger>
            <TabsTrigger value="keys" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-xs">
              <KeyRound className="w-3.5 h-3.5 mr-1.5" /> Security & Keys
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab Content */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-slate-900 border-white/10 text-white md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-xs text-white/60 font-mono uppercase tracking-wider">Total Portfolio Balance</CardTitle>
                  <div className="text-3xl font-black font-mono tracking-tight text-white flex items-baseline gap-2">
                    ${balance.toFixed(2)} <span className="text-xs font-normal text-white/40">USD</span>
                  </div>
                </CardHeader>
                <CardContent className="flex gap-3">
                  <Button disabled={settings?.is_paused} className="bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold">
                    <Send className="w-3.5 h-3.5 mr-1.5" /> Send SOL / Token
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsReceiveOpen(true)}
                    className="border-white/10 bg-slate-950 text-white hover:bg-white/5 text-xs font-semibold"
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
              <TokensTab address={solAddress} rpc={settings?.rpc_mainnet} settings={settings} />
            ) : (
              <Card className="bg-slate-900 border-white/10 text-white">
                <CardContent className="p-6 text-center text-xs text-white/60">
                  No Solana address found. Onboard a wallet to view token balances.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="keys">
            <PrivateKeyExport wallet={{ address: solAddress }} />
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

      </div>
    </div>
  );
}