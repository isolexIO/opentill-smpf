import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import QRCode from 'qrcode';
import {
  Wallet,
  Lock,
  Copy,
  CheckCircle2,
  BadgeCheck,
  Send as SendIcon,
  QrCode,
  Coins,
  Loader2,
  AlertTriangle,
  Download,
  Trash2,
  ShieldAlert,
  Zap,
  Activity,
  Image as ImageIcon,
  Key,
  BookOpen,
  LogOut,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { createPageUrl } from '@/utils';
import {
  listWallets,
  getWallet,
  removeWallet as removeWalletStore,
  getSession,
  setSession,
  clearSession,
  getCurrentUserId,
} from '@/lib/smpfWalletStore';
import { decryptWallet, b64ToBuf } from '@/lib/smpfCrypto';
import WalletBottomNav, { NAV_ITEMS } from '@/components/smpf/WalletBottomNav';
import ReceiveScreen from '@/components/smpf/ReceiveScreen';
import SendScreen from '@/components/smpf/SendScreen';
import DUCMintAdmin from '@/components/smpf/DUCMintAdmin';
import ActivityScreen from '@/components/smpf/ActivityScreen';
import NFTGallery from '@/components/smpf/NFTGallery';
import TokensTab from '@/components/smpf/TokensTab';
import ExternalWalletConnect from '@/components/smpf/ExternalWalletConnect';
import AddressBookManager from '@/components/smpf/AddressBookManager';
import PrivateKeyExport from '@/components/smpf/PrivateKeyExport';
import { getSolUsdPrice } from '@/lib/smpfPrices';

const DUC_LOGO =
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6970e2871534100b4ebb8d45/8e45f76fe_DUC3.png';

const AUTO_LOCK_MS = 5 * 60 * 1000;

const DUC_BRANDING = {
  name: 'Digital Utility Credit',
  symbol: 'DUC',
  ecosystem: 'openTILL SMPF',
  description:
    'Native utility token for openTILL participation, feature access, merchant incentives, loyalty, and ecosystem functionality.',
};

function useInterval(callback, delay) {
  const savedCallback = useRef();

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay !== null) {
      const id = setInterval(() => savedCallback.current(), delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}

export default function SMPFWallet() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('tokens');
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [session, setSessionState] = useState(null);
  const [password, setPassword] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [balanceSol, setBalanceSol] = useState(0);
  const [solPrice, setSolPrice] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showAddressBook, setShowAddressBook] = useState(false);

  // Load wallet metadata & existing session
  useEffect(() => {
    async function initWallet() {
      try {
        setLoading(true);
        const userId = await getCurrentUserId();
        const wallets = await listWallets(userId);
        if (wallets.length > 0) {
          setWallet(wallets[0]);
        }
        const activeSession = getSession();
        if (activeSession) {
          setSessionState(activeSession);
        }
      } catch (err) {
        console.error('Failed to load wallet:', err);
      } finally {
        setLoading(false);
      }
    }
    initWallet();
  }, []);

  // Fetch prices and network balances
  const fetchBalance = async () => {
    if (!wallet?.address) return;
    try {
      const price = await getSolUsdPrice();
      setSolPrice(price || 0);

      const conn = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
      const pubkey = new PublicKey(wallet.address);
      const lamports = await conn.getBalance(pubkey);
      setBalanceSol(lamports / 1e9);
    } catch (e) {
      console.warn('Unable to fetch live balance:', e);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, [wallet?.address]);

  useInterval(fetchBalance, 30000);

  // Handle wallet unlocking
  const handleUnlock = async (e) => {
    e.preventDefault();
    if (!wallet || !password) return;
    setUnlocking(true);
    try {
      const decryptedB64 = await decryptWallet(wallet.encryptedData, password);
      setSession(decryptedB64, wallet.address);
      setSessionState({ secretKeyB64: decryptedB64, address: wallet.address });
      setPassword('');
      toast({ title: 'Wallet Unlocked', description: 'Session active for 5 minutes.' });
    } catch (err) {
      toast({
        title: 'Unlock Failed',
        description: 'Incorrect password or corrupt key data.',
        variant: 'destructive',
      });
    } finally {
      setUnlocking(false);
    }
  };

  const handleLock = () => {
    clearSession();
    setSessionState(null);
    toast({ title: 'Wallet Locked' });
  };

  const copyAddress = () => {
    if (!wallet?.address) return;
    navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'Copied', description: 'Address copied to clipboard.' });
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-slate-950 text-white flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full space-y-6 my-auto">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mx-auto">
            <Wallet className="w-8 h-8 text-indigo-400" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">No SMPF Wallet Found</h1>
            <p className="text-white/60 text-sm">
              You haven't set up an openTILL SMPF wallet yet. Create or import one to access $DUC.
            </p>
          </div>
          <Button
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold py-3"
            onClick={() => (window.location.href = createPageUrl('SMPFWalletOnboarding'))}
          >
            Get Started
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full bg-slate-950 text-white flex flex-col pb-20">
      {/* Header Bar */}
      <header className="border-b border-white/10 bg-slate-900/60 backdrop-blur sticky top-0 z-30 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={DUC_LOGO} alt="$DUC" className="w-8 h-8 rounded-full bg-white/10 p-0.5" />
          <div>
            <h1 className="font-bold text-sm leading-tight">openTILL Wallet</h1>
            <button
              onClick={copyAddress}
              className="flex items-center gap-1 text-xs text-white/60 hover:text-white transition-colors"
            >
              <span>
                {wallet.address.slice(0, 4)}…{wallet.address.slice(-4)}
              </span>
              {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {session ? (
            <Button size="sm" variant="outline" className="border-white/20 text-xs gap-1 text-white bg-transparent" onClick={handleLock}>
              <Lock className="w-3 h-3" /> Lock
            </Button>
          ) : (
            <Button size="sm" variant="ghost" className="text-xs text-amber-400 hover:text-amber-300">
              <ShieldAlert className="w-3.5 h-3.5 mr-1" /> Locked
            </Button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-lg w-full mx-auto p-4 space-y-6">
        {/* Balance Card */}
        <Card className="bg-gradient-to-br from-indigo-900/40 via-slate-900 to-slate-900 border-white/10 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between text-xs text-white/60">
              <span>Total Estimated Portfolio</span>
              <button onClick={fetchBalance} className="hover:text-white transition-colors">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div>
              <div className="text-3xl font-black tracking-tight">
                ${(balanceSol * solPrice).toFixed(2)}{' '}
                <span className="text-sm font-normal text-white/60">USD</span>
              </div>
              <p className="text-xs text-white/60 mt-1">
                {balanceSol.toFixed(4)} SOL @ ${solPrice.toFixed(2)}
              </p>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-4 gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                className="bg-white/10 hover:bg-white/20 text-white flex-col h-auto py-2.5 text-xs gap-1"
                onClick={() => setActiveTab('send')}
              >
                <SendIcon className="w-4 h-4 text-emerald-400" />
                Send
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="bg-white/10 hover:bg-white/20 text-white flex-col h-auto py-2.5 text-xs gap-1"
                onClick={() => setActiveTab('receive')}
              >
                <QrCode className="w-4 h-4 text-indigo-400" />
                Receive
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="bg-white/10 hover:bg-white/20 text-white flex-col h-auto py-2.5 text-xs gap-1"
                onClick={() => setShowAddressBook(true)}
              >
                <BookOpen className="w-4 h-4 text-amber-400" />
                Contacts
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="bg-white/10 hover:bg-white/20 text-white flex-col h-auto py-2.5 text-xs gap-1"
                onClick={() => setShowExportModal(true)}
              >
                <Key className="w-4 h-4 text-purple-400" />
                Keys
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lock Prompt Screen when key action requires unlock */}
        {!session && activeTab === 'send' ? (
          <Card className="bg-white/5 border-white/10 text-white">
            <CardHeader className="text-center">
              <CardTitle className="text-lg flex items-center justify-center gap-2">
                <Lock className="w-5 h-5 text-amber-400" /> Unlock Required
              </CardTitle>
              <CardDescription className="text-white/60 text-xs">
                Enter your password to sign transactions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUnlock} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs">Wallet Password</Label>
                  <Input
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-slate-900/80 border-white/10 text-white"
                  />
                </div>
                <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500" disabled={unlocking}>
                  {unlocking ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Unlock Wallet'}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          /* Active Screen View */
          <div>
            {activeTab === 'tokens' && <TokensTab address={wallet.address} balanceSol={balanceSol} />}
            {activeTab === 'send' && <SendScreen session={session} address={wallet.address} onSent={fetchBalance} />}
            {activeTab === 'receive' && <ReceiveScreen address={wallet.address} />}
            {activeTab === 'activity' && <ActivityScreen address={wallet.address} />}
            {activeTab === 'nfts' && <NFTGallery address={wallet.address} />}
            {activeTab === 'mint' && <DUCMintAdmin address={wallet.address} session={session} />}
            {activeTab === 'connect' && <ExternalWalletConnect />}
          </div>
        )}
      </main>

      {/* Address Book Modal */}
      {showAddressBook && (
        <AddressBookManager onClose={() => setShowAddressBook(false)} />
      )}

      {/* Private Key Export Modal */}
      {showExportModal && (
        <PrivateKeyExport
          wallet={wallet}
          session={session}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {/* Bottom Navigation */}
      <WalletBottomNav activeTab={activeTab} onChange={setActiveTab} />
    </div>
  );
}