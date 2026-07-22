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
  Link2,
  UserCheck,
  UserPlus
} from 'lucide-react';
import DealerSubdomainManager from './DealerSubdomainManager';
import PayoutControl from '../superadmin/PayoutControl';
import SolanaWalletInput from '@/components/shared/SolanaWalletInput';
import { createPageUrl } from '@/utils';

export default function DealerManagement() {
  const [ambassadors, setAmbassadors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('ambassadors');
  const [editDialog, setEditDialog] = useState({ open: false, ambassador: null, tab: 'basic' });

  useEffect(() => {
    loadAmbassadors();
  }, []);

  const loadAmbassadors = async () => {
    try {
      const list = await base44.entities.Ambassador.list('-created_date');
      setAmbassadors(list);
    } catch (error) {
      console.error('Error loading ambassadors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAmbassador = () => {
    setEditDialog({
      open: true,
      ambassador: {
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
        platform_fee_monthly: 0,
        signup_bonus_per_merchant: 0,
        bonus_per_active_merchant: 0,
        milestone_bonus_threshold: 0,
        milestone_bonus_amount: 0,
        payout_method: 'stripe_connect',
        payout_minimum: 20,
        payout_cadence: 'monthly',
        billing_mode: 'root_fallback',
        settings: {
          hide_opentill_branding: false,
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

  const handleEditAmbassador = (ambassador) => {
    setEditDialog({ open: true, ambassador: { ...ambassador }, tab: 'basic' });
  };

  const handleSaveAmbassador = async () => {
    try {
      const { ambassador } = editDialog;

      if (!ambassador.slug && ambassador.name) {
        ambassador.slug = ambassador.name.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
      }

      if (ambassador.id) {
        await base44.entities.Ambassador.update(ambassador.id, ambassador);
      } else {
        const response = await base44.functions.invoke('createDealerAccount', {
          dealer_name: ambassador.name,
          owner_name: ambassador.owner_name,
          owner_email: ambassador.owner_email,
          contact_phone: ambassador.contact_phone,
          slug: ambassador.slug
        });

        if (!response.success) {
          throw new Error(response.error || 'Failed to create ambassador');
        }

        alert(`Ambassador created successfully!\n\nAmbassador Admin Credentials:\nPIN: ${response.credentials.pin}\nPassword: ${response.credentials.temp_password}\n\nCredentials have been emailed to ${ambassador.owner_email}`);
      }

      await loadAmbassadors();
      setEditDialog({ open: false, ambassador: null, tab: 'basic' });
    } catch (error) {
      console.error('Error saving ambassador:', error);
      alert('Failed to save ambassador: ' + error.message);
    }
  };

  const handleDeleteAmbassador = async (ambassadorId) => {
    if (!confirm('Are you sure you want to delete this ambassador? This will affect all associated merchants.')) {
      return;
    }

    try {
      await base44.entities.Ambassador.delete(ambassadorId);
      await loadAmbassadors();
    } catch (error) {
      console.error('Error deleting ambassador:', error);
      alert('Failed to delete ambassador');
    }
  };

  const handleImpersonateAmbassador = async (ambassador) => {
    try {
      const currentUser = await base44.auth.me();

      const ambassadorData = {
        id: ambassador.legacy_dealer_id || ambassador.id,
        name: ambassador.name,
        slug: ambassador.slug,
        owner_email: ambassador.owner_email,
        owner_name: ambassador.owner_name,
        primary_color: ambassador.primary_color,
        secondary_color: ambassador.secondary_color,
        logo_url: ambassador.logo_url,
        status: ambassador.status,
        commission_percent: ambassador.commission_percent,
      };

      const syntheticUser = {
        id: ambassador.legacy_dealer_id || ambassador.id,
        full_name: ambassador.owner_name || ambassador.name,
        email: ambassador.owner_email,
        role: 'dealer_admin',
        dealer_id: ambassador.legacy_dealer_id || ambassador.id,
        is_impersonating: true,
        original_admin_email: currentUser.email
      };

      localStorage.setItem('dealerToken', 'impersonation_' + ambassador.id);
      localStorage.setItem('dealerData', JSON.stringify(ambassadorData));
      localStorage.setItem('pinLoggedInUser', JSON.stringify(syntheticUser));

      window.location.href = createPageUrl('DealerDashboard');
    } catch (error) {
      console.error('Error impersonating ambassador:', error);
      alert('Failed to impersonate ambassador');
    }
  };

  const handleCreateAmbassadorAdmin = async (ambassador) => {
    const email = prompt(`Enter email for new ambassador admin user for "${ambassador.name}":`, ambassador.owner_email);
    if (!email) return;

    try {
      const response = await base44.functions.invoke('createDealerAdminUser', {
        dealer_id: ambassador.legacy_dealer_id || ambassador.id,
        email: email.toLowerCase().trim(),
        full_name: ambassador.owner_name || 'Ambassador Admin'
      });

      if (response.data.success) {
        alert(`Ambassador admin invitation sent to ${email}\n\nThey will receive an email to set up their account.`);
        loadAmbassadors();
      }
    } catch (error) {
      console.error('Error creating ambassador admin:', error);
      alert('Failed to create ambassador admin: ' + error.message);
    }
  };

  const updateAmbassador = (field, value) => {
    setEditDialog({
      ...editDialog,
      ambassador: { ...editDialog.ambassador, [field]: value }
    });
  };

  const updateSettings = (field, value) => {
    setEditDialog({
      ...editDialog,
      ambassador: {
        ...editDialog.ambassador,
        settings: { ...editDialog.ambassador.settings, [field]: value }
      }
    });
  };

  const filteredAmbassadors = ambassadors.filter(a =>
    a.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.owner_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.slug?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-12">Loading ambassadors...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ambassadors" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">Ambassadors</span>
          </TabsTrigger>
          <TabsTrigger value="payouts" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            <span className="hidden sm:inline">Payout Control</span>
          </TabsTrigger>
        </TabsList>

        {/* Ambassadors Tab */}
        <TabsContent value="ambassadors" className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Ambassadors</p>
                <p className="text-2xl font-bold">{ambassadors.length}</p>
              </div>
              <Building2 className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Ambassadors</p>
                <p className="text-2xl font-bold">
                  {ambassadors.filter(a => a.status === 'active').length}
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
                  {ambassadors.reduce((sum, a) => sum + (a.total_merchants || 0), 0)}
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
                <p className="text-sm text-gray-500">Pending Commission</p>
                <p className="text-2xl font-bold">
                  ${ambassadors.reduce((sum, a) => sum + (a.commission_pending || 0), 0).toFixed(2)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ambassadors List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Ambassadors</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search ambassadors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button onClick={handleCreateAmbassador}>
                <Plus className="w-4 h-4 mr-2" />
                Create Ambassador
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredAmbassadors.map((ambassador) => (
              <div
                key={ambassador.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {ambassador.logo_url ? (
                    <img src={ambassador.logo_url} alt={ambassador.name} className="h-12 w-12 rounded object-cover" />
                  ) : (
                    <div
                      className="h-12 w-12 rounded flex items-center justify-center text-white font-bold"
                      style={{ background: `linear-gradient(135deg, ${ambassador.primary_color || '#7B2FD6'}, ${ambassador.secondary_color || '#0FD17A'})` }}
                    >
                      {ambassador.name?.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="font-medium text-lg">{ambassador.name}</h3>
                    <p className="text-sm text-gray-500">{ambassador.owner_email}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs text-gray-400">{ambassador.slug}.opentill.app</span>
                      {ambassador.domain && (
                        <span className="text-xs text-blue-600">• {ambassador.domain}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm font-medium">{ambassador.total_merchants || 0} merchants</p>
                    <p className="text-xs text-gray-500">
                      {ambassador.commission_percent}% commission
                      {ambassador.bonus_per_active_merchant ? ` • $${ambassador.bonus_per_active_merchant}/merchant bonus` : ''}
                    </p>
                  </div>

                  <Badge className={
                    ambassador.status === 'active' ? 'bg-green-100 text-green-800' :
                    ambassador.status === 'trial' ? 'bg-blue-100 text-blue-800' :
                    ambassador.status === 'suspended' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }>
                    {ambassador.status}
                  </Badge>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCreateAmbassadorAdmin(ambassador)}
                      title="Add ambassador admin"
                    >
                      <UserPlus className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleImpersonateAmbassador(ambassador)}
                      title="Impersonate ambassador"
                    >
                      <UserCheck className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditAmbassador(ambassador)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteAmbassador(ambassador.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {filteredAmbassadors.length === 0 && (
              <div className="text-center py-12">
                <Building2 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No ambassadors found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit/Create Ambassador Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => !open && setEditDialog({ open: false, ambassador: null, tab: 'basic' })}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editDialog.ambassador?.id ? 'Edit Ambassador' : 'Create New Ambassador'}
            </DialogTitle>
            <DialogDescription>
              Configure white-label settings, branding, and billing for this ambassador
            </DialogDescription>
          </DialogHeader>

          {editDialog.ambassador && (
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
                      value={editDialog.ambassador.name}
                      onChange={(e) => updateAmbassador('name', e.target.value)}
                      placeholder="Acme POS Solutions"
                    />
                  </div>

                  <div>
                    <Label>Slug (URL) *</Label>
                    <Input
                      value={editDialog.ambassador.slug}
                      onChange={(e) => updateAmbassador('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="acme-pos"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {editDialog.ambassador.slug}.opentill.app
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Owner Name *</Label>
                    <Input
                      value={editDialog.ambassador.owner_name}
                      onChange={(e) => updateAmbassador('owner_name', e.target.value)}
                      placeholder="John Smith"
                    />
                  </div>

                  <div>
                    <Label>Owner Email *</Label>
                    <Input
                      type="email"
                      value={editDialog.ambassador.owner_email}
                      onChange={(e) => updateAmbassador('owner_email', e.target.value)}
                      placeholder="john@acmepos.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Contact Email *</Label>
                    <Input
                      type="email"
                      value={editDialog.ambassador.contact_email}
                      onChange={(e) => updateAmbassador('contact_email', e.target.value)}
                      placeholder="support@acmepos.com"
                    />
                  </div>

                  <div>
                    <Label>Contact Phone</Label>
                    <Input
                      value={editDialog.ambassador.contact_phone || ''}
                      onChange={(e) => updateAmbassador('contact_phone', e.target.value)}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>

                <div>
                  <Label>Status</Label>
                  <Select
                    value={editDialog.ambassador.status}
                    onValueChange={(value) => updateAmbassador('status', value)}
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
                    value={editDialog.ambassador.logo_url || ''}
                    onChange={(e) => updateAmbassador('logo_url', e.target.value)}
                    placeholder="https://example.com/logo.png"
                  />
                  {editDialog.ambassador.logo_url && (
                    <img src={editDialog.ambassador.logo_url} alt="Logo preview" className="mt-2 h-20 object-contain" />
                  )}
                </div>

                <div>
                  <Label>Favicon URL</Label>
                  <Input
                    value={editDialog.ambassador.favicon_url || ''}
                    onChange={(e) => updateAmbassador('favicon_url', e.target.value)}
                    placeholder="https://example.com/favicon.ico"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Primary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={editDialog.ambassador.primary_color}
                        onChange={(e) => updateAmbassador('primary_color', e.target.value)}
                        className="w-20"
                      />
                      <Input
                        value={editDialog.ambassador.primary_color}
                        onChange={(e) => updateAmbassador('primary_color', e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Secondary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={editDialog.ambassador.secondary_color}
                        onChange={(e) => updateAmbassador('secondary_color', e.target.value)}
                        className="w-20"
                      />
                      <Input
                        value={editDialog.ambassador.secondary_color}
                        onChange={(e) => updateAmbassador('secondary_color', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg" style={{
                  background: `linear-gradient(135deg, ${editDialog.ambassador.primary_color}, ${editDialog.ambassador.secondary_color})`
                }}>
                  <p className="text-white font-bold text-center">Brand Preview</p>
                </div>
              </TabsContent>

              {/* Subdomain Tab */}
              <TabsContent value="subdomain" className="space-y-4">
                {editDialog.ambassador.id ? (
                  <DealerSubdomainManager
                    ambassador={editDialog.ambassador}
                    onUpdate={loadAmbassadors}
                  />
                ) : (
                  <Alert>
                    <AlertDescription>
                      Save the ambassador first before managing the subdomain
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              {/* Domain Tab */}
              <TabsContent value="domain" className="space-y-4">
                <div>
                  <Label>Custom Domain</Label>
                  <Input
                    value={editDialog.ambassador.domain || ''}
                    onChange={(e) => updateAmbassador('domain', e.target.value)}
                    placeholder="pos.yourcompany.com"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Point your domain's DNS to our servers. Contact support for setup instructions.
                  </p>
                </div>

                <div>
                  <Label>Solana Wallet Address</Label>
                  <SolanaWalletInput
                    value={editDialog.ambassador.solana_wallet_address || ''}
                    onChange={(v) => updateAmbassador('solana_wallet_address', v)}
                    placeholder="For $DUC payouts"
                  />
                </div>
              </TabsContent>

              {/* Billing Tab */}
              <TabsContent value="billing" className="space-y-4">
                <div>
                  <Label>Commission Percentage</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={editDialog.ambassador.commission_percent}
                    onChange={(e) => updateAmbassador('commission_percent', parseFloat(e.target.value))}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Ambassador earns this % of each merchant's subscription revenue
                  </p>
                </div>

                <div className="border-t pt-4 space-y-4">
                  <div>
                    <p className="font-semibold text-sm">Bonus Structure</p>
                    <p className="text-xs text-gray-500">Ambassadors are not charged platform fees. Configure optional bonuses below.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Signup Bonus per Merchant ($)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editDialog.ambassador.signup_bonus_per_merchant || 0}
                        onChange={(e) => updateAmbassador('signup_bonus_per_merchant', parseFloat(e.target.value) || 0)}
                      />
                      <p className="text-xs text-gray-500 mt-1">One-time bonus when a new merchant signs up</p>
                    </div>

                    <div>
                      <Label>Active Merchant Bonus ($/period)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editDialog.ambassador.bonus_per_active_merchant || 0}
                        onChange={(e) => updateAmbassador('bonus_per_active_merchant', parseFloat(e.target.value) || 0)}
                      />
                      <p className="text-xs text-gray-500 mt-1">Added for each active merchant each payout period</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Milestone Threshold (merchants)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={editDialog.ambassador.milestone_bonus_threshold || 0}
                        onChange={(e) => updateAmbassador('milestone_bonus_threshold', parseFloat(e.target.value) || 0)}
                      />
                      <p className="text-xs text-gray-500 mt-1">Active merchants needed to unlock the milestone bonus</p>
                    </div>

                    <div>
                      <Label>Milestone Bonus ($)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editDialog.ambassador.milestone_bonus_amount || 0}
                        onChange={(e) => updateAmbassador('milestone_bonus_amount', parseFloat(e.target.value) || 0)}
                      />
                      <p className="text-xs text-gray-500 mt-1">Bonus paid each period the threshold is met</p>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Billing Mode</Label>
                  <Select
                    value={editDialog.ambassador.billing_mode}
                    onValueChange={(value) => updateAmbassador('billing_mode', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="root_fallback">openTILL Bills Merchants</SelectItem>
                      <SelectItem value="dealer">Ambassador Bills Merchants Directly</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    {editDialog.ambassador.billing_mode === 'dealer'
                      ? 'Ambassador handles merchant billing through their own openTILL Payments powered by Stripe account'
                      : 'openTILL bills merchants and pays ambassador commission'}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Payout Method</Label>
                    <Select
                      value={editDialog.ambassador.payout_method}
                      onValueChange={(value) => updateAmbassador('payout_method', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="stripe_connect">openTILL Payments</SelectItem>
                        <SelectItem value="solana">$DUC (Solana)</SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Payout Cadence</Label>
                    <Select
                      value={editDialog.ambassador.payout_cadence}
                      onValueChange={(value) => updateAmbassador('payout_cadence', value)}
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
                      value={editDialog.ambassador.payout_minimum}
                      onChange={(e) => updateAmbassador('payout_minimum', parseFloat(e.target.value))}
                    />
                  </div>
                </div>

                {editDialog.ambassador.stripe_account_id && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-green-800">
                      <CreditCard className="w-5 h-5" />
                      <span className="font-medium">openTILL Payments Connected</span>
                    </div>
                    <p className="text-sm text-green-600 mt-1">
                      Account ID: {editDialog.ambassador.stripe_account_id}
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <Label>Hide openTILL Branding</Label>
                      <p className="text-xs text-gray-500">Remove "Powered by openTILL" from merchant portals</p>
                    </div>
                    <Switch
                      checked={editDialog.ambassador.settings?.hide_opentill_branding || false}
                      onCheckedChange={(checked) => updateSettings('hide_opentill_branding', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <Label>Allow Merchant Self-Signup</Label>
                      <p className="text-xs text-gray-500">Let merchants register without ambassador approval</p>
                    </div>
                    <Switch
                      checked={editDialog.ambassador.settings?.allow_merchant_self_signup !== false}
                      onCheckedChange={(checked) => updateSettings('allow_merchant_self_signup', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <Label>Custom Pricing Enabled</Label>
                      <p className="text-xs text-gray-500">Allow ambassador to set custom subscription prices</p>
                    </div>
                    <Switch
                      checked={editDialog.ambassador.settings?.custom_pricing_enabled || false}
                      onCheckedChange={(checked) => updateSettings('custom_pricing_enabled', checked)}
                    />
                  </div>
                </div>

                <div>
                  <Label>Default Merchant Plan</Label>
                  <Select
                    value={editDialog.ambassador.settings?.default_merchant_plan || 'basic'}
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
                    value={editDialog.ambassador.settings?.custom_login_message || ''}
                    onChange={(e) => updateSettings('custom_login_message', e.target.value)}
                    placeholder="Welcome to Acme POS! Contact support@acmepos.com for help."
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Custom Support URL</Label>
                  <Input
                    value={editDialog.ambassador.settings?.custom_support_url || ''}
                    onChange={(e) => updateSettings('custom_support_url', e.target.value)}
                    placeholder="https://support.yourcompany.com"
                  />
                </div>
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, ambassador: null, tab: 'basic' })}>
              Cancel
            </Button>
            <Button onClick={handleSaveAmbassador}>
              {editDialog.ambassador?.id ? 'Update' : 'Create'} Ambassador
            </Button>
          </DialogFooter>
        </DialogContent>
        </Dialog>
        </TabsContent>

        {/* Payout Control Tab */}
        <TabsContent value="payouts" className="space-y-6">
          <PayoutControl />
        </TabsContent>
        </Tabs>
        </div>
        );
        }