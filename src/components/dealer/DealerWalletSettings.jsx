import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Wallet, Copy, Check, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function DealerWalletSettings({ dealer, onUpdate }) {
  const [saving, setSaving] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [formData, setFormData] = useState({
    solana_wallet_address: dealer.solana_wallet_address || '',
  });

  const handleSave = async () => {
    if (!formData.solana_wallet_address.trim()) {
      alert('Please enter a valid wallet address');
      return;
    }

    // Basic validation for Solana address (base58, 32-44 chars)
    if (!/^[1-9A-HJ-NP-Z]{32,44}$/.test(formData.solana_wallet_address)) {
      alert('Invalid Solana wallet address format');
      return;
    }

    try {
      setSaving(true);
      await base44.entities.Dealer.update(dealer.id, formData);
      onUpdate?.();
    } catch (error) {
      alert('Error updating wallet: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setSaving(true);
      await base44.entities.Dealer.update(dealer.id, {
        solana_wallet_address: '',
      });
      setFormData({ solana_wallet_address: '' });
      setShowDisconnectDialog(false);
      onUpdate?.();
    } catch (error) {
      alert('Error disconnecting wallet: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedField('address');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const hasChanges = formData.solana_wallet_address !== dealer.solana_wallet_address;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Solana Wallet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {formData.solana_wallet_address ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm font-medium text-green-900 mb-2">Connected Wallet</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-white px-3 py-2 rounded border border-green-200 flex-1 overflow-x-auto">
                    {formData.solana_wallet_address}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(formData.solana_wallet_address)}
                  >
                    {copiedField === 'address' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <Button
                variant="destructive"
                onClick={() => setShowDisconnectDialog(true)}
                className="w-full gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Disconnect Wallet
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-2">Solana Wallet Address</label>
                <Input
                  value={formData.solana_wallet_address}
                  onChange={(e) => setFormData({...formData, solana_wallet_address: e.target.value.trim()})}
                  placeholder="Enter your Solana wallet address"
                />
                <p className="text-xs text-gray-500 mt-1">Your public Solana wallet address for receiving payments</p>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-blue-900">
                  <p className="font-medium mb-1">How to get your wallet address</p>
                  <p>Open your Solana wallet (Phantom, Magic Eden, etc.) and copy your public address. It starts with a letter or number and is 32-44 characters long.</p>
                </div>
              </div>

              <Button
                onClick={handleSave}
                disabled={!hasChanges || saving}
                className="w-full gap-2"
              >
                {saving ? 'Connecting...' : 'Connect Wallet'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Wallet Benefits</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>Receive cryptocurrency payments directly to your wallet</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>Instant settlement without intermediaries</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>Lower fees on Solana blockchain transactions</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>Direct control over your funds</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Wallet?</AlertDialogTitle>
            <AlertDialogDescription>
              Your wallet will be removed from your dealer account. You can reconnect it anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDisconnect} className="bg-red-600">
              Disconnect
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}