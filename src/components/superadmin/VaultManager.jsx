import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Vault, Save, RefreshCw } from 'lucide-react';

export default function VaultManager() {
  const [globalSettings, setGlobalSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    vault_enabled: true,
    reward_percentage: 0.5,
    minimum_claim_threshold: 10,
    staking_apy: 12,
    staking_lockup_days: 90,
    jupiter_referral_code: '',
    clink_mint_address: '',
    auto_calculate_rewards: true
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const settings = await base44.asServiceRole.entities.cLINKVaultSettings.filter({
        merchant_id: null
      });

      if (settings.length > 0) {
        setGlobalSettings(settings[0]);
        setFormData({
          vault_enabled: settings[0].vault_enabled ?? true,
          reward_percentage: settings[0].reward_percentage ?? 0.5,
          minimum_claim_threshold: settings[0].minimum_claim_threshold ?? 10,
          staking_apy: settings[0].staking_apy ?? 12,
          staking_lockup_days: settings[0].staking_lockup_days ?? 90,
          jupiter_referral_code: settings[0].jupiter_referral_code || '',
          clink_mint_address: settings[0].clink_mint_address || '',
          auto_calculate_rewards: settings[0].auto_calculate_rewards ?? true
        });
      }
    } catch (error) {
      console.error('Error loading vault settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (globalSettings) {
        await base44.asServiceRole.entities.cLINKVaultSettings.update(globalSettings.id, formData);
      } else {
        await base44.asServiceRole.entities.cLINKVaultSettings.create({
          ...formData,
          merchant_id: null
        });
      }

      alert('Vault settings saved successfully!');
      loadSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-12">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Vault className="w-6 h-6" />
            $cLINK Vault Management
          </h2>
          <p className="text-gray-500">Configure global vault settings and rewards</p>
        </div>
        <Button onClick={loadSettings} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
          <TabsTrigger value="staking">Staking</TabsTrigger>
          <TabsTrigger value="jupiter">Jupiter</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Enable/disable vault and set basic parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Enable $cLINK Vault Globally</Label>
                <Switch
                  checked={formData.vault_enabled}
                  onCheckedChange={(checked) => setFormData({...formData, vault_enabled: checked})}
                />
              </div>
              
              <div>
                <Label>$cLINK Token Mint Address</Label>
                <Input
                  value={formData.clink_mint_address}
                  onChange={(e) => setFormData({...formData, clink_mint_address: e.target.value})}
                  placeholder="Solana token mint address"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Auto-Calculate Monthly Rewards</Label>
                <Switch
                  checked={formData.auto_calculate_rewards}
                  onCheckedChange={(checked) => setFormData({...formData, auto_calculate_rewards: checked})}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rewards">
          <Card>
            <CardHeader>
              <CardTitle>Reward Settings</CardTitle>
              <CardDescription>Configure how merchants earn $cLINK from processing volume</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Default Reward Percentage</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.reward_percentage}
                    onChange={(e) => setFormData({...formData, reward_percentage: parseFloat(e.target.value)})}
                  />
                  <span className="text-gray-500">%</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Merchants earn this percentage of CC processing volume in $cLINK
                </p>
              </div>

              <div>
                <Label>Minimum Claim Threshold</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={formData.minimum_claim_threshold}
                    onChange={(e) => setFormData({...formData, minimum_claim_threshold: parseFloat(e.target.value)})}
                  />
                  <span className="text-gray-500">$cLINK</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Minimum amount required to claim rewards
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staking">
          <Card>
            <CardHeader>
              <CardTitle>Staking Parameters</CardTitle>
              <CardDescription>Set default staking APY and lockup periods</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Staking APY</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.staking_apy}
                    onChange={(e) => setFormData({...formData, staking_apy: parseFloat(e.target.value)})}
                  />
                  <span className="text-gray-500">%</span>
                </div>
              </div>

              <div>
                <Label>Lockup Period</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={formData.staking_lockup_days}
                    onChange={(e) => setFormData({...formData, staking_lockup_days: parseInt(e.target.value)})}
                  />
                  <span className="text-gray-500">days</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jupiter">
          <Card>
            <CardHeader>
              <CardTitle>Jupiter Integration</CardTitle>
              <CardDescription>Configure Jupiter swap with referral code</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Jupiter Referral Code</Label>
                <Input
                  value={formData.jupiter_referral_code}
                  onChange={(e) => setFormData({...formData, jupiter_referral_code: e.target.value})}
                  placeholder="Your Jupiter referral account address"
                />
                <p className="text-sm text-gray-500 mt-1">
                  All swaps will use this referral code to earn fees
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
        {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
        Save Vault Settings
      </Button>
    </div>
  );
}