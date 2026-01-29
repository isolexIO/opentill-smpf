import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Search,
  Ban,
  CheckCircle,
  Trash2,
  Eye,
  RefreshCw,
  Plus,
  CreditCard,
  Shield,
  AlertCircle,
  Vault,
  Sparkles
} from 'lucide-react';
import { createPageUrl } from '@/utils';
import SubdomainManager from './SubdomainManager';

export default function MerchantManagement({ onUpdate }) {
  const [merchants, setMerchants] = useState([]);
  const [filteredMerchants, setFilteredMerchants] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedMerchant, setSelectedMerchant] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showAddMerchant, setShowAddMerchant] = useState(false); // New state for add merchant dialog
  const [vaultSettings, setVaultSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  // New state for new merchant form data
  const [newMerchant, setNewMerchant] = useState({
    business_name: '',
    display_name: '',
    owner_name: '',
    owner_email: '',
    phone: '',
    address: '',
    tax_id: '',
    subscription_plan: 'free',
    status: 'trial'
  });

  useEffect(() => {
    loadMerchants();
  }, []);

  useEffect(() => {
    filterMerchants();
  }, [searchTerm, statusFilter, merchants]);

  const loadMerchants = async () => {
    try {
      setLoading(true);
      const merchantList = await base44.entities.Merchant.list('-created_date');
      setMerchants(merchantList);
    } catch (error) {
      console.error('Error loading merchants:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterMerchants = () => {
    let filtered = merchants;

    if (searchTerm) {
      filtered = filtered.filter(m =>
        m.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.owner_email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(m => m.status === statusFilter);
    }

    setFilteredMerchants(filtered);
  };

  const handleStatusChange = async (merchant, newStatus) => {
    try {
      const response = await base44.functions.invoke('updateMerchantStatus', {
        merchantId: merchant.id,
        newStatus: newStatus
      });

      if (response.data.success) {
        await loadMerchants();
        if (onUpdate) onUpdate();
      } else {
        alert('Failed to update merchant status: ' + (response.data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error updating merchant status:', error);
      alert('Failed to update merchant status: ' + error.message);
    }
  };

  const handleImpersonate = async (merchant) => {
    try {
      const currentUser = await base44.auth.me();
      
      // Store original admin user data in localStorage for later restoration
      localStorage.setItem('impersonationData', JSON.stringify({
        originalUser: currentUser,
        impersonatedMerchant: {
          id: merchant.id,
          business_name: merchant.business_name
        },
        timestamp: new Date().toISOString()
      }));

      // Create a temporary impersonation user object (remove dealer_id to avoid layout lookup errors)
      const impersonationUser = {
        ...currentUser,
        merchant_id: merchant.id,
        dealer_id: undefined,
        role: 'merchant_admin',
        permissions: [
          'process_orders',
          'manage_inventory',
          'view_reports',
          'manage_customers',
          'process_refunds',
          'admin_settings',
          'manage_users',
          'access_marketplace',
          'configure_devices',
          'configure_payments',
          'manage_subscriptions',
          'submit_tickets',
          'view_all_tickets'
        ],
        is_impersonating: true
      };

      // Store impersonation user in PIN login storage
      localStorage.setItem('pinLoggedInUser', JSON.stringify(impersonationUser));

      // Log the action
      await base44.entities.SystemLog.create({
        log_type: 'super_admin_action',
        action: 'Merchant impersonation started',
        description: `Super admin ${currentUser.email} started impersonating merchant: ${merchant.business_name}`,
        user_email: currentUser.email,
        user_role: 'super_admin',
        merchant_id: merchant.id,
        severity: 'warning'
      });

      // Redirect to System Menu using createPageUrl
      window.location.href = createPageUrl('SystemMenu');
    } catch (error) {
      console.error('Error impersonating merchant:', error);
      alert('Failed to impersonate merchant. Please try again.');
    }
  };

  const handleDelete = async (merchant) => {
    if (!window.confirm(`Are you sure you want to DELETE ${merchant.business_name}?\n\nThis action cannot be undone and will remove all merchant data.`)) {
      return;
    }

    try {
      await base44.asServiceRole.entities.Merchant.delete(merchant.id);
      
      await base44.entities.SystemLog.create({
        log_type: 'super_admin_action',
        action: 'Merchant deleted',
        description: `Merchant ${merchant.business_name} was permanently deleted`,
        user_email: (await base44.auth.me()).email,
        user_role: 'super_admin',
        severity: 'critical'
      });

      await loadMerchants();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error deleting merchant:', error);
      alert('Failed to delete merchant');
    }
  };

  const handleSubscriptionChange = async (merchant, newPlan) => {
    if (newPlan === merchant.subscription_plan) {
      return;
    }

    try {
      // Generate invoice
      const response = await base44.functions.invoke('generateSubscriptionInvoice', {
        merchantId: merchant.id,
        newPlan: newPlan,
        currentPlan: merchant.subscription_plan
      });

      if (response.data.success) {
        const invoice = response.data.invoice;
        
        // Send invoice email to merchant
        await base44.functions.invoke('sendEmail', {
          to: merchant.owner_email,
          subject: `Subscription Plan Change Proposal - Invoice ${invoice.invoice_number}`,
          body: `Hello ${merchant.owner_name},

Your subscription plan has been proposed for change:

Current Plan: ${invoice.from_plan}
New Plan: ${invoice.to_plan}
Monthly Cost: $${invoice.monthly_amount}
Invoice #: ${invoice.invoice_number}

This proposal is valid until ${new Date(invoice.valid_until).toLocaleDateString()}.

Please log in to your account to review and approve this change.

Best regards,
ChainLINK Support`
        });

        alert(`Invoice ${invoice.invoice_number} generated and sent to ${merchant.owner_email} for approval.`);
        await loadMerchants();
      }
    } catch (error) {
      console.error('Error changing subscription:', error);
      alert('Failed to generate subscription invoice: ' + error.message);
    }
  };

  const loadVaultSettings = async (merchantId) => {
    try {
      const settings = await base44.entities.cLINKVaultSettings.filter({
        merchant_id: merchantId
      });
      setVaultSettings(settings[0] || null);
    } catch (error) {
      console.error('Error loading vault settings:', error);
    }
  };

  const handleToggleVault = async (merchant, enabled) => {
    try {
      // Create or update cLINKVaultSettings for this merchant
      const existing = await base44.entities.cLINKVaultSettings.filter({
        merchant_id: merchant.id
      });

      if (existing && existing.length > 0) {
        // Update existing
        await base44.entities.cLINKVaultSettings.update(existing[0].id, {
          vault_enabled: enabled
        });
      } else {
        // Create new
        await base44.entities.cLINKVaultSettings.create({
          merchant_id: merchant.id,
          vault_enabled: enabled
        });
      }

      // Reload vault settings
      await loadVaultSettings(merchant.id);
      await loadMerchants();
      alert(`cLINK Vault ${enabled ? 'enabled' : 'disabled'} for ${merchant.business_name}`);
    } catch (error) {
      console.error('Error toggling vault:', error);
      alert('Failed to update vault setting: ' + error.message);
    }
  };

  const handleAddMerchant = async () => {
    if (!newMerchant.business_name || !newMerchant.owner_email || !newMerchant.owner_name) {
      alert('Please fill in all required fields (Business Name, Owner Name, Owner Email)');
      return;
    }

    try {
      // Calculate trial end date (14 days from now)
      const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

      // Create merchant (Super Admin only via service role)
      const merchant = await base44.asServiceRole.entities.Merchant.create({
        business_name: newMerchant.business_name,
        display_name: newMerchant.display_name || newMerchant.business_name,
        owner_name: newMerchant.owner_name,
        owner_email: newMerchant.owner_email,
        phone: newMerchant.phone,
        address: newMerchant.address,
        tax_id: newMerchant.tax_id,
        subscription_plan: newMerchant.subscription_plan,
        status: newMerchant.status,
        activated_at: newMerchant.status === 'active' ? new Date().toISOString() : null,
        trial_ends_at: newMerchant.status === 'trial' ? trialEndsAt : null, // Set trial end date only if status is trial
        settings: {
          timezone: 'America/New_York',
          currency: 'USD',
          tax_rate: 0.08
        },
        onboarding_completed: false,
        features_enabled: ['pos', 'inventory', 'reports']
      });

      // Determine subscription status and end dates based on merchant status
      let subStatus = 'trial';
      let subCurrentPeriodEnd = trialEndsAt;
      let subNextBillingDate = trialEndsAt;
      if (newMerchant.status === 'active') {
        subStatus = 'active';
        // For active, set end and next billing to a month from now (example)
        subCurrentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        subNextBillingDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      }


      // Create default subscription for the merchant
      await base44.asServiceRole.entities.Subscription.create({
        merchant_id: merchant.id,
        plan_name: newMerchant.subscription_plan,
        price: newMerchant.subscription_plan === 'free' ? 0 : (newMerchant.subscription_plan === 'basic' ? 49 : (newMerchant.subscription_plan === 'pro' ? 99 : 299)), // Example pricing
        billing_cycle: 'monthly',
        status: subStatus,
        current_period_start: new Date().toISOString(),
        current_period_end: subCurrentPeriodEnd,
        next_billing_date: subNextBillingDate
      });

      // Log the action
      await base44.entities.SystemLog.create({
        log_type: 'super_admin_action',
        action: 'Merchant created',
        description: `New merchant created: ${newMerchant.business_name}`,
        user_email: (await base44.auth.me()).email,
        user_role: 'super_admin',
        merchant_id: merchant.id,
        severity: 'info'
      });

      alert(`Merchant "${newMerchant.business_name}" created successfully! They can now register at the app.`);
      
      setShowAddMerchant(false);
      setNewMerchant({ // Reset form
        business_name: '',
        display_name: '',
        owner_name: '',
        owner_email: '',
        phone: '',
        address: '',
        tax_id: '',
        subscription_plan: 'free',
        status: 'inactive'
      });
      
      await loadMerchants();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error creating merchant:', error);
      alert('Failed to create merchant. Please try again.');
    }
  };

  const getStatusBadge = (status) => {
    const configs = {
      inactive: { color: 'bg-yellow-100 text-yellow-800', label: 'Inactive' },
      active: { color: 'bg-green-100 text-green-800', label: 'Active' },
      trial: { color: 'bg-blue-100 text-blue-800', label: 'Trial' },
      suspended: { color: 'bg-red-100 text-red-800', label: 'Suspended' },
      cancelled: { color: 'bg-gray-100 text-gray-800', label: 'Cancelled' }
    };
    const config = configs[status] || configs.inactive;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Merchant Management</CardTitle>
          <Button onClick={() => setShowAddMerchant(true)}> {/* Updated onClick */}
            <Plus className="w-4 h-4 mr-2" />
            Add Merchant
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search merchants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={loadMerchants}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Merchants Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business Name</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading merchants...
                  </TableCell>
                </TableRow>
              ) : filteredMerchants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No merchants found
                  </TableCell>
                </TableRow>
              ) : (
                filteredMerchants.map((merchant) => (
                  <TableRow key={merchant.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {merchant.business_name}
                        {merchant.is_demo && (
                          <Badge className="bg-purple-100 text-purple-800 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            DEMO
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{merchant.owner_name}</div>
                        <div className="text-gray-500">{merchant.owner_email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {merchant.subscription_plan}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(merchant.status)}</TableCell>
                    <TableCell className="text-right">
                      ${(merchant.total_revenue || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      {merchant.total_orders || 0}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedMerchant(merchant);
                            setShowDetails(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {merchant.status === 'active' ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleStatusChange(merchant, 'suspended')}
                          >
                            <Ban className="w-4 h-4 text-red-500" />
                          </Button>
                        ) : merchant.status === 'inactive' ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleStatusChange(merchant, 'trial')}
                            title="Activate Merchant"
                          >
                            <CheckCircle className="w-4 h-4 text-blue-500" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleStatusChange(merchant, 'active')}
                          >
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(merchant)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Merchant Details Dialog */}
       {selectedMerchant && (
          <Dialog 
            open={showDetails} 
            onOpenChange={(open) => {
              setShowDetails(open);
              if (open) {
                loadVaultSettings(selectedMerchant.id);
              }
            }}
          >
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
             <DialogHeader>
               <DialogTitle>{selectedMerchant.business_name}</DialogTitle>
             </DialogHeader>
             <div className="space-y-4">
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <h4 className="font-semibold mb-2">Business Information</h4>
                   <div className="space-y-1 text-sm">
                     <div><span className="text-gray-500">Owner:</span> {selectedMerchant.owner_name}</div>
                     <div><span className="text-gray-500">Email:</span> {selectedMerchant.owner_email}</div>
                     <div><span className="text-gray-500">Phone:</span> {selectedMerchant.phone || 'N/A'}</div>
                     <div><span className="text-gray-500">Address:</span> {selectedMerchant.address || 'N/A'}</div>
                   </div>
                 </div>
                 <div>
                   <h4 className="font-semibold mb-2">Subscription</h4>
                   <div className="space-y-1 text-sm">
                     <div><span className="text-gray-500">Plan:</span> <Badge className="capitalize">{selectedMerchant.subscription_plan}</Badge></div>
                     <div><span className="text-gray-500">Status:</span> {getStatusBadge(selectedMerchant.status)}</div>
                     <div><span className="text-gray-500">Trial Ends:</span> {selectedMerchant.trial_ends_at ? new Date(selectedMerchant.trial_ends_at).toLocaleDateString() : 'N/A'}</div>
                   </div>
                 </div>
               </div>

               <div className="border-t pt-4">
                 <h4 className="font-semibold mb-2">Performance</h4>
                 <div className="grid grid-cols-3 gap-4">
                   <div className="text-center p-3 bg-gray-50 rounded">
                     <div className="text-2xl font-bold">{selectedMerchant.total_orders || 0}</div>
                     <div className="text-sm text-gray-500">Total Orders</div>
                   </div>
                   <div className="text-center p-3 bg-gray-50 rounded">
                     <div className="text-2xl font-bold">${(selectedMerchant.total_revenue || 0).toFixed(0)}</div>
                     <div className="text-sm text-gray-500">Total Revenue</div>
                   </div>
                   <div className="text-center p-3 bg-gray-50 rounded">
                     <div className="text-2xl font-bold">
                       {selectedMerchant.total_orders > 0
                         ? `$${(selectedMerchant.total_revenue / selectedMerchant.total_orders).toFixed(2)}`
                         : '$0'}
                     </div>
                     <div className="text-sm text-gray-500">Avg Order Value</div>
                   </div>
                 </div>
               </div>

               {/* Status Management */}
               <div className="border-t pt-4">
                 <div className="flex items-center gap-2 mb-3">
                   <Shield className="w-4 h-4" />
                   <h4 className="font-semibold">Status Management</h4>
                 </div>
                 <div className="space-y-3">
                   <Select 
                     value={selectedMerchant.status} 
                     onValueChange={(newStatus) => handleStatusChange(selectedMerchant, newStatus)}
                   >
                     <SelectTrigger className="w-full">
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="inactive">Inactive</SelectItem>
                       <SelectItem value="trial">Trial</SelectItem>
                       <SelectItem value="active">Active</SelectItem>
                       <SelectItem value="suspended">Suspended</SelectItem>
                       <SelectItem value="cancelled">Cancelled</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
               </div>

               {/* Subscription Management */}
               <div className="border-t pt-4">
                 <div className="flex items-center gap-2 mb-3">
                   <CreditCard className="w-4 h-4" />
                   <h4 className="font-semibold">Subscription Management</h4>
                 </div>
                 <div className="space-y-3">
                   <Select 
                     value={selectedMerchant.subscription_plan} 
                     onValueChange={(newPlan) => {
                       const updatedMerchant = { ...selectedMerchant, subscription_plan: newPlan };
                       handleSubscriptionChange(selectedMerchant, newPlan);
                     }}
                   >
                     <SelectTrigger className="w-full">
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="free">Free - $0/mo</SelectItem>
                       <SelectItem value="basic">Basic - $49/mo</SelectItem>
                       <SelectItem value="pro">Pro - $99/mo</SelectItem>
                       <SelectItem value="enterprise">Enterprise - $299/mo</SelectItem>
                     </SelectContent>
                   </Select>
                   <Alert className="bg-blue-50 border-blue-200">
                     <AlertCircle className="h-4 w-4 text-blue-600" />
                     <AlertDescription className="text-blue-800 text-sm">
                       Changing the plan generates an invoice for merchant approval.
                     </AlertDescription>
                   </Alert>
                 </div>
               </div>

               {/* cLINK Vault Access */}
               <div className="border-t pt-4">
                 <div className="flex items-center gap-2 mb-3">
                   <Vault className="w-4 h-4" />
                   <h4 className="font-semibold">cLINK Vault Access</h4>
                 </div>
                 <div className="flex gap-2">
                   <Button
                     variant={vaultSettings?.vault_enabled ? "default" : "outline"}
                     onClick={() => handleToggleVault(selectedMerchant, true)}
                     className="flex-1"
                   >
                     Enable Vault
                   </Button>
                   <Button
                     variant={vaultSettings?.vault_enabled ? "outline" : "destructive"}
                     onClick={() => handleToggleVault(selectedMerchant, false)}
                     className="flex-1"
                   >
                     Disable Vault
                   </Button>
                 </div>
                 <p className="text-xs text-gray-500 mt-2">
                   Status: {vaultSettings?.vault_enabled ? '✓ Enabled' : '✗ Disabled'}
                 </p>
               </div>

               {/* DEMO Account Toggle */}
               <div className="border-t pt-4">
                 <div className="flex items-center gap-2 mb-3">
                   <Sparkles className="w-4 h-4" />
                   <h4 className="font-semibold">DEMO Account</h4>
                 </div>
                 <div className="flex gap-2">
                   <Button
                     variant={selectedMerchant.is_demo ? "default" : "outline"}
                     onClick={() => handleToggleDemo(selectedMerchant)}
                     className={`flex-1 ${selectedMerchant.is_demo ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
                   >
                     {selectedMerchant.is_demo ? 'DEMO Enabled' : 'Mark as DEMO'}
                   </Button>
                 </div>
                 <p className="text-xs text-gray-500 mt-2">
                   Status: {selectedMerchant.is_demo ? '✓ DEMO - Full access, no fees' : '✗ Regular merchant'}
                 </p>
                 <Alert className="bg-purple-50 border-purple-200 mt-3">
                   <Sparkles className="h-4 w-4 text-purple-600" />
                   <AlertDescription className="text-purple-800 text-sm">
                     DEMO accounts have unrestricted access to all features with no subscription fees or transaction costs.
                   </AlertDescription>
                 </Alert>
               </div>

               <div className="flex gap-2 justify-end pt-4 border-t">
                 <Button variant="outline" onClick={() => handleImpersonate(selectedMerchant)}>
                   <Eye className="w-4 h-4 mr-2" />
                   Impersonate
                 </Button>
                 <Button variant="outline" onClick={() => setShowDetails(false)}>
                   Close
                 </Button>
               </div>
             </div>
           </DialogContent>
         </Dialog>
       )}

      {/* Subdomain Manager in Details Dialog */}
      {selectedMerchant && showDetails && (
        <div className="mt-4">
          <SubdomainManager merchant={selectedMerchant} onUpdate={loadMerchants} />
        </div>
      )}

      {/* Add Merchant Dialog */}
      <Dialog open={showAddMerchant} onOpenChange={setShowAddMerchant}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Merchant</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="business_name">Business Name *</Label>
                <Input
                  id="business_name"
                  value={newMerchant.business_name}
                  onChange={(e) => setNewMerchant({ ...newMerchant, business_name: e.target.value })}
                  placeholder="ABC Restaurant"
                  required
                />
              </div>

              <div>
                <Label htmlFor="display_name">Display Name</Label>
                <Input
                  id="display_name"
                  value={newMerchant.display_name}
                  onChange={(e) => setNewMerchant({ ...newMerchant, display_name: e.target.value })}
                  placeholder="Leave blank to use business name"
                />
              </div>

              <div>
                <Label htmlFor="owner_name">Owner Name *</Label>
                <Input
                  id="owner_name"
                  value={newMerchant.owner_name}
                  onChange={(e) => setNewMerchant({ ...newMerchant, owner_name: e.target.value })}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <Label htmlFor="owner_email">Owner Email *</Label>
                <Input
                  id="owner_email"
                  type="email"
                  value={newMerchant.owner_email}
                  onChange={(e) => setNewMerchant({ ...newMerchant, owner_email: e.target.value })}
                  placeholder="owner@business.com"
                  required
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={newMerchant.phone}
                  onChange={(e) => setNewMerchant({ ...newMerchant, phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div>
                <Label htmlFor="tax_id">Tax ID / EIN</Label>
                <Input
                  id="tax_id"
                  value={newMerchant.tax_id}
                  onChange={(e) => setNewMerchant({ ...newMerchant, tax_id: e.target.value })}
                  placeholder="12-3456789"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="address">Business Address</Label>
              <Input
                id="address"
                value={newMerchant.address}
                onChange={(e) => setNewMerchant({ ...newMerchant, address: e.target.value })}
                placeholder="123 Main St, City, State 12345"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="subscription_plan">Initial Subscription Plan</Label>
                <Select
                  value={newMerchant.subscription_plan}
                  onValueChange={(value) => setNewMerchant({ ...newMerchant, subscription_plan: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free - $0/mo</SelectItem>
                    <SelectItem value="basic">Basic - $49/mo</SelectItem>
                    <SelectItem value="pro">Pro - $99/mo</SelectItem>
                    <SelectItem value="enterprise">Enterprise - $299/mo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status">Initial Status</Label>
                <Select
                  value={newMerchant.status}
                  onValueChange={(value) => setNewMerchant({ ...newMerchant, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inactive">Inactive (Awaiting Activation)</SelectItem>
                    <SelectItem value="trial">Trial (14 days)</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Note:</strong> After creating the merchant, they will need to register an account 
                using the owner email address to access the system. They will start with a 14-day trial period
                (unless status is set to Active).
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAddMerchant(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMerchant}>
              Create Merchant
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}