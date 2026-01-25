import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Search, LogIn, AlertCircle } from 'lucide-react';

export default function MerchantManagement({ dealerId }) {
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [impersonatingId, setImpersonatingId] = useState(null);
  const [suspendingId, setSuspendingId] = useState(null);
  const [formData, setFormData] = useState({ business_name: '', owner_email: '', contact_email: '' });

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
        business_name: formData.business_name,
        owner_email: formData.owner_email,
        contact_email: formData.contact_email || formData.owner_email,
        status: 'inactive',
        subscription_plan: 'free'
      });
      setFormData({ business_name: '', owner_email: '', contact_email: '' });
      setShowCreateDialog(false);
      loadMerchants();
    } catch (error) {
      alert('Error creating merchant: ' + error.message);
    }
  };

  const handleSuspendMerchant = async (merchantId, newStatus) => {
    try {
      await base44.entities.Merchant.update(merchantId, { status: newStatus });
      loadMerchants();
    } catch (error) {
      alert('Error updating merchant: ' + error.message);
    }
  };

  const handleImpersonate = async (merchantId) => {
    try {
      const merchant = merchants.find(m => m.id === merchantId);
      localStorage.setItem('impersonatedMerchantId', merchantId);
      localStorage.setItem('impersonatedMerchantName', merchant.business_name);
      window.location.href = '/';
    } catch (error) {
      alert('Error impersonating merchant: ' + error.message);
    }
  };

  const filteredMerchants = merchants.filter(m => 
    m.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.owner_email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="text-center py-8">Loading merchants...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search merchants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" />Add Merchant</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Merchant</DialogTitle>
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
              <Button onClick={handleCreateMerchant} className="w-full">Create Merchant</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {filteredMerchants.map(merchant => (
          <Card key={merchant.id}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{merchant.business_name}</CardTitle>
                  <CardDescription>{merchant.owner_email}</CardDescription>
                </div>
                <Badge variant={merchant.status === 'active' ? 'default' : merchant.status === 'suspended' ? 'destructive' : 'secondary'}>
                  {merchant.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setImpersonatingId(merchant.id)}
                  className="gap-2"
                  disabled={merchant.status !== 'active'}
                >
                  <LogIn className="w-4 h-4" />
                  Impersonate
                </Button>
                {merchant.status === 'active' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSuspendingId(merchant.id)}
                    className="text-red-600 border-red-200"
                  >
                    Suspend
                  </Button>
                )}
                {merchant.status === 'suspended' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSuspendMerchant(merchant.id, 'active')}
                  >
                    Reactivate
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {impersonatingId && (
        <AlertDialog open={!!impersonatingId} onOpenChange={() => setImpersonatingId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex gap-2">
                <AlertCircle className="w-5 h-5 text-orange-500" />
                Impersonate Merchant
              </AlertDialogTitle>
              <AlertDialogDescription>
                You're about to impersonate {merchants.find(m => m.id === impersonatingId)?.business_name}. You'll have full access to their account.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-3">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleImpersonate(impersonatingId)} className="bg-orange-600">
                Proceed
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {suspendingId && (
        <AlertDialog open={!!suspendingId} onOpenChange={() => setSuspendingId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Suspend Merchant</AlertDialogTitle>
              <AlertDialogDescription>
                Suspending {merchants.find(m => m.id === suspendingId)?.business_name} will prevent them from processing transactions.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-3">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleSuspendMerchant(suspendingId, 'suspended')} className="bg-red-600">
                Suspend
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}