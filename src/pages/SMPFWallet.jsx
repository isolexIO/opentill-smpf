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
  Wallet, Lock, Copy, CheckCircle2, BadgeCheck, Send as SendIcon, QrCode,
  Coins, Loader2, AlertTriangle, Download, Trash2, ShieldAlert, Zap, Activity, Image as ImageIcon,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { createPageUrl } from '@/utils';
import {
  listWallets, getWallet, removeWallet as removeWalletStore,
  getSession, setSession, clearSession,
} from '@/lib/smpfWalletStore';
import { decryptWallet, b64ToBuf } from '@/lib/smpfCrypto';
import WalletBottomNav, { NAV_ITEMS } from '@/components/smpf/WalletBottomNav';
import ReceiveScreen from '@/components/smpf/ReceiveScreen';
import SendScreen from '@/components/smpf/SendScreen';
import DUCMintAdmin from '@/components/smpf/DUCMintAdmin';
import ActivityScreen from '@/components/smpf/ActivityScreen';
import NFTGallery from '@/components/smpf/NFTGallery';
import TokensTab from '@/components/smpf/TokensTab';
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
  const saved = useRef();
  useEffect(() => { saved.current = callback; }, [callback]);
  useEffect(() => {
    if (delay === null) return;
    const id = setInterval(() => saved.current?.(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

export default function SMPFWallet() {
  const { toast } = useToast();
  const [bootState, setBootState] = useState('loading'); // loading | none | ready
  const [address, setAddress] = useState(null);
  const [locked, setLocked] = useState(true);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [settings, setSettings] = useState(null);
  const [network, setNetwork] = useState('devnet');
  const [sol, setSol] = useState(null);
  const [duc, setDuc] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState('');
  const [solUsd, setSolUsd] = useState(null);
  const lastActivity = useRef(Date.now());

  useEffect(() => {
    (async () => {
      const wallets = await listWallets().catch(() => []);
      if (!wallets.length) {
        setBootState('none');
        return;
      }
      setAddress(wallets[0].address);
      setBootState('ready');
    })();
  }, []);

  useEffect(() => {
    base44.entities.DUCWalletSettings.list()
      .then((s) => {
        const cfg = s?.[0] || null;
        setSettings(cfg);
        setNetwork(cfg?.default_network || 'devnet');
      })
      .catch(() => setSettings(null));
  }, []);

  const rpc = useMemo(() => {
    if (network === 'devnet') return settings?.rpc_devnet || 'https://api.devnet.solana.com';
    return settings?.rpc_mainnet || 'https://api.mainnet-beta.solana.com';
  }, [network, settings]);

  // If a session already exists (e.g. navigated here right after onboarding), unlock.
  useEffect(() => {
    if (bootState === 'ready' && getSession() && !locked) return;
    if (bootState === 'ready' && getSession()) {
      setLocked(false);
    }
  }, [bootState]);

  // Auto-lock on inactivity.
  useInterval(() => {
    if (bootState !== 'ready' || locked) return;
    if (Date.now() - lastActivity.current > AUTO_LOCK_MS) {
      clearSession();
      setLocked(true);
      toast({ title: 'Wallet locked', description: 'Auto-locked after inactivity.' });
    }
  }, 15000);

  function bumpActivity() {
    lastActivity.current = Date.now();
  }

  useEffect(() => { bumpActivity(); }, [activeTab]);

  async function unlock() {
    if (!password) return;
    setBusy(true);
    try {
      const stored = await getWallet(address);
      if (!stored) throw new Error('Wallet backup not found.');
      const recovered = await decryptWallet(stored.backup, password);
      if (recovered.address !== address) throw new Error('Backup does not match this wallet.');
      setSession(recovered.secretKeyB64, recovered.address);
      setLocked(false);
      setPassword('');
      await loadBalances();
    } catch (e) {
      toast({ title: 'Unlock failed', description: e.message || 'Incorrect wallet password.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  function lock() {
    clearSession();
    setLocked(true);
    setSol(null);
    setDuc(null);
    setTokens([]);
  }

  async function loadBalances() {
    if (!address) return;
    const conn = new Connection(rpc, 'confirmed');
    try {
      const lamports = await conn.getBalance(new PublicKey(address));
      setSol(lamports / 1e9);
    } catch {
      setSol(null);
    }
    try {
      if (settings?.verified_duc_mint) {
        const res = await conn.getTokenAccountsByOwner(new PublicKey(address), { mint: new PublicKey(settings.verified_duc_mint) });
        let total = 0;
        for (const acc of res.value) {
          const info = await conn.getParsedAccountInfo(acc.pubkey);
          const amt = info?.value?.data?.parsed?.info?.tokenAmount?.uiAmount;
          if (typeof amt === 'number') total += amt;
        }
        setDuc(total);
      } else {
        setDuc(null);
      }
    } catch {
      setDuc(null);
    }
    try {
      const res = await conn.getTokenAccountsByOwner(new PublicKey(address), { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') });
      setTokens(res.value.map((a) => ({ pubkey: a.pubkey.toBase58(), mint: a.account.data.parsed?.info?.mint, owner: a.account.data.parsed?.info?.owner })));
    } catch {
      setTokens([]);
    }
  }

  useEffect(() => {
    if (bootState === 'ready' && !locked) loadBalances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rpc, locked, bootState]);

  useEffect(() => {
    if (address) QRCode.toDataURL(address, { margin: 1, width: 220, color: { dark: '#0f172a', light: '#ffffff' } }).then(setQr).catch(() => {});
  }, [address]);
  useEffect(() => { getSolUsdPrice().then(setSolUsd).catch(() => {}); }, []);

  function copyAddress() {
    if (!address) return;
    navigator.clipboard?.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function downloadBackup() {
    const stored = await getWallet(address);
    if (!stored) return;
    const file = new Blob([JSON.stringify(stored.backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = `opentill-smpf-wallet-${address.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function removeWallet() {
    if (!confirm('Remove this wallet from this device? Your encrypted backup file is still needed to recover funds.')) return;
    await removeWalletStore(address);
    window.location.href = createPageUrl('SMPFWalletOnboarding');
  }

  // === Boot states ===
  if (bootState === 'loading') {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-emerald-400" /></div>;
  }
  if (bootState === 'none') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-4">
        <Card className="max-w-md bg-white/10 border-white/20">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center">
              <Wallet className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">No SMPF wallet yet</h1>
            <p className="text-white/60 text-sm">Create your custom SMPF address to get started.</p>
            <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => window.location.href = createPageUrl('SMPFWalletOnboarding')}>
              Create my SMPF wallet
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // === Locked screen ===
  if (locked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-white/10 border-white/20">
          <CardContent className="p-8 space-y-4">
            <div className="text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-white/10 flex items-center justify-center mb-3">
                <Lock className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-xl font-bold text-white">Unlock your wallet</h1>
              <p className="text-white/60 text-xs mt-1 break-all font-mono">{address}</p>
            </div>
            <div>
              <Label className="text-white">Wallet password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && unlock()} className="mt-1 bg-white/10 border-white/20 text-white" autoFocus />
            </div>
            <Button onClick={unlock} disabled={busy || !password} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white">
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
              Unlock
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // === Unlocked shell ===
  const explorer = network === 'devnet' ? 'https://solana.fm/address' : 'https://solscan.io/account';
  const ducMintMissing = !settings?.verified_duc_mint;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white pb-24 md:pb-0" onClick={bumpActivity}>
      {/* Desktop sidebar / mobile header */}
      <div className="md:flex">
        <aside className="hidden md:flex flex-col w-56 min-h-screen border-r border-white/10 p-4 gap-1 sticky top-0">
          <div className="flex items-center gap-2 px-2 py-3 mb-2">
            <img src={DUC_LOGO} alt="$DUC" className="w-8 h-8 rounded-full bg-white/10 p-1" />
            <div className="leading-none">
              <div className="font-black text-sm">openTILL</div>
              <div className="text-[10px] text-white/50">SMPF Wallet</div>
            </div>
          </div>
          {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveTab(key)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${activeTab === key ? 'bg-emerald-500/20 text-emerald-300' : 'text-white/60 hover:bg-white/5'}`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
          <button onClick={lock} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/60 hover:bg-white/5 mt-2">
            <Lock className="w-4 h-4" /> Lock
          </button>
        </aside>
      </div>

      <main className="md:ml-56 max-w-3xl md:mx-auto px-4 py-6 space-y-6 md:py-10">
        {activeTab === 'home' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src={DUC_LOGO} alt="$DUC" className="w-9 h-9 rounded-full bg-white/10 p-1 md:hidden" />
                <div>
                  <h1 className="text-xl font-black">openTILL SMPF Wallet</h1>
                  <p className="text-white/50 text-xs">Network: <span className={network === 'devnet' ? 'text-yellow-300' : 'text-emerald-300'}>{network === 'devnet' ? 'Devnet (test)' : 'Mainnet'}</span></p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="border-white/20 text-white bg-transparent" onClick={lock}><Lock className="w-4 h-4 mr-1" /> Lock</Button>
            </div>

            {ducMintMissing && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <ShieldAlert className="w-4 h-4 text-red-300 shrink-0 mt-0.5" />
                <p className="text-xs text-red-200">$DUC mint has not been configured. $DUC balances cannot be shown until an administrator verifies the mint.</p>
              </div>
            )}

            {/* Wallet address card */}
            <Card className="bg-white/10 border-white/20">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-4">
                  {qr && <img src={qr} alt="QR" className="w-24 h-24 rounded-lg bg-white p-1" />}
                  <div className="flex-1 min-w-0">
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-semibold mb-1">
                      <BadgeCheck className="w-3 h-3" /> SMPF Verified
                    </div>
                    <div className="font-mono text-xs break-all text-white/90">{address}</div>
                    <Button variant="ghost" size="sm" className="text-white/70 hover:text-white px-0" onClick={copyAddress}>
                      {copied ? <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-300" /> : <Copy className="w-4 h-4 mr-1" />}
                      {copied ? 'Copied' : 'Copy address'}
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => setActiveTab('receive')}><QrCode className="w-4 h-4 mr-2" /> Receive</Button>
                  <Button className="bg-white text-purple-700 hover:bg-gray-100" onClick={() => setActiveTab('send')}><SendIcon className="w-4 h-4 mr-2" /> Send</Button>
                </div>
              </CardContent>
            </Card>

            {/* Balances */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-black/30 rounded-xl p-4">
                <p className="text-xs text-white/50 uppercase tracking-wide">Total value (est.)</p>
                <p className="text-xl font-bold">{sol !== null ? (solUsd !== null ? `$${(sol * solUsd).toFixed(2)}` : `${sol.toFixed(4)}`) : '—'}</p>
              </div>
              <div className="bg-black/30 rounded-xl p-4">
                <p className="text-xs text-white/50 uppercase tracking-wide">SOL</p>
                <p className="text-xl font-bold">{sol !== null ? sol.toFixed(4) : '…'}</p>
                {solUsd !== null && sol !== null && <p className="text-xs text-white/40">≈ ${(sol * solUsd).toFixed(2)}</p>}
              </div>
              <div className="bg-gradient-to-br from-yellow-500/20 to-orange-600/10 border border-yellow-400/30 rounded-xl p-4">
                <p className="text-xs text-yellow-200/70 uppercase tracking-wide">$DUC</p>
                <p className="text-xl font-bold text-yellow-200">{duc !== null ? duc.toFixed(2) : (ducMintMissing ? '—' : '…')}</p>
              </div>
              <div className="bg-black/30 rounded-xl p-4">
                <p className="text-xs text-white/50 uppercase tracking-wide">Tokens</p>
                <p className="text-xl font-bold">{tokens.length}</p>
              </div>
            </div>

            {/* $DUC pinned asset */}
            <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-600/5 border-yellow-400/20">
              <CardContent className="p-4 flex items-center gap-3">
                <img src={DUC_LOGO} alt="$DUC" className="w-10 h-10 rounded-full bg-white/10 p-1" />
                <div className="flex-1">
                  <p className="font-bold text-yellow-200">Digital Utility Credit</p>
                  <p className="text-xs text-white/50">{DUC_BRANDING.description}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-yellow-200">{duc !== null ? duc.toFixed(2) : '—'}</p>
                  <p className="text-xs text-white/40">DUC</p>
                </div>
              </CardContent>
            </Card>

            <p className="text-[10px] text-white/40 px-1">
              $DUC is a utility token, not stock, equity, a dividend, or a guaranteed investment. Fiat values, where shown, are estimates.
            </p>
          </div>
        )}

        {activeTab === 'tokens' && (
          <TokensTab address={address} rpc={rpc} settings={settings} />
        )}

        {activeTab === 'send' && <SendScreen address={address} rpc={rpc} network={network} />}
        {activeTab === 'receive' && <ReceiveScreen address={address} />}

        {activeTab === 'nfts' && (
          <NFTGallery address={address} settings={settings} network={network} />
        )}

        {activeTab === 'activity' && (
          <ActivityScreen address={address} rpc={rpc} network={network} />
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h1 className="text-xl font-black">Settings</h1>

            <Card className="bg-white/10 border-white/20">
              <CardHeader><CardTitle className="text-base">Network</CardTitle><CardDescription className="text-white/50">Devnet assets are test-only. Do not confuse them with real funds.</CardDescription></CardHeader>
              <CardContent className="flex items-center justify-between">
                <span className={network === 'devnet' ? 'text-yellow-300' : 'text-emerald-300'}>{network === 'devnet' ? 'Devnet' : 'Mainnet'}</span>
                <Switch checked={network === 'mainnet'} onCheckedChange={(c) => { setNetwork(c ? 'mainnet' : 'devnet'); }} />
              </CardContent>
            </Card>

            <Card className="bg-white/10 border-white/20">
              <CardContent className="p-4 space-y-3">
                <Button variant="outline" className="w-full border-white/20 text-white bg-transparent" onClick={downloadBackup}><Download className="w-4 h-4 mr-2" /> Export encrypted backup</Button>
                <Button variant="outline" className="w-full border-white/20 text-red-300 bg-transparent" onClick={removeWallet}><Trash2 className="w-4 h-4 mr-2" /> Remove wallet from this device</Button>
              </CardContent>
            </Card>

            <AddressBookManager />
            <PrivateKeyExport address={address} />

            <DUCMintAdmin settings={settings} onSaved={setSettings} />

            <div className="flex items-start gap-2 p-3 rounded-lg bg-black/30">
              <Zap className="w-4 h-4 text-yellow-300 shrink-0 mt-0.5" />
              <p className="text-xs text-white/50">Auto-lock after 5 minutes of inactivity. Your private key never leaves this device unencrypted.</p>
            </div>
          </div>
        )}
      </main>

      <WalletBottomNav active={activeTab} onChange={setActiveTab} />
    </div>
  );
}