import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { FileText, CheckCircle, AlertCircle } from 'lucide-react';

export default function MerchantOnboarding({ dealerId, onMerchantCreated }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    business_name: '',
    owner_name: '',
    owner_email: '',
    contact_email: '',
    phone: '',
    address: '',
    tax_id: '',
    subscription_plan: 'free'
  });

  const handleCreateMerchant = async () => {
    if (!formData.business_name || !formData.owner_email) {
      alert('Please fill in required fields');
      return;
    }

    try {
      setLoading(true);
      const newMerchant = await base44.entities.Merchant.create({
        dealer_id: dealerId,
        business_name: formData.business_name,
        owner_name: formData.owner_name,
        owner_email: formData.owner_email,
        contact_email: formData.contact_email || formData.owner_email,
        phone: formData.phone,
        address: formData.address,
        tax_id: formData.tax_id,
        subscription_plan: formData.subscription_plan,
        status: 'inactive',
        onboarding_completed: false
      });

      setStep(3);
      setTimeout(() => {
        setOpen(false);
        setStep(1);
        setFormData({
          business_name: '',
          owner_name: '',
          owner_email: '',
          contact_email: '',
          phone: '',
          address: '',
          tax_id: '',
          subscription_plan: 'free'
        });
        onMerchantCreated?.();
      }, 2000);
    } catch (error) {
      alert('Error creating merchant: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <FileText className="w-4 h-4" />
          Onboard New Merchant
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Onboard New Merchant</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">Welcome to Merchant Onboarding</p>
                <p>Complete the merchant profile to get started. You can edit details later.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1">Business Name *</label>
                <Input
                  value={formData.business_name}
                  onChange={(e) => setFormData({...formData, business_name: e.target.value})}
                  placeholder="ABC Restaurant"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Owner Name</label>
                  <Input
                    value={formData.owner_name}
                    onChange={(e) => setFormData({...formData, owner_name: e.target.value})}
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Phone</label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">Owner Email *</label>
                <Input
                  type="email"
                  value={formData.owner_email}
                  onChange={(e) => setFormData({...formData, owner_email: e.target.value})}
                  placeholder="owner@business.com"
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">Contact Email</label>
                <Input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
                  placeholder="contact@business.com"
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">Address</label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  placeholder="123 Main St, City, State 12345"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Tax ID</label>
                  <Input
                    value={formData.tax_id}
                    onChange={(e) => setFormData({...formData, tax_id: e.target.value})}
                    placeholder="XX-XXXXXXX"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Plan</label>
                  <Select value={formData.subscription_plan} onValueChange={(value) => setFormData({...formData, subscription_plan: value})}>
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
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => setStep(2)}>Review Details</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Review Merchant Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-600">Business Name</p>
                    <p className="font-medium">{formData.business_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Owner</p>
                    <p className="font-medium">{formData.owner_name || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Email</p>
                    <p className="font-medium">{formData.owner_email}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Phone</p>
                    <p className="font-medium">{formData.phone || 'Not set'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-600">Address</p>
                    <p className="font-medium">{formData.address || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Plan</p>
                    <p className="font-medium capitalize">{formData.subscription_plan}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="bg-amber-50 p-4 rounded-lg flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900">
                <p className="font-medium mb-1">Next Steps</p>
                <p>After creation, the merchant will need to complete their onboarding and activate their account.</p>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={handleCreateMerchant} disabled={loading}>{loading ? 'Creating...' : 'Create Merchant'}</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">Merchant Created!</p>
              <p className="text-sm text-gray-600 mt-1">{formData.business_name} has been successfully added.</p>
              <p className="text-xs text-gray-500 mt-2">An invitation will be sent to {formData.owner_email}</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}