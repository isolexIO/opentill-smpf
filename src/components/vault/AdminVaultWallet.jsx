import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet, CheckCircle, AlertCircle, Copy, RefreshCw } from 'lucide-react';
import SolanaWalletProvider from '@/components/auth/SolanaWalletProvider';

function AdminVaultWalletContent({ settingsId, currentVaultWallet, onSaved }) {
  const { publicKey, connected } = useWallet();
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const walletAddress = publicKey?.toBase58();
  const isCurrentVault = walletAddress && walletAddress === currentVaultWallet;

  const handleSetAsVault = async () => {
    if (!walletAddress) return;
    setSaving(true);
    try {
      const { data } = await base44.functions.invoke('updateVaultSettings', {
        action: settingsId ? 'update' : 'create',
        settings_id: settingsId,
        settings_data: { central_vault_wallet: walletAddress }
      });
      if (data.success) {
        onSaved(walletAddress);
        alert('Central vault wallet saved!');
      } else {
        throw new Error(data.error);
      }
    } catch (e) {
      alert('Failed to save: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = (addr) => {
    navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border-2 border-yellow-200 dark:border-yellow-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-yellow-600" />
          Central Distribution Vault Wallet
        </CardTitle>
        <CardDescription>
          Connect the admin wallet that holds $DUC for merchant reward distribution
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Current saved vault wallet */}
        {currentVaultWallet && (
          <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-green-800 dark:text-green-300">Active Vault Wallet</p>
              <p className="text-xs font-mono text-green-700 dark:text-green-400 break-all">{currentVaultWallet}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => handleCopy(currentVaultWallet)}>
              <Copy className="w-3 h-3" />
              {copied ? 'Copied!' : ''}
            </Button>
          </div>
        )}

        {!currentVaultWallet && (
          <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
            <p className="text-sm text-yellow-800 dark:text-yellow-300">No central vault wallet configured yet.</p>
          </div>
        )}

        {/* Wallet connect */}
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Connect the wallet you want to designate as the central DUC vault:
          </p>
          <WalletMultiButton style={{ width: '100%', justifyContent: 'center' }} />
        </div>

        {connected && walletAddress && (
          <div className="space-y-3">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">Connected Wallet</p>
              <p className="text-xs font-mono text-blue-800 dark:text-blue-300 break-all">{walletAddress}</p>
              {isCurrentVault && (
                <Badge className="mt-2 bg-green-100 text-green-800">✓ Currently set as vault</Badge>
              )}
            </div>

            {!isCurrentVault && (
              <Button
                onClick={handleSetAsVault}
                disabled={saving}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Wallet className="w-4 h-4 mr-2" />}
                Set This Wallet as Central Vault
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminVaultWallet({ settingsId, currentVaultWallet, onSaved }) {
  return (
    <SolanaWalletProvider>
      <AdminVaultWalletContent
        settingsId={settingsId}
        currentVaultWallet={currentVaultWallet}
        onSaved={onSaved}
      />
    </SolanaWalletProvider>
  );
}