import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Globe,
  CheckCircle,
  AlertCircle,
  Loader2,
  Copy,
  ExternalLink,
  Smile,
} from 'lucide-react';
import { Transaction } from '@solana/web3.js';
import { Buffer } from 'buffer';
import SolanaWalletProvider from '@/components/auth/SolanaWalletProvider';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

const PARENT_DOMAIN = 'opentill.sol';
const ENTITY_MAP = { ambassador: 'Ambassador', merchant: 'Merchant', builder: 'Builder' };

const EMOJIS = [
  '🍕','☕','🍔','🌮','🍣','🍦','🛒','💳',
  '🪙','⚡','💎','🚀','🌈','🔥','⭐','👑',
  '🎯','🎉','🧋','🍷','🥑','🍓','🥤','🍩',
  '🥖','🍱','🥗','🧀','🍤','🍜','🍰','🍪',
  '🥨','🥞','🍳','🧇','🍿','🥓','🍩','🍪',
];

function EmojiPicker({ onPick }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen((o) => !o)}>
        <Smile className="w-4 h-4 mr-1" /> Emoji
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-2 p-2 bg-white border rounded-lg shadow-xl grid grid-cols-8 gap-1 w-72 max-h-52 overflow-auto">
            {EMOJIS.map((e, i) => (
              <button
                type="button"
                key={i}
                className="text-xl hover:bg-gray-100 rounded p-1 leading-none"
                onClick={() => { onPick(e); setOpen(false); }}
              >
                {e}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SNSMintPanel({ ownerType, ownerId, owner, loadOwner, onUpdate }) {
  const { connected, publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [label, setLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const current = owner?.opentill_subdomain;
  const isActive = owner?.subdomain_status === 'active';
  const fullDomain = current ? `${current}.${PARENT_DOMAIN}` : null;

  const cleanLabel = (val) =>
    val
      .toLowerCase()
      .trim()
      .replace(new RegExp('\\.' + PARENT_DOMAIN + '$'), '')
      .replace(/\.sol$/, '');

  const validate = (s) => {
    if (!s) return 'Subdomain is required.';
    if (/[.\s]/.test(s)) return 'Subdomain cannot contain dots or spaces.';
    const chars = Array.from(s);
    if (chars.length < 3 || chars.length > 32) return 'Subdomain must be 3-32 characters (emojis count).';
    if (s.startsWith('-') || s.endsWith('-')) return 'Cannot start or end with a hyphen.';
    return null;
  };

  const handleSubmit = async () => {
    setError(null);
    setResult(null);
    if (!connected || !publicKey) {
      setError('Connect your Solana wallet first.');
      return;
    }
    const clean = cleanLabel(label);
    const v = validate(clean);
    if (v) {
      setError(v);
      return;
    }
    try {
      setLoading(true);
      // 1. Build + authority-sign the transaction server-side
      const res = await base44.functions.invoke('registerAmbassadorSNSSubdomain', {
        owner_type: ownerType,
        owner_id: ownerId,
        subdomain: clean,
        wallet_address: publicKey.toString(),
      });
      const data = res?.data || {};
      if (!data.transaction) {
        setError(data.error || 'Failed to prepare the mint transaction.');
        return;
      }
      // 2. Deserialize the partially-signed transaction
      const tx = Transaction.from(Buffer.from(data.transaction, 'base64'));
      // 3. User's wallet signs (as payer/owner) and submits
      const signature = await sendTransaction(tx, connection, { skipPreflight: false });
      // 4. Wait for confirmation before recording
      try {
        await connection.confirmTransaction(signature, 'confirmed');
      } catch {
        /* confirm may time out; verify step below is authoritative */
      }
      // 5. Verify on-chain + update the entity record
      const conf = await base44.functions.invoke('confirmSNSSubdomain', {
        owner_type: ownerType,
        owner_id: ownerId,
        subdomain: clean,
        tx_signature: signature,
        wallet_address: publicKey.toString(),
      });
      const cdata = conf?.data || {};
      if (cdata.success) {
        setResult({ subdomain: cdata.subdomain || `${clean}.${PARENT_DOMAIN}`, tx_signature: signature });
        setLabel('');
        await loadOwner();
        await onUpdate?.();
      } else {
        setError(cdata.error || 'Minted on-chain, but the record could not be confirmed yet. Retrying...');
        await loadOwner();
      }
    } catch (e) {
      const msg = e?.message || 'Registration failed.';
      if (msg.includes('User rejected') || msg.includes('User cancelled')) {
        setError('Wallet request was rejected.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isActive && fullDomain) {
    return (
      <>
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="font-semibold text-lg break-all">{fullDomain}</p>
            <p className="text-sm text-gray-500">SNS Subdomain</p>
          </div>
          <Badge className="bg-green-100 text-green-800">Active</Badge>
        </div>
        {owner?.subdomain_wallet && (
          <p className="text-xs text-gray-500 break-all font-mono">
            Owner wallet: {owner.subdomain_wallet}
          </p>
        )}
        {result?.tx_signature && (
          <div className="text-xs text-gray-500 break-all font-mono">
            Tx: {result.tx_signature}
          </div>
        )}
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => copy(fullDomain)}>
            {copied ? <CheckCircle className="w-4 h-4 mr-1 text-green-600" /> : <Copy className="w-4 h-4 mr-1" />}
            {copied ? 'Copied!' : 'Copy Domain'}
          </Button>
          <a href={`https://sns.id/domain/${fullDomain}`} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <ExternalLink className="w-4 h-4 mr-1" /> View on SNS
            </Button>
          </a>
        </div>
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Your subdomain is registered on-chain via Solana Name Service and owned by your connected wallet.
          </AlertDescription>
        </Alert>
      </>
    );
  }

  return (
    <>
      <Alert>
        <Globe className="h-4 w-4" />
        <AlertDescription>
          Claim your <strong>*.{PARENT_DOMAIN}</strong> subdomain. You'll connect a Solana
          wallet and pay the on-chain mint cost; the openTILL platform vault (authority)
          co-signs. Emojis are welcome.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Wallet</Label>
          <div className="[&>button]:!h-9 [&>button]:!text-sm">
            <WalletMultiButton />
          </div>
        </div>
        {connected && publicKey && (
          <p className="text-xs text-gray-500 font-mono break-all">
            Connected: {publicKey.toString().slice(0, 6)}…{publicKey.toString().slice(-4)}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="subdomain">Subdomain</Label>
        <div className="flex items-center gap-2 mt-2">
          <Input
            id="subdomain"
            placeholder="yourbrand🚀"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="flex-1"
          />
          <EmojiPicker onPick={(e) => setLabel((l) => l + e)} />
          <span className="text-sm text-gray-500 whitespace-nowrap">.{PARENT_DOMAIN}</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          3-32 chars, lowercase letters, numbers, hyphens, and emojis. Your wallet pays the mint fee.
        </p>
      </div>

      {error && (
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Registered <strong>{result.subdomain}</strong>! Tx:{' '}
            <span className="font-mono text-xs break-all">{result.tx_signature}</span>
          </AlertDescription>
        </Alert>
      )}

      <Button onClick={handleSubmit} disabled={loading || !label || !connected}>
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Awaiting wallet confirmation…
          </>
        ) : (
          <>
            <Globe className="w-4 h-4 mr-2" />
            Mint on SNS
          </>
        )}
      </Button>
    </>
  );
}

export default function SNSSubdomainRegistration({ ownerType, ownerId, onUpdate }) {
  const [owner, setOwner] = useState(null);

  const loadOwner = async () => {
    if (!ownerType || !ownerId || !ENTITY_MAP[ownerType]) return;
    try {
      const list = await base44.entities[ENTITY_MAP[ownerType]].filter({ id: ownerId });
      if (list && list.length) setOwner(list[0]);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    loadOwner();
  }, [ownerType, ownerId]);

  return (
    <SolanaWalletProvider autoConnect>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            SNS Subdomain Registration
          </CardTitle>
          <CardDescription>
            Mint your unique *.{PARENT_DOMAIN} subdomain on the Solana Name Service
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <SNSMintPanel
            ownerType={ownerType}
            ownerId={ownerId}
            owner={owner}
            loadOwner={loadOwner}
            onUpdate={onUpdate}
          />
        </CardContent>
      </Card>
    </SolanaWalletProvider>
  );
}