import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, Plus, Trash2, Check } from 'lucide-react';

export default function PayoutMethodSettings({ dealer, onUpdate }) {
  const [methods, setMethods] = useState(dealer?.payout_methods || []);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState(null);
  const [formData, setFormData] = useState({
    type: 'stripe_connect',
    account_holder: '',
    account_number: '',
    routing_number: '',
    wallet_address: '',
    is_primary: false
  });

  const methodTypes = {
    stripe_connect: { label: 'Stripe Connect', icon: '💳' },
    bank_transfer: { label: 'Bank Transfer (ACH)', icon: '🏦' },
    solana: { label: 'Solana Wallet', icon: '◎' }
  };

  const handleAddMethod = () => {
    setEditingMethod(null);
    setFormData({
      type: 'stripe_connect',
      account_holder: '',
      account_number: '',
      routing_number: '',
      wallet_address: '',
      is_primary: false
    });
    setDialogOpen(true);
  };

  const handleEditMethod = (method) => {
    setEditingMethod(method);
    setFormData(method);
    setDialogOpen(true);
  };

  const handleSaveMethod = async () => {
    try {
      setLoading(true);

      // Validate required fields based on type
      if (formData.type === 'bank_transfer' && (!formData.account_holder || !formData.account_number || !formData.routing_number)) {
        alert('Please fill in all bank details');
        return;
      }

      if (formData.type === 'solana' && !formData.wallet_address) {
        alert('Please enter a Solana wallet address');
        return;
      }

      let updatedMethods = [...methods];
      if (editingMethod) {
        updatedMethods = updatedMethods.map(m => m.id === editingMethod.id ? formData : m);
      } else {
        updatedMethods.push({ ...formData, id: Date.now().toString() });
      }

      // If setting as primary, unset others
      if (formData.is_primary) {
        updatedMethods = updatedMethods.map(m => ({ ...m, is_primary: m.id === (formData.id || formData.id) }));
      }

      await base44.entities.Dealer.update(dealer.id, {
        payout_methods: updatedMethods
      });

      setMethods(updatedMethods);
      setDialogOpen(false);
      onUpdate?.();
    } catch (error) {
      console.error('Error saving payout method:', error);
      alert('Failed to save payout method');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMethod = async (methodId) => {
    if (!confirm('Delete this payout method?')) return;

    try {
      const updatedMethods = methods.filter(m => m.id !== methodId);
      await base44.entities.Dealer.update(dealer.id, {
        payout_methods: updatedMethods
      });
      setMethods(updatedMethods);
      onUpdate?.();
    } catch (error) {
      console.error('Error deleting method:', error);
      alert('Failed to delete payout method');
    }
  };

  return (
    <div className="space-y-6">
      {/* Active Methods */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Payout Methods</CardTitle>
              <CardDescription>Configure where and how you receive payouts</CardDescription>
            </div>
            <Button onClick={handleAddMethod} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Method
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {methods.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No payout methods configured. Add a method to receive payouts.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {methods.map((method) => (
                <div
                  key={method.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-gray-50 dark:bg-gray-800/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-2xl">{methodTypes[method.type]?.icon}</div>
                    <div>
                      <div className="font-semibold">{methodTypes[method.type]?.label}</div>
                      <div className="text-xs text-gray-500">
                        {method.type === 'bank_transfer' && `•••• ${method.account_number?.slice(-4)}`}
                        {method.type === 'solana' && method.wallet_address?.slice(0, 8) + '...'}
                        {method.type === 'stripe_connect' && 'Connected via Stripe'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {method.is_primary && (
                      <Badge variant="default" className="bg-green-600">
                        <Check className="w-3 h-3 mr-1" />
                        Primary
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditMethod(method)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteMethod(method.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Method Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingMethod ? 'Edit Payout Method' : 'Add Payout Method'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Payment Method Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
                disabled={!!editingMethod}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stripe_connect">Stripe Connect (Credit)</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer (ACH)</SelectItem>
                  <SelectItem value="solana">Solana Wallet</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.type === 'bank_transfer' && (
              <>
                <div>
                  <Label>Account Holder Name</Label>
                  <Input
                    value={formData.account_holder}
                    onChange={(e) => setFormData({ ...formData, account_holder: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <Label>Account Number</Label>
                  <Input
                    value={formData.account_number}
                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                    placeholder="••••••••••••1234"
                    type="password"
                  />
                </div>
                <div>
                  <Label>Routing Number</Label>
                  <Input
                    value={formData.routing_number}
                    onChange={(e) => setFormData({ ...formData, routing_number: e.target.value })}
                    placeholder="••••••••"
                    type="password"
                  />
                </div>
              </>
            )}

            {formData.type === 'solana' && (
              <div>
                <Label>Solana Wallet Address</Label>
                <Input
                  value={formData.wallet_address}
                  onChange={(e) => setFormData({ ...formData, wallet_address: e.target.value })}
                  placeholder="9B5X..."
                />
              </div>
            )}

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_primary}
                onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm">Set as primary payout method</span>
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveMethod} disabled={loading}>
              {loading ? 'Saving...' : 'Save Method'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}