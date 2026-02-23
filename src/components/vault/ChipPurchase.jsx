import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, Sparkles, Wallet } from 'lucide-react';

export default function ChipPurchase({ chipId, onSuccess }) {
  const [chip, setChip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadData();
  }, [chipId]);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const chips = await base44.entities.Chip.filter({ id: chipId });
      if (chips.length > 0) {
        setChip(chips[0]);
      }
    } catch (error) {
      console.error('Error loading chip:', error);
      setError('Failed to load chip details');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!user?.wallet_address) {
      setError('Please connect your Solana wallet in Settings first');
      return;
    }

    setPurchasing(true);
    setError(null);

    try {
      const { data } = await base44.functions.invoke('mintChipNFT', {
        chip_id: chipId,
        wallet_address: user.wallet_address
      });

      if (data.success) {
        alert(`NFT minted successfully!\n\nMint Address: ${data.mint_address}\nTransaction: ${data.signature}`);
        if (onSuccess) onSuccess(data);
      } else {
        setError(data.error || 'Minting failed');
      }
    } catch (error) {
      console.error('Mint error:', error);
      setError(error.message || 'Failed to mint NFT');
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
        </CardContent>
      </Card>
    );
  }

  if (!chip) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <XCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          Chip not found
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="border-2 border-cyan-200">
      <CardHeader>
        <div className="flex items-start gap-4">
          <img 
            src={chip.image_url || '/api/placeholder/80/80'}
            alt={chip.name}
            className="w-16 h-16 rounded-lg"
          />
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              {chip.name}
              <Badge>{chip.billing_type}</Badge>
            </CardTitle>
            <CardDescription>{chip.short_description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        <div className="bg-cyan-50 p-4 rounded-lg">
          <div className="text-center">
            <div className="text-4xl font-black text-cyan-600 mb-2">
              {chip.billing_type === 'ONE_TIME' 
                ? `${chip.price_duc} $DUC` 
                : `${chip.recurring_price_duc} $DUC/${chip.interval?.toLowerCase()}`}
            </div>
            <p className="text-sm text-gray-600">
              {chip.billing_type === 'ONE_TIME' ? 'One-time purchase' : 'Recurring subscription'}
            </p>
          </div>
        </div>

        {!user?.wallet_address && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <Wallet className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              You need to connect your Solana wallet in Settings to purchase chips
            </AlertDescription>
          </Alert>
        )}

        <Button
          className="w-full bg-cyan-600 hover:bg-cyan-700 h-12 text-lg font-bold"
          onClick={handlePurchase}
          disabled={purchasing || !user?.wallet_address}
        >
          {purchasing ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Minting NFT...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              {chip.billing_type === 'ONE_TIME' ? 'Mint NFT' : 'Mint & Subscribe'}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}