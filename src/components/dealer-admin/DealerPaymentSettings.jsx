import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, AlertCircle } from 'lucide-react';

export default function DealerPaymentSettings({ dealerId }) {
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMerchantPaymentData();
  }, [dealerId]);

  const loadMerchantPaymentData = async () => {
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

  if (loading) return <div className="text-center py-8">Loading...</div>;

  const merchantsWithPayments = merchants.filter(m => m.settings?.payment_gateways);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Payment Gateway Status</CardTitle>
          <CardDescription>Monitor payment methods across merchants</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {merchants.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No merchants</div>
            ) : (
              merchants.map(merchant => {
                const gateways = merchant.settings?.payment_gateways || {};
                const activeGateways = Object.keys(gateways).filter(
                  key => gateways[key]?.enabled
                );

                return (
                  <Card key={merchant.id} className="border">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div>
                          <h3 className="font-semibold">{merchant.business_name}</h3>
                          <p className="text-sm text-gray-600">{merchant.owner_email}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium mb-2">Active Payment Methods:</p>
                          <div className="flex flex-wrap gap-2">
                            {activeGateways.length === 0 ? (
                              <Badge variant="outline">No gateways configured</Badge>
                            ) : (
                              activeGateways.map(gateway => (
                                <Badge key={gateway} variant="default">
                                  {gateway.toUpperCase()}
                                </Badge>
                              ))
                            )}
                          </div>
                        </div>
                        {merchant.settings?.solana_pay?.enabled && (
                          <div className="flex gap-2 items-start text-sm">
                            <CreditCard className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium">Solana Pay Enabled</p>
                              <p className="text-gray-600">Network: {merchant.settings.solana_pay.network}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}