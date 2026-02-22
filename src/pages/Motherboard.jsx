import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Cpu, Wallet, RefreshCw, AlertCircle, Power, PowerOff, CheckCircle, Lock, ExternalLink } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function Motherboard() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const { data: installedChips = [], isLoading: loadingInstalls } = useQuery({
    queryKey: ['motherboard-installs', user?.merchant_id],
    queryFn: async () => {
      if (!user?.merchant_id) return [];
      return await base44.entities.MotherboardInstall.filter({
        owner_type: 'merchant',
        owner_id: user.merchant_id,
        is_active: true
      });
    },
    enabled: !!user?.merchant_id
  });

  const { data: allChips = [], isLoading: loadingChips } = useQuery({
    queryKey: ['all-chips'],
    queryFn: () => base44.entities.Chip.filter({ 
      status: 'PUBLISHED',
      is_active: true 
    })
  });

  const { data: ownedMints = [] } = useQuery({
    queryKey: ['chip-mints', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return await base44.entities.ChipMint.filter({
        user_id: user.id
      });
    },
    enabled: !!user?.id
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['chip-subscriptions', user?.merchant_id],
    queryFn: async () => {
      if (!user?.merchant_id) return [];
      return await base44.entities.ChipSubscription.filter({
        owner_type: 'merchant',
        owner_id: user.merchant_id
      });
    },
    enabled: !!user?.merchant_id
  });

  const toggleInstallMutation = useMutation({
    mutationFn: async ({ chipId, isCurrentlyInstalled }) => {
      if (isCurrentlyInstalled) {
        const install = installedChips.find(i => i.chip_id === chipId);
        if (install) {
          await base44.entities.MotherboardInstall.update(install.id, { is_active: false });
        }
      } else {
        const existing = await base44.entities.MotherboardInstall.filter({
          owner_type: 'merchant',
          owner_id: user.merchant_id,
          chip_id: chipId
        });
        
        if (existing.length > 0) {
          await base44.entities.MotherboardInstall.update(existing[0].id, { is_active: true });
        } else {
          await base44.entities.MotherboardInstall.create({
            owner_type: 'merchant',
            owner_id: user.merchant_id,
            chip_id: chipId,
            wallet_address: user.wallet_address || 'pending'
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['motherboard-installs'] });
    }
  });

  const canAccessChip = (chip) => {
    if (chip.billing_type === 'ONE_TIME') {
      return ownedMints.some(m => m.chip_id === chip.id);
    } else {
      const sub = subscriptions.find(s => s.chip_id === chip.id && s.status === 'ACTIVE');
      if (!sub) return false;
      if (chip.require_chip_nft) {
        return ownedMints.some(m => m.chip_id === chip.id);
      }
      return true;
    }
  };

  const isInstalled = (chipId) => {
    return installedChips.some(i => i.chip_id === chipId);
  };

  if (loadingChips || loadingInstalls) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  const enabledFeatures = installedChips
    .map(install => allChips.find(c => c.id === install.chip_id))
    .filter(Boolean)
    .flatMap(chip => chip.feature_flags || []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-lg flex items-center justify-center">
              <Cpu className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Motherboard</h1>
              <p className="text-gray-500 dark:text-gray-400">Install and manage your feature chips</p>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => window.location.href = createPageUrl('Marketplace')}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Browse Marketplace
          </Button>
        </div>

        {!user?.wallet_address && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              Connect your Solana wallet in the Vault to mint and use chips
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Enabled Features</CardTitle>
            <CardDescription>
              {installedChips.length} chip{installedChips.length !== 1 ? 's' : ''} installed • {enabledFeatures.length} feature{enabledFeatures.length !== 1 ? 's' : ''} unlocked
            </CardDescription>
          </CardHeader>
          <CardContent>
            {enabledFeatures.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {[...new Set(enabledFeatures)].map(flag => (
                  <Badge key={flag} className="bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {flag.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No features enabled yet. Install chips to unlock features.</p>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allChips.map(chip => {
            const hasAccess = canAccessChip(chip);
            const installed = isInstalled(chip.id);

            return (
              <Card key={chip.id} className={`${installed ? 'border-2 border-green-500' : ''} ${!hasAccess ? 'opacity-60' : ''}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <img 
                      src={chip.image_url || '/api/placeholder/64/64'}
                      alt={chip.name}
                      className="w-12 h-12 rounded-lg"
                    />
                    {hasAccess ? (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Owned
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        <Lock className="w-3 h-3 mr-1" />
                        Locked
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="mt-3">{chip.name}</CardTitle>
                  <CardDescription>{chip.short_description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {hasAccess ? (
                    <Button
                      className={`w-full ${installed ? 'bg-red-600 hover:bg-red-700' : 'bg-cyan-600 hover:bg-cyan-700'}`}
                      onClick={() => toggleInstallMutation.mutate({ chipId: chip.id, isCurrentlyInstalled: installed })}
                      disabled={toggleInstallMutation.isPending}
                    >
                      {installed ? (
                        <>
                          <PowerOff className="w-4 h-4 mr-2" />
                          Uninstall
                        </>
                      ) : (
                        <>
                          <Power className="w-4 h-4 mr-2" />
                          Install
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      className="w-full bg-cyan-600 hover:bg-cyan-700"
                      onClick={() => window.location.href = createPageUrl(`ChipDetail?id=${chip.id}`)}
                    >
                      Get This Chip
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}