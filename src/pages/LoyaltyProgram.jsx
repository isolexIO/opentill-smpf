import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Gift, Plus, Award, TrendingUp, Users, DollarSign, Edit, Trash2, Coins, Vault } from 'lucide-react';
import PermissionGate from '../components/PermissionGate';

export default function LoyaltyProgramPage() {
  const [rewards, setRewards] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [merchantVaultBalance, setMerchantVaultBalance] = useState(0);
  const [loyaltySettings, setLoyaltySettings] = useState({
    enabled: true,
    points_per_dollar: 10,
    welcome_bonus: 100,
    birthday_bonus: 50,
    referral_bonus: 200,
    duc_rewards_enabled: false,
    duc_per_dollar: 0.01,
    duc_welcome_bonus: 0,
    duc_birthday_bonus: 0
  });
  const [showRewardForm, setShowRewardForm] = useState(false);
  const [editingReward, setEditingReward] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem('pinLoggedInUser')) || await base44.auth.me();
      
      const [rewardsList, customersList, redemptionsList, productsList, merchantList] = await Promise.all([
        base44.entities.Reward.filter({ merchant_id: user.merchant_id }),
        base44.entities.Customer.filter({ merchant_id: user.merchant_id }, '-loyalty_points'),
        base44.entities.CustomerRedemption.filter({ merchant_id: user.merchant_id }, '-created_date', 50),
        base44.entities.Product.filter({ merchant_id: user.merchant_id }),
        base44.entities.Merchant.filter({ id: user.merchant_id })
      ]);

      setRewards(rewardsList);
      setCustomers(customersList);
      setRedemptions(redemptionsList);
      setProducts(productsList);
      
      if (merchantList.length > 0) {
        const m = merchantList[0];
        setSettings(m);
        setLoyaltySettings(m.settings?.loyalty_program || loyaltySettings);

        // Load merchant's $DUC vault balance
        const vaultRewards = await base44.entities.cLINKReward.filter({ merchant_id: user.merchant_id, status: 'available' });
        const vaultBalance = vaultRewards.reduce((sum, r) => sum + r.amount, 0);
        setMerchantVaultBalance(vaultBalance);
      }
    } catch (error) {
      console.error('Error loading loyalty data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveLoyaltySettings = async () => {
    try {
      const updatedSettings = {
        ...settings.settings,
        loyalty_program: loyaltySettings
      };
      
      await base44.entities.Merchant.update(settings.id, { settings: updatedSettings });
      alert('Loyalty settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    }
  };

  const saveReward = async (rewardData) => {
    try {
      const user = JSON.parse(localStorage.getItem('pinLoggedInUser')) || await base44.auth.me();
      
      if (editingReward) {
        await base44.entities.Reward.update(editingReward.id, rewardData);
      } else {
        await base44.entities.Reward.create({
          ...rewardData,
          merchant_id: user.merchant_id
        });
      }
      
      setShowRewardForm(false);
      setEditingReward(null);
      loadData();
    } catch (error) {
      console.error('Error saving reward:', error);
      alert('Failed to save reward');
    }
  };

  const deleteReward = async (rewardId) => {
    if (!confirm('Are you sure you want to delete this reward?')) return;
    
    try {
      await base44.entities.Reward.delete(rewardId);
      loadData();
    } catch (error) {
      console.error('Error deleting reward:', error);
      alert('Failed to delete reward');
    }
  };

  const stats = {
    totalCustomers: customers.length,
    activeMembers: customers.filter(c => c.loyalty_points > 0).length,
    totalPointsIssued: customers.reduce((sum, c) => sum + (c.loyalty_points || 0), 0),
    totalRedemptions: redemptions.length
  };

  return (
    <PermissionGate permission="manage_settings">
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Gift className="w-8 h-8 text-purple-600" />
                Loyalty Program
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Reward your customers and increase retention
              </p>
            </div>
            <Button onClick={() => { setEditingReward(null); setShowRewardForm(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Create Reward
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Customers</p>
                    <p className="text-2xl font-bold dark:text-white">{stats.totalCustomers}</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Active Members</p>
                    <p className="text-2xl font-bold dark:text-white">{stats.activeMembers}</p>
                  </div>
                  <Award className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Points Issued</p>
                    <p className="text-2xl font-bold dark:text-white">{stats.totalPointsIssued.toLocaleString()}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Redemptions</p>
                    <p className="text-2xl font-bold dark:text-white">{stats.totalRedemptions}</p>
                  </div>
                  <Gift className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="settings" className="space-y-6">
            <TabsList className="dark:bg-gray-800">
              <TabsTrigger value="settings" className="dark:data-[state=active]:bg-blue-600 dark:text-gray-300">Program Settings</TabsTrigger>
              <TabsTrigger value="rewards" className="dark:data-[state=active]:bg-blue-600 dark:text-gray-300">Rewards</TabsTrigger>
              <TabsTrigger value="customers" className="dark:data-[state=active]:bg-blue-600 dark:text-gray-300">Customer Points</TabsTrigger>
              <TabsTrigger value="history" className="dark:data-[state=active]:bg-blue-600 dark:text-gray-300">Redemption History</TabsTrigger>
            </TabsList>

            <TabsContent value="settings">
              <Card className="dark:bg-gray-800 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="dark:text-white">Loyalty Program Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div>
                      <Label className="text-base font-medium dark:text-white">Enable Loyalty Program</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Activate points-based rewards for customers
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={loyaltySettings.enabled}
                      onChange={(e) => setLoyaltySettings({ ...loyaltySettings, enabled: e.target.checked })}
                      className="w-5 h-5"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="dark:text-gray-200">Points Per Dollar Spent</Label>
                      <Input
                        type="number"
                        value={loyaltySettings.points_per_dollar}
                        onChange={(e) => setLoyaltySettings({ ...loyaltySettings, points_per_dollar: parseInt(e.target.value) || 0 })}
                        className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Customers earn this many points for each $1 spent
                      </p>
                    </div>

                    <div>
                      <Label className="dark:text-gray-200">Welcome Bonus Points</Label>
                      <Input
                        type="number"
                        value={loyaltySettings.welcome_bonus}
                        onChange={(e) => setLoyaltySettings({ ...loyaltySettings, welcome_bonus: parseInt(e.target.value) || 0 })}
                        className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Points awarded to new customers
                      </p>
                    </div>

                    <div>
                      <Label className="dark:text-gray-200">Birthday Bonus Points</Label>
                      <Input
                        type="number"
                        value={loyaltySettings.birthday_bonus}
                        onChange={(e) => setLoyaltySettings({ ...loyaltySettings, birthday_bonus: parseInt(e.target.value) || 0 })}
                        className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>

                    <div>
                      <Label className="dark:text-gray-200">Referral Bonus Points</Label>
                      <Input
                        type="number"
                        value={loyaltySettings.referral_bonus}
                        onChange={(e) => setLoyaltySettings({ ...loyaltySettings, referral_bonus: parseInt(e.target.value) || 0 })}
                        className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                  </div>

                  <Button onClick={saveLoyaltySettings}>
                    Save Settings
                  </Button>
                </CardContent>
              </Card>

              {/* $DUC Consumer Rewards */}
              <Card className="dark:bg-gray-800 dark:border-gray-700 border-yellow-200">
                <CardHeader>
                  <CardTitle className="dark:text-white flex items-center gap-2">
                    <Coins className="w-5 h-5 text-yellow-500" />
                    $DUC Consumer Rewards
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Your Vault Balance:</span>
                    <span className={`text-sm font-bold ${merchantVaultBalance > 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {merchantVaultBalance.toFixed(2)} $DUC
                    </span>
                    {merchantVaultBalance <= 0 && (
                      <span className="text-xs text-red-500">(Insufficient — fund your vault to enable)</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <div>
                      <Label className="text-base font-medium dark:text-white">Enable $DUC Rewards for Customers</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Reward customers with $DUC tokens, funded from your vault
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={loyaltySettings.duc_rewards_enabled || false}
                      onChange={(e) => setLoyaltySettings({ ...loyaltySettings, duc_rewards_enabled: e.target.checked })}
                      className="w-5 h-5"
                      disabled={merchantVaultBalance <= 0}
                    />
                  </div>

                  {loyaltySettings.duc_rewards_enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="dark:text-gray-200">$DUC Per Dollar Spent</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={loyaltySettings.duc_per_dollar || 0.01}
                          onChange={(e) => setLoyaltySettings({ ...loyaltySettings, duc_per_dollar: parseFloat(e.target.value) || 0 })}
                          className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          How many $DUC to award per $1 spent
                        </p>
                      </div>

                      <div>
                        <Label className="dark:text-gray-200">$DUC Welcome Bonus</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={loyaltySettings.duc_welcome_bonus || 0}
                          onChange={(e) => setLoyaltySettings({ ...loyaltySettings, duc_welcome_bonus: parseFloat(e.target.value) || 0 })}
                          className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          $DUC awarded to new customers
                        </p>
                      </div>

                      <div>
                        <Label className="dark:text-gray-200">$DUC Birthday Bonus</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={loyaltySettings.duc_birthday_bonus || 0}
                          onChange={(e) => setLoyaltySettings({ ...loyaltySettings, duc_birthday_bonus: parseFloat(e.target.value) || 0 })}
                          className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    $DUC rewards are deducted from your merchant vault balance when issued to customers.
                    <a href="#" onClick={(e) => { e.preventDefault(); window.location.href = '/DUCVault'; }} className="ml-1 text-yellow-600 underline">
                      Manage your vault →
                    </a>
                  </p>

                  <Button onClick={saveLoyaltySettings}>
                    Save $DUC Settings
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="rewards">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rewards.map(reward => (
                  <Card key={reward.id} className="dark:bg-gray-800 dark:border-gray-700">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg dark:text-white">{reward.name}</CardTitle>
                          <Badge className="mt-2 dark:bg-purple-900/50 dark:text-purple-200">
                            {reward.points_required} points
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => { setEditingReward(reward); setShowRewardForm(true); }}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteReward(reward.id)} className="text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{reward.description}</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Type:</span>
                          <span className="capitalize dark:text-white">{reward.reward_type.replace('_', ' ')}</span>
                        </div>
                        {reward.discount_value && (
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Value:</span>
                            <span className="font-medium dark:text-white">
                              {reward.reward_type === 'percentage_discount' ? `${reward.discount_value}%` : `$${reward.discount_value}`}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Redemptions:</span>
                          <span className="dark:text-white">{reward.total_redemptions || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Status:</span>
                          <Badge variant={reward.is_active ? 'default' : 'secondary'} className="dark:bg-gray-700">
                            {reward.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="customers">
              <Card className="dark:bg-gray-800 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="dark:text-white">Customer Points Balance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {customers.map(customer => (
                      <div key={customer.id} className="flex justify-between items-center p-4 border rounded-lg dark:border-gray-700">
                        <div>
                          <p className="font-medium dark:text-white">{customer.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{customer.phone}</p>
                        </div>
                        <div className="text-right flex gap-4 items-end">
                          <div>
                            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{customer.loyalty_points || 0}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">points</p>
                          </div>
                          {(customer.duc_balance > 0 || loyaltySettings.duc_rewards_enabled) && (
                            <div>
                              <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{(customer.duc_balance || 0).toFixed(4)}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">$DUC</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card className="dark:bg-gray-800 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="dark:text-white">Recent Redemptions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {redemptions.map(redemption => (
                      <div key={redemption.id} className="flex justify-between items-center p-4 border rounded-lg dark:border-gray-700">
                        <div>
                          <p className="font-medium dark:text-white">{redemption.reward_name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{redemption.customer_phone}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">{new Date(redemption.created_date).toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-red-600 dark:text-red-400">-{redemption.points_spent} pts</p>
                          <p className="text-sm text-green-600 dark:text-green-400">${redemption.discount_amount?.toFixed(2)} saved</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <RewardFormDialog
            isOpen={showRewardForm}
            onClose={() => { setShowRewardForm(false); setEditingReward(null); }}
            onSave={saveReward}
            reward={editingReward}
            products={products}
          />
        </div>
      </div>
    </PermissionGate>
  );
}

function RewardFormDialog({ isOpen, onClose, onSave, reward, products }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    reward_type: 'fixed_discount',
    points_required: 100,
    discount_value: 5,
    free_product_id: '',
    min_purchase_amount: 0,
    max_discount_amount: 0,
    is_active: true
  });

  useEffect(() => {
    if (reward) {
      setFormData(reward);
    } else {
      setFormData({
        name: '',
        description: '',
        reward_type: 'fixed_discount',
        points_required: 100,
        discount_value: 5,
        free_product_id: '',
        min_purchase_amount: 0,
        max_discount_amount: 0,
        is_active: true
      });
    }
  }, [reward]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg dark:bg-gray-800 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="dark:text-white">{reward ? 'Edit Reward' : 'Create New Reward'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="dark:text-gray-200">Reward Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., $5 Off Your Order"
              required
              className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div>
            <Label className="dark:text-gray-200">Description</Label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the reward"
              className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div>
            <Label className="dark:text-gray-200">Reward Type *</Label>
            <Select value={formData.reward_type} onValueChange={(value) => setFormData({ ...formData, reward_type: value })}>
              <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                <SelectItem value="fixed_discount" className="dark:text-white">Fixed Discount ($)</SelectItem>
                <SelectItem value="percentage_discount" className="dark:text-white">Percentage Discount (%)</SelectItem>
                <SelectItem value="free_item" className="dark:text-white">Free Item</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="dark:text-gray-200">Points Required *</Label>
              <Input
                type="number"
                value={formData.points_required}
                onChange={(e) => setFormData({ ...formData, points_required: parseInt(e.target.value) || 0 })}
                required
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            {formData.reward_type !== 'free_item' && (
              <div>
                <Label className="dark:text-gray-200">
                  {formData.reward_type === 'percentage_discount' ? 'Discount %' : 'Discount Amount ($)'}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            )}

            {formData.reward_type === 'free_item' && (
              <div>
                <Label className="dark:text-gray-200">Free Product</Label>
                <Select value={formData.free_product_id} onValueChange={(value) => setFormData({ ...formData, free_product_id: value })}>
                  <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                    {products.map(p => (
                      <SelectItem key={p.id} value={p.id} className="dark:text-white">{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div>
            <Label className="dark:text-gray-200">Minimum Purchase Amount ($)</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.min_purchase_amount}
              onChange={(e) => setFormData({ ...formData, min_purchase_amount: parseFloat(e.target.value) || 0 })}
              className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          {formData.reward_type === 'percentage_discount' && (
            <div>
              <Label className="dark:text-gray-200">Max Discount Amount ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.max_discount_amount}
                onChange={(e) => setFormData({ ...formData, max_discount_amount: parseFloat(e.target.value) || 0 })}
                placeholder="Leave 0 for no limit"
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="dark:border-gray-600 dark:text-white">
              Cancel
            </Button>
            <Button type="submit">
              {reward ? 'Update Reward' : 'Create Reward'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}