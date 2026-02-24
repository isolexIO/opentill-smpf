import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Sparkles, CheckCircle, Clock, Shield, Zap } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function ChipDetail() {
  const [user, setUser] = useState(null);
  const [chipId, setChipId] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setChipId(params.get('id'));
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (e) {
      // Not logged in - that's ok for viewing
    }
  };

  const { data: chip, isLoading } = useQuery({
    queryKey: ['chip', chipId],
    queryFn: async () => {
      const chips = await base44.entities.Chip.filter({ id: chipId });
      return chips[0];
    },
    enabled: !!chipId
  });

  const handleMintOrSubscribe = () => {
    if (!user) {
      window.location.href = createPageUrl('EmailLogin');
      return;
    }
    window.location.href = createPageUrl(`DUCVault?action=mint&chip_id=${chipId}`);
  };

  if (isLoading || !chip) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  const isSoldOut = chip.total_supply && chip.mints_count >= chip.total_supply;
  const isComingSoon = chip.start_time && new Date(chip.start_time) > new Date();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.href = createPageUrl('Home')}>
              <Sparkles className="w-8 h-8 text-cyan-600" />
              <span className="text-2xl font-bold text-gray-900">openTILL Marketplace</span>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => window.location.href = createPageUrl('Marketplace')}>
                Marketplace
              </Button>
              <Button variant="ghost" onClick={() => window.location.href = createPageUrl('Home')}>
                Home
              </Button>
              <Button onClick={() => window.location.href = createPageUrl('EmailLogin')}>
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto py-12 px-4 space-y-8">
        <Button
          variant="ghost"
          onClick={() => window.location.href = createPageUrl('Marketplace')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Marketplace
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left: Image and Quick Info */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-8">
                <img 
                  src={chip.image_url || '/api/placeholder/400/400'}
                  alt={chip.name}
                  className="w-[90%] mx-auto rounded-lg shadow-lg"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Chip Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">Category</span>
                  <Badge>{chip.category}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Type</span>
                  <span className="font-medium">{chip.billing_type}</span>
                </div>
                {chip.total_supply && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Supply</span>
                    <span className="font-medium">{chip.mints_count || 0}/{chip.total_supply}</span>
                  </div>
                )}
                {chip.max_per_wallet && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Max Per Wallet</span>
                    <span className="font-medium">{chip.max_per_wallet}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Details and Purchase */}
          <div className="space-y-6">
            <div>
              <h1 className="text-4xl font-black mb-2">{chip.name}</h1>
              {chip.symbol && (
                <Badge variant="outline" className="text-lg px-3 py-1">${chip.symbol}</Badge>
              )}
              <p className="text-slate-600 mt-4 text-lg">{chip.short_description}</p>
            </div>

            <Card className="border-cyan-200 bg-cyan-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-cyan-600" />
                  Pricing
                </CardTitle>
              </CardHeader>
              <CardContent>
                {chip.billing_type === 'ONE_TIME' ? (
                  <div className="text-center py-4">
                    <div className="text-5xl font-black text-cyan-600">{chip.price_duc} $DUC</div>
                    <p className="text-slate-500 mt-2">One-time purchase</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-center py-4">
                      <div className="text-5xl font-black text-cyan-600">{chip.recurring_price_duc} $DUC</div>
                      <p className="text-slate-500 mt-2">per {chip.interval?.toLowerCase()}</p>
                    </div>
                    <Alert>
                      <Clock className="w-4 h-4" />
                      <AlertDescription>
                        <strong>Grace Period:</strong> {chip.grace_period_days} days after missed payment
                      </AlertDescription>
                    </Alert>
                    {chip.require_chip_nft && (
                      <Alert>
                        <Shield className="w-4 h-4" />
                        <AlertDescription>
                          NFT ownership required along with active subscription
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full bg-cyan-600 hover:bg-cyan-700 h-14 text-lg font-bold"
                  onClick={handleMintOrSubscribe}
                  disabled={isSoldOut || isComingSoon}
                >
                  {isSoldOut ? 'Sold Out' : isComingSoon ? 'Coming Soon' : chip.billing_type === 'ONE_TIME' ? 'Mint with $DUC' : 'Subscribe with $DUC'}
                </Button>
              </CardFooter>
            </Card>

            {chip.long_description && (
              <Card>
                <CardHeader>
                  <CardTitle>About This Chip</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-700 whitespace-pre-wrap">{chip.long_description}</p>
                </CardContent>
              </Card>
            )}

            {chip.feature_flags && chip.feature_flags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    Unlocked Features
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2">
                    {chip.feature_flags.map(flag => (
                      <div key={flag} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="capitalize">{flag.replace(/_/g, ' ')}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}