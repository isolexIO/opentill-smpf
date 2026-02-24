import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Wallet, CheckCircle, Loader2, Copy, ExternalLink, RefreshCw,
  Unlink, Link2, AlertCircle, Shield, Zap, Info, Eye, EyeOff
} from 'lucide-react';

const WALLETS = [
  {
    id: 'phantom', label: 'Phantom', color: '#ab9ff2',
    getProvider: () => window?.solana?.isPhantom ? window.solana : null,
    installUrl: 'https://phantom.app',
  },
  {
    id: 'solflare', label: 'Solflare', color: '#fc8a16',
    getProvider: () => window?.solflare?.isSolflare ? window.solflare : null,
    installUrl: 'https://solflare.com',
  },
  {
    id: 'backpack', label: 'Backpack', color: '#e33e3f',
    getProvider: () => window?.backpack?.isBackpack ? window.backpack : null,
    installUrl: 'https://backpack.app',
  },
];

function shortenAddr(addr) {
  if (!addr) return '';
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}

function WalletOptionButton({ wallet, isConnected, connectedAddress, onConnect, onDisconnect, connecting }) {
  const installed = !!wallet.getProvider();
  return (
    <div className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
      isConnected
        ? 'border-green-300 bg-green-50 dark:bg-green-900/15 dark:border-green-700'
        : 'border-slate-200 bg-white dark:bg-gray-800 dark:border-gray-700 hover:border-slate-300'
    }`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm"
             style={{ background: wallet.color + '22', color: wallet.color }}>
          {wallet.label[0]}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">{wallet.label}</span>
            {!installed && <Badge variant="outline" className="text-[10px] text-slate-400">Not Installed</Badge>}
            {isConnected && <Badge className="text-[10px] bg-green-500">Connected</Badge>}
          </div>
          {isConnected && connectedAddress && (
            <p className="text-xs font-mono text-slate-500 mt-0.5">{shortenAddr(connectedAddress)}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isConnected ? (
          <Button
            size="sm" variant="ghost"
            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 px-3 text-xs"
            onClick={() => onDisconnect(wallet.id)}
          >
            <Unlink className="w-3.5 h-3.5 mr-1" /> Disconnect
          </Button>
        ) : installed ? (
          <Button
            size="sm" variant="outline"
            className="h-8 px-3 text-xs border-slate-300"
            onClick={() => onConnect(wallet)}
            disabled={connecting}
          >
            {connecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Link2 className="w-3.5 h-3.5 mr-1" />Connect</>}
          </Button>
        ) : (
          <Button size="sm" variant="ghost" className="h-8 px-3 text-xs text-slate-400"
            onClick={() => window.open(wallet.installUrl, '_blank')}>
            <ExternalLink className="w-3.5 h-3.5 mr-1" />Install
          </Button>
        )}
      </div>
    </div>
  );
}

export default function WalletPaymentsTab({ merchant, onSave }) {
  const [user, setUser] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [connectingId, setConnectingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const [connectedWallets, setConnectedWallets] = useState({});

  // Primary rewards/payments wallet (stored on Merchant record + solana_pay settings)
  const [primaryWallet, setPrimaryWallet] = useState(
    merchant?.settings?.solana_pay?.wallet_address || ''
  );
  const [solanaPay, setSolanaPay] = useState({
    enabled: false,
    network: 'mainnet',
    accepted_token: 'USDC',
    display_in_customer_terminal: true,
    ...(merchant?.settings?.solana_pay || {})
  });

  useEffect(() => { loadUser(); }, []);

  const loadUser = async () => {
    const pinUserJSON = localStorage.getItem('pinLoggedInUser');
    let u = pinUserJSON ? JSON.parse(pinUserJSON) : await base44.auth.me();
    setUser(u);
    // Build connected wallets map from user pos_settings
    const wallets = {};
    ['phantom', 'solflare', 'backpack'].forEach(t => {
      if (u?.pos_settings?.[`${t}_wallet`]) wallets[t] = u.pos_settings[`${t}_wallet`];
    });
    setConnectedWallets(wallets);
  };

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  };

  const connectWallet = async (walletDef) => {
    const provider = walletDef.getProvider();
    if (!provider) { window.open(walletDef.installUrl, '_blank'); return; }
    setConnecting(true);
    setConnectingId(walletDef.id);
    try {
      await provider.connect();
      const publicKey = provider.publicKey.toString();
      // Sign to prove ownership
      const msg = `Link wallet to openTILL\n\nWallet: ${publicKey}\nMerchant: ${merchant?.id}\nTimestamp: ${Date.now()}`;
      const encoded = new TextEncoder().encode(msg);
      const signed = await provider.signMessage(encoded, 'utf8');

      const { data } = await base44.functions.invoke('linkWalletToUser', {
        wallet_address: publicKey,
        wallet_type: walletDef.id,
        signature_data: { signature: Array.from(signed.signature), message: msg },
        user_id: user?.id
      });
      if (!data?.success) throw new Error(data?.error || 'Failed to link wallet');

      // Auto-populate primary wallet if none set
      if (!primaryWallet) setPrimaryWallet(publicKey);

      await loadUser();
      showMsg('success', `${walletDef.label} connected and verified!`);
    } catch (err) {
      if (err.code !== 4001) showMsg('error', err.message || `Failed to connect ${walletDef.label}`);
    } finally {
      setConnecting(false);
      setConnectingId(null);
    }
  };

  const disconnectWallet = async (walletType) => {
    if (!confirm(`Disconnect your ${walletType} wallet?`)) return;
    try {
      const { data } = await base44.functions.invoke('unlinkWalletFromUser', {
        wallet_type: walletType,
        user_id: user?.id
      });
      if (!data?.success) throw new Error(data?.error || 'Failed to unlink');
      await loadUser();
      showMsg('success', `${walletType} wallet disconnected.`);
    } catch (err) {
      showMsg('error', err.message);
    }
  };

  const useConnectedAsRewards = (walletType) => {
    const addr = connectedWallets[walletType];
    if (addr) {
      setPrimaryWallet(addr);
      showMsg('success', `Set ${walletType} wallet as primary rewards address.`);
    }
  };

  const handleSavePayments = async () => {
    setSaving(true);
    try {
      await onSave({
        settings: {
          ...merchant.settings,
          solana_pay: {
            ...solanaPay,
            wallet_address: primaryWallet
          }
        }
      });
      showMsg('success', 'Wallet & payment settings saved!');
    } catch (err) {
      showMsg('error', err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const copyAddr = () => {
    if (primaryWallet) {
      navigator.clipboard.writeText(primaryWallet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const anyConnected = Object.keys(connectedWallets).length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Wallet className="w-5 h-5 text-purple-500" /> Wallet & Payments
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Connect your Solana wallet for rewards, verify ownership, and configure payment acceptance.
        </p>
      </div>

      {/* Live Status Banner */}
      {anyConnected && (
        <div className="flex items-center gap-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-700 rounded-xl px-4 py-3">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-800 dark:text-green-300">
              {Object.keys(connectedWallets).length} wallet{Object.keys(connectedWallets).length > 1 ? 's' : ''} connected & verified
            </p>
            <p className="text-xs text-green-600 dark:text-green-400">
              Ownership confirmed via cryptographic signature
            </p>
          </div>
          <Shield className="w-4 h-4 text-green-500" />
        </div>
      )}

      {msg && (
        <Alert className={msg.type === 'success' ? 'bg-green-50 border-green-200 dark:bg-green-900/20' : 'bg-red-50 border-red-200 dark:bg-red-900/20'}>
          {msg.type === 'success'
            ? <CheckCircle className="h-4 w-4 text-green-600" />
            : <AlertCircle className="h-4 w-4 text-red-600" />}
          <AlertDescription className={msg.type === 'success' ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}>
            {msg.text}
          </AlertDescription>
        </Alert>
      )}

      {/* Connect Wallets */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="w-4 h-4 text-slate-500" /> Connect Wallets
          </CardTitle>
          <CardDescription>
            Connect browser extension wallets. Ownership is verified via message signing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {WALLETS.map((w) => (
            <WalletOptionButton
              key={w.id}
              wallet={w}
              isConnected={!!connectedWallets[w.id]}
              connectedAddress={connectedWallets[w.id]}
              onConnect={connectWallet}
              onDisconnect={disconnectWallet}
              connecting={connecting && connectingId === w.id}
            />
          ))}
          {!anyConnected && (
            <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-300">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <p>Install a Solana wallet browser extension, then click Connect. You'll be prompted to sign a message to verify ownership — no funds will be transferred.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Primary Rewards / Payment Wallet */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-500" /> Primary Rewards & Payment Address
          </CardTitle>
          <CardDescription>
            This address receives $DUC rewards and Solana Pay transactions from customers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick-set from connected wallets */}
          {anyConnected && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Use a connected wallet</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(connectedWallets).map(([type, addr]) => (
                  <button
                    key={type}
                    onClick={() => useConnectedAsRewards(type)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      primaryWallet === addr
                        ? 'bg-purple-100 border-purple-400 text-purple-700 dark:bg-purple-900/30 dark:border-purple-600 dark:text-purple-300'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 dark:bg-gray-700 dark:border-gray-600 dark:text-slate-300'
                    }`}
                  >
                    {primaryWallet === addr && <CheckCircle className="w-3 h-3" />}
                    <span className="capitalize">{type}</span>
                    <span className="font-mono text-[10px] text-slate-400">{shortenAddr(addr)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="primary_wallet" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Wallet Address
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="primary_wallet"
                  value={showFull ? primaryWallet : (primaryWallet ? shortenAddr(primaryWallet) : '')}
                  onChange={(e) => setPrimaryWallet(e.target.value.trim())}
                  onFocus={() => setShowFull(true)}
                  onBlur={() => setShowFull(false)}
                  placeholder="Paste Solana address..."
                  className="font-mono text-sm h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowFull(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showFull ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {primaryWallet && (
                <>
                  <Button type="button" size="icon" variant="outline" className="h-11 w-11 shrink-0" onClick={copyAddr} title="Copy address">
                    {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <Button type="button" size="icon" variant="outline" className="h-11 w-11 shrink-0"
                    onClick={() => window.open(`https://explorer.solana.com/address/${primaryWallet}`, '_blank')} title="View on Solana Explorer">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
            {primaryWallet && !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(primaryWallet) && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Address format looks incorrect
              </p>
            )}
            {primaryWallet && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(primaryWallet) && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Valid Solana address
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Solana Pay Toggle */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <img src="https://solana.com/src/img/branding/solanaLogoMark.svg" alt="Solana" className="w-7 h-7" />
            <div>
              <CardTitle className="text-base">Solana Pay</CardTitle>
              <CardDescription className="text-xs">Accept crypto at checkout with near-zero fees</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-green-50 dark:from-purple-900/20 dark:to-green-900/20 rounded-xl border border-purple-100 dark:border-purple-800">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Enable Solana Pay</p>
              <p className="text-xs text-slate-500">Customers can pay with USDC, SOL, or custom tokens</p>
            </div>
            <Switch
              checked={solanaPay.enabled}
              onCheckedChange={(v) => setSolanaPay(s => ({ ...s, enabled: v }))}
            />
          </div>

          {solanaPay.enabled && (
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Network</Label>
                  <select
                    value={solanaPay.network}
                    onChange={(e) => setSolanaPay(s => ({ ...s, network: e.target.value }))}
                    className="w-full h-10 px-3 text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="mainnet">Mainnet (Live)</option>
                    <option value="devnet">Devnet (Test)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Accepted Token</Label>
                  <select
                    value={solanaPay.accepted_token}
                    onChange={(e) => setSolanaPay(s => ({ ...s, accepted_token: e.target.value }))}
                    className="w-full h-10 px-3 text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="USDC">USDC (Recommended)</option>
                    <option value="USDT">USDT</option>
                    <option value="SOL">SOL</option>
                    <option value="CUSTOM">Custom Token</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-gray-700/50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Show in Customer Terminal</p>
                  <p className="text-xs text-slate-400">Display crypto payment option at checkout</p>
                </div>
                <Switch
                  checked={solanaPay.display_in_customer_terminal}
                  onCheckedChange={(v) => setSolanaPay(s => ({ ...s, display_in_customer_terminal: v }))}
                />
              </div>

              {!primaryWallet && (
                <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-700">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800 dark:text-amber-300 text-xs">
                    Set a primary wallet address above to receive Solana Pay payments.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={handleSavePayments}
          disabled={saving}
          className="bg-purple-600 hover:bg-purple-700 text-white h-11 px-8 font-semibold"
        >
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Save Wallet & Payments'}
        </Button>
      </div>
    </div>
  );
}