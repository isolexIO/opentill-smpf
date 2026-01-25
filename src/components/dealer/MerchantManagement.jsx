import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Search, LogIn, AlertCircle, Info, Eye } from 'lucide-react';
import MerchantOnboarding from './MerchantOnboarding';
import MerchantDetailsModal from './MerchantDetailsModal';

export default function MerchantManagement({ dealerId }) {
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [impersonatingId, setImpersonatingId] = useState(null);
  const [suspendingId, setSuspendingId] = useState(null);
  const [selectedMerchant, setSelectedMerchant] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

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
        <MerchantOnboarding dealerId={dealerId} onMerchantCreated={loadMerchants} />
      </div>

      <div className="grid gap-4">
        {filteredMerchants.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600 mb-4">No merchants found</p>
              <MerchantOnboarding dealerId={dealerId} onMerchantCreated={loadMerchants} />
            </CardContent>
          </Card>
        ) : (
          filteredMerchants.map(merchant => (
            <Card key={merchant.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{merchant.business_name}</CardTitle>
                    <CardDescription className="text-sm mt-1">{merchant.owner_email}</CardDescription>
                    {merchant.address && <CardDescription className="text-xs mt-0.5">{merchant.address}</CardDescription>}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={merchant.status === 'active' ? 'default' : merchant.status === 'suspended' ? 'destructive' : 'secondary'}>
                      {merchant.status}
                    </Badge>
                    <Badge variant="outline" className="text-xs capitalize">
                      {merchant.subscription_plan}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                  <div>
                    <p className="text-gray-600">Revenue</p>
                    <p className="font-semibold">${(merchant.total_revenue || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Orders</p>
                    <p className="font-semibold">{merchant.total_orders || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Created</p>
                    <p className="font-semibold text-xs">{merchant.created_date ? new Date(merchant.created_date).toLocaleDateString() : 'N/A'}</p>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelectedMerchant(merchant);
                      setShowDetailsModal(true);
                    }}
                    className="gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Details
                  </Button>
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
          ))
        )}
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

      {selectedMerchant && (
        <MerchantDetailsModal
          merchant={selectedMerchant}
          open={showDetailsModal}
          onOpenChange={setShowDetailsModal}
          onUpdate={loadMerchants}
        />
      )}
    </div>
  );
}