import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building2, 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  DollarSign,
  Users,
  TrendingUp,
  Settings,
  Palette,
  Globe,
  CreditCard,
  Link2
} from 'lucide-react';
import DealerSubdomainManager from './DealerSubdomainManager';

export default function DealerManagement() {
  const [dealers, setDealers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editDialog, setEditDialog] = useState({ open: false, dealer: null, tab: 'basic' });

  useEffect(() => {
    loadDealers();
  }, []);

  const loadDealers = async () => {
    try {
      const dealerList = await base44.entities.Dealer.list('-created_date');
      setDealers(dealerList);
    } catch (error) {
      console.error('Error loading dealers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDealer = () => {
    setEditDialog({ 
      open: true, 
      dealer: {
        name: '',
        slug: '',
        owner_name: '',
        owner_email: '',
        contact_email: '',
        contact_phone: '',
        primary_color: '#7B2FD6',
        secondary_color: '#0FD17A',
        logo_url: '',
        favicon_url: '',
        domain: '',
        status: 'trial',
        commission_percent: 10,
        platform_fee_monthly: 99,
        payout_method: 'stripe_connect',
        payout_minimum: 20,
        payout_cadence: 'monthly',
        billing_mode: 'root_fallback',
        settings: {
          hide_chainlink_branding: false,
          allow_merchant_self_signup: true,
          default_merchant_plan: 'basic',
          custom_pricing_enabled: false,
          custom_login_message: '',
          custom_support_url: ''
        }
      },
      tab: 'basic'
    });
  };

  const handleEditDealer = (dealer) => {
    setEditDialog({ open: true, dealer: { ...dealer }, tab: 'basic' });
  };

  const handleSaveDealer = async () => {
    try {
      const { dealer } = editDialog;
      
      // Generate slug from name if not provided
      if (!dealer.slug && dealer.name) {
        dealer.slug = dealer.name.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
      }

      if (dealer.id) {
        await base44.entities.Dealer.update(dealer.id, dealer);
      } else {
        await base44.entities.Dealer.create(dealer);
      }
      
      await loadDealers();
      setEditDialog({ open: false, dealer: null, tab: 'basic' });
    } catch (error) {
      console.error('Error saving dealer:', error);
      alert('Failed to save dealer: ' + error.message);
    }
  };

  const handleDeleteDealer = async (dealerId) => {
    if (!confirm('Are you sure you want to delete this dealer? This will affect all associated merchants.')) {
      return;
    }

    try {
      await base44.entities.Dealer.delete(dealerId);
      await loadDealers();
    } catch (error) {
      console.error('Error deleting dealer:', error);
      alert('Failed to delete dealer');
    }
  };

  const updateDealer = (field, value) => {
    setEditDialog({
      ...editDialog,
      dealer: { ...editDialog.dealer, [field]: value }
    });
  };

  const updateSettings = (field, value) => {
    setEditDialog({
      ...editDialog,
      dealer: {
        ...editDialog.dealer,
        settings: { ...editDialog.dealer.settings, [field]: value }
      }
    });
  };

  const filteredDealers = dealers.filter(d =>
    d.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.owner_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.slug?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-12">Loading dealers...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Dealers</p>
                <p className="text-2xl font-bold">{dealers.length}</p>
              </div>
              <Building2 className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Dealers</p>
                <p className="text-2xl font-bold">
                  {dealers.filter(d => d.status === 'active').length}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Merchants</p>
                <p className="text-2xl font-bold">
                  {dealers.reduce((sum, d) => sum + (d.total_merchants || 0), 0)}
                </p>
              </div>
              <Users className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Monthly Fees</p>
                <p className="text-2xl font-bold">
                  ${dealers.reduce((sum, d) => sum + (d.platform_fee_monthly || 0), 0).toFixed(0)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dealers List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Dealers</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search dealers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button onClick={handleCreateDealer}>
                <Plus className="w-4 h-4 mr-2" />
                Create Dealer
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredDealers.map((dealer) => (
              <div
                key={dealer.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {dealer.logo_url ? (
                    <img src={dealer.logo_url} alt={dealer.name} className="h-12 w-12 rounded object-cover" />
                  ) : (
                    <div 
                      className="h-12 w-12 rounded flex items-center justify-center text-white font-bold"
                      style={{ background: `linear-gradient(135deg, ${dealer.primary_color || '#7B2FD6'}, ${dealer.secondary_color || '#0FD17A'})` }}
                    >
                      {dealer.name?.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="font-medium text-lg">{dealer.name}</h3>
                    <p className="text-sm text-gray-500">{dealer.owner_email}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs text-gray-400">{dealer.slug}.chainlinkpos.com</span>
                      {dealer.domain && (
                        <span className="text-xs text-blue-600">• {dealer.domain}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm font-medium">{dealer.total_merchants || 0} merchants</p>
                    <p className="text-xs text-gray-500">
                      {dealer.commission_percent}% commission • ${dealer.platform_fee_monthly}/mo
                    </p>
                  </div>

                  <Badge className={
                    dealer.status === 'active' ? 'bg-green-100 text-green-800' :
                    dealer.status === 'trial' ? 'bg-blue-100 text-blue-800' :
                    dealer.status === 'suspended' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }>
                    {dealer.status}
                  </Badge>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditDealer(dealer)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteDealer(dealer.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {filteredDealers.length === 0 && (
              <div className="text-center py-12">
                <Building2 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No dealers found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit/Create Dealer Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => !open && setEditDialog({ open: false, dealer: null, tab: 'basic' })}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editDialog.dealer?.id ? 'Edit Dealer' : 'Create New Dealer'}
            </DialogTitle>
            <DialogDescription>
              Configure white-label settings, branding, and billing for this dealer
            </DialogDescription>
          </DialogHeader>
          
          {editDialog.dealer && (
            <Tabs value={editDialog.tab} onValueChange={(tab) => setEditDialog({...editDialog, tab})}>
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="basic">
                  <Building2 className="w-4 h-4 mr-2" />
                  Basic
                </TabsTrigger>
                <TabsTrigger value="branding">
                  <Palette className="w-4 h-4 mr-2" />
                  Branding
                </TabsTrigger>
                <TabsTrigger value="subdomain">
                  <Link2 className="w-4 h-4 mr-2" />
                  Subdomain
                </TabsTrigger>
                <TabsTrigger value="domain">
                  <Globe className="w-4 h-4 mr-2" />
                  Domain
                </TabsTrigger>
                <TabsTrigger value="billing">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Billing
                </TabsTrigger>
                <TabsTrigger value="settings">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </TabsTrigger>
              </TabsList>

              {/* Basic Info Tab */}
              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Business Name *</Label>
                    <Input
                      value={editDialog.dealer.name}
                      onChange={(e) => updateDealer('name', e.target.value)}
                      placeholder="Acme POS Solutions"
                    />
                  </div>

                  <div>
                    <Label>Slug (URL) *</Label>
                    <Input
                      value={editDialog.dealer.slug}
                      onChange={(e) => updateDealer('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="acme-pos"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {editDialog.dealer.slug}.chainlinkpos.com
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Owner Name *</Label>
                    <Input
                      value={editDialog.dealer.owner_name}
                      onChange={(e) => updateDealer('owner_name', e.target.value)}
                      placeholder="John Smith"
                    />
                  </div>

                  <div>
                    <Label>Owner Email *</Label>
                    <Input
                      type="email"
                      value={editDialog.dealer.owner_email}
                      onChange={(e) => updateDealer('owner_email', e.target.value)}
                      placeholder="john@acmepos.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Contact Email *</Label>
                    <Input
                      type="email"
                      value={editDialog.dealer.contact_email}
                      onChange={(e) => updateDealer('contact_email', e.target.value)}
                      placeholder="support@acmepos.com"
                    />
                  </div>

                  <div>
                    <Label>Contact Phone</Label>
                    <Input
                      value={editDialog.dealer.contact_phone || ''}
                      onChange={(e) => updateDealer('contact_phone', e.target.value)}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>

                <div>
                  <Label>Status</Label>
                  <Select
                    value={editDialog.dealer.status}
                    onValueChange={(value) => updateDealer('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              {/* Branding Tab */}
              <TabsContent value="branding" className="space-y-4">
                <div>
                  <Label>Logo URL</Label>
                  <Input
                    value={editDialog.dealer.logo_url || ''}
                    onChange={(e) => updateDealer('logo_url', e.target.value)}
                    placeholder="https://example.com/logo.png"
                  />
                  {editDialog.dealer.logo_url && (
                    <img src={editDialog.dealer.logo_url} alt="Logo preview" className="mt-2 h-20 object-contain" />
                  )}
                </div>

                <div>
                  <Label>Favicon URL</Label>
                  <Input
                    value={editDialog.dealer.favicon_url || ''}
                    onChange={(e) => updateDealer('favicon_url', e.target.value)}
                    placeholder="https://example.com/favicon.ico"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Primary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={editDialog.dealer.primary_color}
                        onChange={(e) => updateDealer('primary_color', e.target.value)}
                        className="w-20"
                      />
                      <Input
                        value={editDialog.dealer.primary_color}
                        onChange={(e) => updateDealer('primary_color', e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Secondary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={editDialog.dealer.secondary_color}
                        onChange={(e) => updateDealer('secondary_color', e.target.value)}
                        className="w-20"
                      />
                      <Input
                        value={editDialog.dealer.secondary_color}
                        onChange={(e) => updateDealer('secondary_color', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg" style={{
                  background: `linear-gradient(135deg, ${editDialog.dealer.primary_color}, ${editDialog.dealer.secondary_color})`
                }}>
                  <p className="text-white font-bold text-center">Brand Preview</p>
                </div>
              </TabsContent>

              {/* Subdomain Tab */}
              <TabsContent value="subdomain" className="space-y-4">
                {editDialog.dealer.id ? (
                  <DealerSubdomainManager 
                    dealer={editDialog.dealer} 
                    onUpdate={loadDealers}
                  />
                ) : (
                  <Alert>
                    <AlertDescription>
                      Save the dealer first before managing subdomain
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              {/* Domain Tab */}
              <TabsContent value="domain" className="space-y-4">
                <div>
                  <Label>Custom Domain</Label>
                  <Input
                    value={editDialog.dealer.domain || ''}
                    onChange={(e) => updateDealer('domain', e.target.value)}
                    placeholder="pos.yourcompany.com"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Point your domain's DNS to our servers. Contact support for setup instructions.
                  </p>
                </div>

                <div>
                  <Label>Solana Wallet Address</Label>
                  <Input
                    value={editDialog.dealer.solana_wallet_address || ''}
                    onChange={(e) => updateDealer('solana_wallet_address', e.target.value)}
                    placeholder="For crypto payments and payouts"
                  />
                </div>
              </TabsContent>

              {/* Billing Tab */}
              <TabsContent value="billing" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Commission Percentage</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={editDialog.dealer.commission_percent}
                      onChange={(e) => updateDealer('commission_percent', parseFloat(e.target.value))}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Dealer earns this % of each merchant's subscription
                    </p>
                  </div>

                  <div>
                    <Label>Platform Fee (Monthly)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editDialog.dealer.platform_fee_monthly}
                      onChange={(e) => updateDealer('platform_fee_monthly', parseFloat(e.target.value))}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Fee charged to dealer for using the platform
                    </p>
                  </div>
                </div>

                <div>
                  <Label>Billing Mode</Label>
                  <Select
                    value={editDialog.dealer.billing_mode}
                    onValueChange={(value) => updateDealer('billing_mode', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="root_fallback">ChainLINK Bills Merchants</SelectItem>
                      <SelectItem value="dealer">Dealer Bills Merchants Directly</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    {editDialog.dealer.billing_mode === 'dealer' 
                      ? 'Dealer handles merchant billing through their own Stripe account' 
                      : 'ChainLINK bills merchants and pays dealer commission'}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Payout Method</Label>
                    <Select
                      value={editDialog.dealer.payout_method}
                      onValueChange={(value) => updateDealer('payout_method', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="stripe_connect">Stripe Connect</SelectItem>
                        <SelectItem value="solana">Solana</SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Payout Cadence</Label>
                    <Select
                      value={editDialog.dealer.payout_cadence}
                      onValueChange={(value) => updateDealer('payout_cadence', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="biweekly">Bi-weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Minimum Payout ($)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editDialog.dealer.payout_minimum}
                      onChange={(e) => updateDealer('payout_minimum', parseFloat(e.target.value))}
                    />
                  </div>
                </div>

                {editDialog.dealer.stripe_account_id && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-green-800">
                      <CreditCard className="w-5 h-5" />
                      <span className="font-medium">Stripe Connected</span>
                    </div>
                    <p className="text-sm text-green-600 mt-1">
                      Account ID: {editDialog.dealer.stripe_account_id}
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <Label>Hide ChainLINK Branding</Label>
                      <p className="text-xs text-gray-500">Remove "Powered by ChainLINK" from merchant portals</p>
                    </div>
                    <Switch
                      checked={editDialog.dealer.settings?.hide_chainlink_branding || false}
                      onCheckedChange={(checked) => updateSettings('hide_chainlink_branding', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <Label>Allow Merchant Self-Signup</Label>
                      <p className="text-xs text-gray-500">Let merchants register without dealer approval</p>
                    </div>
                    <Switch
                      checked={editDialog.dealer.settings?.allow_merchant_self_signup !== false}
                      onCheckedChange={(checked) => updateSettings('allow_merchant_self_signup', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <Label>Custom Pricing Enabled</Label>
                      <p className="text-xs text-gray-500">Allow dealer to set custom subscription prices</p>
                    </div>
                    <Switch
                      checked={editDialog.dealer.settings?.custom_pricing_enabled || false}
                      onCheckedChange={(checked) => updateSettings('custom_pricing_enabled', checked)}
                    />
                  </div>
                </div>

                <div>
                  <Label>Default Merchant Plan</Label>
                  <Select
                    value={editDialog.dealer.settings?.default_merchant_plan || 'basic'}
                    onValueChange={(value) => updateSettings('default_merchant_plan', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Custom Login Message</Label>
                  <Textarea
                    value={editDialog.dealer.settings?.custom_login_message || ''}
                    onChange={(e) => updateSettings('custom_login_message', e.target.value)}
                    placeholder="Welcome to Acme POS! Contact support@acmepos.com for help."
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Custom Support URL</Label>
                  <Input
                    value={editDialog.dealer.settings?.custom_support_url || ''}
                    onChange={(e) => updateSettings('custom_support_url', e.target.value)}
                    placeholder="https://support.yourcompany.com"
                  />
                </div>
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, dealer: null, tab: 'basic' })}>
              Cancel
            </Button>
            <Button onClick={handleSaveDealer}>
              {editDialog.dealer?.id ? 'Update' : 'Create'} Dealer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}