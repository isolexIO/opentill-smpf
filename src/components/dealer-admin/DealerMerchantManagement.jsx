import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Eye, MoreVertical, AlertCircle, Mail, Copy, Check } from 'lucide-react';

export default function DealerMerchantManagement({ dealerId }) {
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [impersonatingId, setImpersonatingId] = useState(null);
  const [suspendingId, setSuspendingId] = useState(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [formData, setFormData] = useState({
    business_name: '',
    owner_email: '',
    contact_email: '',
    subscription_plan: 'free'
  });

  useEffect(() => {
    loadMerchants();
  }, [dealerId]);

  const loadMerchants = async () => {
    try {
      setLoading(true);
      const data = await base44.entities.Merchant.filter({ dealer_id: dealerId });
      setMerchants(data || []);
    } catch (error) {
      console.error('Error loading merchants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMerchant = async () => {
    if (!formData.business_name || !formData.owner_email) {
      alert('Please fill in required fields');
      return;
    }
    try {
      await base44.entities.Merchant.create({
        dealer_id: dealerId,
        ...formData,
        status: 'inactive'
      });
      setFormData({ business_name: '', owner_email: '', contact_email: '', subscription_plan: 'free' });
      setShowCreateDialog(false);
      loadMerchants();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleUpdateStatus = async (merchantId, newStatus) => {
    try {
      await base44.entities.Merchant.update(merchantId, { status: newStatus });
      loadMerchants();
      setSuspendingId(null);
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleImpersonate = (merchantId) => {
    try {
      const merchant = merchants.find(m => m.id === merchantId);
      localStorage.setItem('impersonatedMerchantId', merchantId);
      localStorage.setItem('impersonatedMerchantName', merchant.business_name);
      window.location.href = createPageUrl('POS');
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleSendInvite = async () => {
    if (!inviteEmail) {
      alert('Please enter an email address');
      return;
    }

    try {
      const inviteLink = `${window.location.origin}${createPageUrl('MerchantOnboarding')}?dealer_id=${dealerId}`;
      
      await base44.functions.invoke('sendEmail', {
        to: inviteEmail,
        subject: 'Join Our Network - ChainLINK POS',
        body: `Hi,

You're invited to sign up for ChainLINK POS and join our merchant network.

Click the link below to get started:
${inviteLink}

This link will automatically associate your account with our network.

Best regards,
ChainLINK POS Team`
      });

      alert('Invitation sent successfully!');
      setInviteEmail('');
      setShowInviteDialog(false);
    } catch (error) {
      alert('Failed to send invitation: ' + error.message);
    }
  };

  const handleCopyLink = () => {
    const inviteLink = `${window.location.origin}${createPageUrl('MerchantOnboarding')}?dealer_id=${dealerId}`;
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const filteredMerchants = merchants.filter(m => {
    const matchesSearch = m.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.owner_email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || m.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) return <div className="text-center py-8">Loading merchants...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Merchant Management</CardTitle>
              <CardDescription>Manage all merchants under your dealership</CardDescription>
            </div>
            <div className="flex gap-2">
              <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2"><Mail className="w-4 h-4" />Send Invite</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite a Merchant</DialogTitle>
                    <DialogDescription>
                      Send an invitation link to a merchant so they can sign up under your account
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Merchant Email</label>
                      <Input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="merchant@example.com"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Or share this link directly:</label>
                      <div className="flex gap-2">
                        <Input
                          readOnly
                          value={`${window.location.origin}${createPageUrl('MerchantOnboarding')}?dealer_id=${dealerId}`}
                          className="text-xs"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCopyLink}
                          className="gap-2"
                        >
                          {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setShowInviteDialog(false)}>Cancel</Button>
                      <Button onClick={handleSendInvite}>Send Invite</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button className="gap-2"><Plus className="w-4 h-4" />New Merchant</Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Merchant</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Business Name *</label>
                    <Input
                      value={formData.business_name}
                      onChange={(e) => setFormData({...formData, business_name: e.target.value})}
                      placeholder="Business name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Owner Email *</label>
                    <Input
                      type="email"
                      value={formData.owner_email}
                      onChange={(e) => setFormData({...formData, owner_email: e.target.value})}
                      placeholder="owner@example.com"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Contact Email</label>
                    <Input
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
                      placeholder="contact@example.com"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Plan</label>
                    <Select value={formData.subscription_plan} onValueChange={(value) => setFormData({...formData, subscription_plan: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="basic">Basic</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleCreateMerchant} className="w-full">Create</Button>
                </div>
                </DialogContent>
                </Dialog>
                </div>
                </div>
                </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4 flex-col sm:flex-row">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search merchants..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              {filteredMerchants.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {merchants.length === 0 ? 'No merchants yet' : 'No merchants match your search'}
                </div>
              ) : (
                filteredMerchants.map(merchant => (
                  <Card key={merchant.id} className="border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex-1 min-w-64">
                          <h3 className="font-semibold">{merchant.business_name}</h3>
                          <p className="text-sm text-gray-600">{merchant.owner_email}</p>
                          <div className="flex gap-2 mt-2">
                            <Badge variant={merchant.status === 'active' ? 'default' : 'secondary'}>
                              {merchant.status}
                            </Badge>
                            <Badge variant="outline">{merchant.subscription_plan}</Badge>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setImpersonatingId(merchant.id)}
                            disabled={merchant.status !== 'active'}
                            className="gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </Button>
                          {merchant.status === 'active' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSuspendingId(merchant.id)}
                              className="text-red-600"
                            >
                              Suspend
                            </Button>
                          )}
                          {merchant.status === 'suspended' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateStatus(merchant.id, 'active')}
                            >
                              Reactivate
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {impersonatingId && (
        <AlertDialog open={!!impersonatingId} onOpenChange={() => setImpersonatingId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex gap-2">
                <AlertCircle className="w-5 h-5 text-orange-500" />
                View as Merchant
              </AlertDialogTitle>
              <AlertDialogDescription>
                You'll be logged in as {merchants.find(m => m.id === impersonatingId)?.business_name}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-3">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleImpersonate(impersonatingId)} className="bg-orange-600">
                Continue
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {suspendingId && (
        <AlertDialog open={!!suspendingId} onOpenChange={() => setSuspendingId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Suspend Merchant?</AlertDialogTitle>
              <AlertDialogDescription>
                {merchants.find(m => m.id === suspendingId)?.business_name} won't be able to process orders.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-3">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleUpdateStatus(suspendingId, 'suspended')} className="bg-red-600">
                Suspend
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}