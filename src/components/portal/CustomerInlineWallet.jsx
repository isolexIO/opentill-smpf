import React, { useState, useEffect, useCallback } from 'react';
import { Keypair, Connection, PublicKey } from '@solana/web3.js';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Wallet, Send, ArrowDownLeft, Copy, Check, Loader2, Plus, KeyRound, RefreshCw, Coins, ExternalLink } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { listWallets, saveWallet } from '@/lib/smpfWalletStore';
import { encryptWallet } from '@/lib/smpfCrypto';
import { getNetworkRpcList } from '@/lib/smpfRpc';
import { getPrice, WSOL } from '@/lib/smpfPrices';
import { DUC_LOGO_URL } from '@/lib/smpfConstants';
import SendScreen from '@/components/smpf/SendScreen';
import QRCode from 'qrcode';
import { useToast } from '@/components/ui/use-toast';

export default function CustomerInlineWallet() {
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

  // Wallet creation state
  const [showCreate, setShowCreate] = useState(false);
  const [createPassword, setCreatePassword] = useState('');
  const [createConfirm, setCreateConfirm] = useState('');
  const [creating, setCreating] = useState(false);

  const rpc = settings ? getNetworkRpcList(settings)[0] : 'https://api.mainnet-beta.solana.com';
  const network = settings?.default_network || 'mainnet';

  useEffect(() => { init(); }, []);

  const init = async () => {
    try {
      const settingsList = await base44.entities.DUCWalletSettings.list().catch(() => []);
      setSettings(settingsList?.[0] || null);

      const localWallets = await listWallets(null).catch(() => []);
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

  const handleCreateWallet = async (e) => {
    e.preventDefault();
    if (createPassword.length < 6) {
      toast({ title: 'Password too short', description: 'Use at least 6 characters', variant: 'destructive' });
      return;
    }
    if (createPassword !== createConfirm) {
      toast({ title: 'Passwords don\'t match', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      const kp = Keypair.generate();
      const backup = await encryptWallet(kp.secretKey, createPassword, kp.publicKey.toString());
      await saveWallet(kp.publicKey.toString(), backup, null);
      setWallet({ address: kp.publicKey.toString(), backup });
      setAddress(kp.publicKey.toString());
      setShowCreate(false);
      setCreatePassword('');
      setCreateConfirm('');
      toast({ title: 'Wallet created!', description: 'Your SMPF wallet is ready to use.' });
    } catch (err) {
      toast({ title: 'Wallet creation failed', description: err.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
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

  // No wallet yet — show create/import prompt
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
              Create a wallet to hold your $DUC rewards, send payments, and receive crypto from anyone.
            </p>
            <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600" onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-2" /> Create Wallet
            </Button>
          </CardContent>
        </Card>

        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><KeyRound className="w-5 h-5" /> Create Your Wallet</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateWallet} className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                Choose a strong password — it encrypts your wallet on this device. If you forget it, your wallet cannot be recovered.
              </div>
              <div>
                <Label htmlFor="wpass">Wallet Password</Label>
                <Input id="wpass" type="password" value={createPassword} onChange={(e) => setCreatePassword(e.target.value)} placeholder="At least 6 characters" className="mt-1" autoFocus />
              </div>
              <div>
                <Label htmlFor="wpass2">Confirm Password</Label>
                <Input id="wpass2" type="password" value={createConfirm} onChange={(e) => setCreateConfirm(e.target.value)} placeholder="Re-enter password" className="mt-1" />
              </div>
              <Button type="submit" className="w-full" disabled={creating || !createPassword || !createConfirm}>
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4 mr-2" />}
                {creating ? 'Creating…' : 'Create Wallet'}
              </Button>
            </form>
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
            {/* SOL Balance */}
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

            {/* $DUC Balance */}
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

      {/* Receive Modal */}
      <Dialog open={showReceive} onOpenChange={setShowReceive}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receive $DUC / SOL</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            {qrUrl && <img src={qrUrl} alt="Wallet QR" className="w-56 h-56 rounded-lg border" />}
            <div className="w-full">
              <Label>Your Wallet Address</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input value={address} readOnly className="text-xs font-mono" />
                <Button size="icon" variant="outline" onClick={handleCopy}>
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Modal */}
      <Dialog open={showSend} onOpenChange={setShowSend}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send from your wallet</DialogTitle>
          </DialogHeader>
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