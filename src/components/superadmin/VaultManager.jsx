import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Vault, Save, RefreshCw } from 'lucide-react';
import AdminVaultWallet from '@/components/vault/AdminVaultWallet';

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
    duc_mint_address: 'FPzmBaifnDkTDi26cuiEkRGofnvF7ReXUtWT7Eebjupx',
    token_symbol: '$DUC',
    auto_calculate_rewards: true,
    cc_reward_rate: 0.001,
    min_reward_amount: 0.01,
    staking_vault_address: '',
    central_vault_wallet: '',
    network: 'mainnet-beta',
    referral_reward_rate: 0.1,
    min_referral_reward: 0.001
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('updateVaultSettings', {
        action: 'get'
      });

      if (data.success && data.settings) {
        setGlobalSettings(data.settings);
        setFormData({
          vault_enabled: data.settings.vault_enabled ?? true,
          reward_percentage: data.settings.reward_percentage ?? 0.5,
          minimum_claim_threshold: data.settings.minimum_claim_threshold ?? 10,
          staking_apy: data.settings.staking_apy ?? 12,
          staking_lockup_days: data.settings.staking_lockup_days ?? 90,
          jupiter_referral_code: data.settings.jupiter_referral_code || '',
          duc_mint_address: data.settings.duc_mint_address || data.settings.clink_mint_address || 'FPzmBaifnDkTDi26cuiEkRGofnvF7ReXUtWT7Eebjupx',
          token_symbol: data.settings.token_symbol || '$DUC',
          auto_calculate_rewards: data.settings.auto_calculate_rewards ?? true,
          cc_reward_rate: data.settings.cc_reward_rate ?? 0.001,
          min_reward_amount: data.settings.min_reward_amount ?? 0.01,
          staking_vault_address: data.settings.staking_vault_address || '',
          central_vault_wallet: data.settings.central_vault_wallet || '',
          network: data.settings.network || 'mainnet-beta',
          referral_reward_rate: data.settings.referral_reward_rate ?? 0.1,
          min_referral_reward: data.settings.min_referral_reward ?? 0.001
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
      const { data } = await base44.functions.invoke('updateVaultSettings', {
        action: globalSettings ? 'update' : 'create',
        settings_id: globalSettings?.id,
        settings_data: formData
      });

      if (data.success) {
        alert('Vault settings saved successfully!');
        loadSettings();
      } else {
        throw new Error(data.error || 'Failed to save settings');
      }
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
            $DUC Vault Management
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
          <TabsTrigger value="vault_wallet">Vault Wallet</TabsTrigger>
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
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
                <Label>Enable $DUC Vault Globally</Label>
                <Switch
                  checked={formData.vault_enabled}
                  onCheckedChange={(checked) => setFormData({...formData, vault_enabled: checked})}
                />
              </div>
              
              <div>
                <Label>Token Symbol</Label>
                <Input
                  value={formData.token_symbol}
                  onChange={(e) => setFormData({...formData, token_symbol: e.target.value})}
                  placeholder="e.g. $DUC"
                />
                <p className="text-sm text-gray-500 mt-1">Display name shown in the vault and price ticker</p>
              </div>

              <div>
                <Label>Token Mint Address</Label>
                <Input
                  value={formData.duc_mint_address}
                  onChange={(e) => setFormData({...formData, duc_mint_address: e.target.value})}
                  placeholder="Solana token mint address"
                />
                <p className="text-sm text-gray-500 mt-1">The SPL token mint used for live price fetching and swaps</p>
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

        <TabsContent value="vault_wallet">
          <AdminVaultWallet
            settingsId={globalSettings?.id}
            currentVaultWallet={formData.central_vault_wallet}
            onSaved={(addr) => setFormData(f => ({ ...f, central_vault_wallet: addr }))}
          />
        </TabsContent>

        <TabsContent value="rewards">
          <Card>
            <CardHeader>
              <CardTitle>Reward Settings</CardTitle>
              <CardDescription>Configure how merchants earn $DUC from processing volume</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>CC Processing Reward Rate</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.0001"
                    value={formData.cc_reward_rate}
                    onChange={(e) => setFormData({...formData, cc_reward_rate: parseFloat(e.target.value)})}
                  />
                  <span className="text-gray-500">decimal (0.001 = 0.1%)</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Merchants earn this rate of CC processing volume in $DUC (e.g., 0.001 = 0.1%, 0.01 = 1%)
                </p>
              </div>

              <div>
                <Label>Minimum Reward Amount</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.min_reward_amount}
                    onChange={(e) => setFormData({...formData, min_reward_amount: parseFloat(e.target.value)})}
                  />
                  <span className="text-gray-500">$DUC</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Minimum reward amount per transaction (prevents spam rewards)
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
                  <span className="text-gray-500">$DUC</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Minimum total amount required to claim rewards
                </p>
              </div>

              <div>
                <Label>Monthly Reward Percentage (Legacy)</Label>
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
                  Used for monthly batch reward calculations (if enabled)
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="referrals">
          <Card>
            <CardHeader>
              <CardTitle>Referral Program Settings</CardTitle>
              <CardDescription>Configure merchant referral rewards</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Referral Reward Rate</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.referral_reward_rate}
                    onChange={(e) => setFormData({...formData, referral_reward_rate: parseFloat(e.target.value)})}
                  />
                  <span className="text-gray-500">decimal (0.1 = 10%)</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Referring merchants earn this percentage of their referrals' rewards (e.g., 0.1 = 10% of referred merchant's rewards)
                </p>
              </div>

              <div>
                <Label>Minimum Referral Reward</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.001"
                    value={formData.min_referral_reward}
                    onChange={(e) => setFormData({...formData, min_referral_reward: parseFloat(e.target.value)})}
                  />
                  <span className="text-gray-500">$DUC</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Minimum referral reward amount per transaction
                </p>
              </div>

              <div className="flex gap-2 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  When a referred merchant earns $DUC from CC processing, the referring merchant automatically earns a percentage of those rewards. All referral rewards are claimable in the vault.
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

              <div>
                <Label>Staking Vault Address</Label>
                <Input
                  value={formData.staking_vault_address}
                  onChange={(e) => setFormData({...formData, staking_vault_address: e.target.value})}
                  placeholder="Solana wallet address for staking vault"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Wallet where staked tokens are held on-chain
                </p>
              </div>

              <div>
                <Label>Network</Label>
                <select
                  className="w-full border rounded-md p-2"
                  value={formData.network}
                  onChange={(e) => setFormData({...formData, network: e.target.value})}
                >
                  <option value="mainnet-beta">Mainnet</option>
                  <option value="devnet">Devnet</option>
                </select>
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