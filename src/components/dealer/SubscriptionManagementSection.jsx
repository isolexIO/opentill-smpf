import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, AlertCircle } from 'lucide-react';

export default function SubscriptionManagementSection({ merchant, isAdmin, onUpdate }) {
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(merchant?.subscription_plan || 'free');
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [invoice, setInvoice] = useState(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const data = await base44.entities.SubscriptionPlan.filter({});
      setPlans(data || []);
    } catch (error) {
      console.error('Error loading plans:', error);
    }
  };

  const handleGenerateInvoice = async () => {
    if (selectedPlan === merchant.subscription_plan) {
      alert('Please select a different plan');
      return;
    }

    try {
      setInvoiceLoading(true);
      const response = await base44.functions.invoke('generateSubscriptionInvoice', {
        merchantId: merchant.id,
        newPlan: selectedPlan,
        currentPlan: merchant.subscription_plan
      });

      if (response.data.success) {
        setInvoice(response.data.invoice);
        setShowConfirm(true);
      } else {
        alert('Error generating invoice: ' + response.data.error);
      }
    } catch (error) {
      alert('Failed to generate invoice: ' + error.message);
    } finally {
      setInvoiceLoading(false);
    }
  };

  const handleApproveInvoice = async () => {
    try {
      setLoading(true);
      // Update merchant subscription
      await base44.entities.Merchant.update(merchant.id, {
        subscription_plan: selectedPlan,
        subscription_next_due: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });

      // Send approval email
      await base44.functions.invoke('sendEmail', {
        to: merchant.owner_email,
        subject: `Subscription Updated - ${merchant.business_name}`,
        body: `Your subscription has been updated to ${selectedPlan.toUpperCase()} plan.

Plan Details:
- From Plan: ${invoice.from_plan}
- New Plan: ${invoice.to_plan}
- Monthly Cost: $${invoice.monthly_amount}
- Invoice #: ${invoice.invoice_number}

This change will take effect immediately.

Best regards,
ChainLINK Support`
      });

      setInvoice(null);
      setShowConfirm(false);
      onUpdate?.();
    } catch (error) {
      alert('Error approving subscription: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  const currentPlan = plans.find(p => p.plan_id === merchant.subscription_plan);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Subscription Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium">Current Plan</label>
          <p className="text-lg font-semibold mt-1">
            <Badge variant="default">{merchant.subscription_plan}</Badge>
          </p>
          {currentPlan && (
            <p className="text-xs text-gray-600 mt-1">
              ${currentPlan.price_monthly}/month
            </p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium">Change Plan To</label>
          <Select value={selectedPlan} onValueChange={setSelectedPlan}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {plans.map(plan => (
                <SelectItem key={plan.plan_id} value={plan.plan_id}>
                  {plan.name} - ${plan.price_monthly}/month
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {invoice && (
          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 text-sm">
              Invoice {invoice.invoice_number} generated. Ready for approval.
            </AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handleGenerateInvoice}
          disabled={loading || invoiceLoading || selectedPlan === merchant.subscription_plan}
          className="w-full"
        >
          {invoiceLoading ? 'Generating Invoice...' : 'Generate Invoice & Preview'}
        </Button>
      </CardContent>

      {invoice && (
        <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Approve Subscription Change</AlertDialogTitle>
              <AlertDialogDescription>
                <div className="space-y-3 mt-4">
                  <div>
                    <p className="text-xs text-gray-600">From Plan</p>
                    <p className="font-semibold">{invoice.from_plan}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">To Plan</p>
                    <p className="font-semibold">{invoice.to_plan}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Monthly Amount</p>
                    <p className="font-semibold">${invoice.monthly_amount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Invoice #</p>
                    <p className="font-semibold">{invoice.invoice_number}</p>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-3">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleApproveInvoice} disabled={loading}>
                {loading ? 'Approving...' : 'Approve & Send to Merchant'}
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </Card>
  );
}