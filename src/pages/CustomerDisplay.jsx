import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function CustomerDisplay() {
  const [merchant, setMerchant] = useState(null);
  const [station, setStation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function initDisplay() {
      try {
        setLoading(true);
        const params = new URLSearchParams(window.location.search);
        
        // Extract parameters with fallbacks
        const merchantId = params.get('merchant_id') || params.get('merchantId');
        const stationId = params.get('station_id') || params.get('stationId');

        if (!merchantId) {
          throw new Error('Missing Merchant ID in URL parameter');
        }

        // Fetch merchant using service role / unauthenticated fallback to bypass RLS
        let merchantData;
        try {
          merchantData = await base44.asServiceRole().entities.Merchant.get(merchantId);
        } catch {
          merchantData = await base44.entities.Merchant.get(merchantId);
        }

        if (!merchantData) {
          throw new Error('Merchant record not found');
        }

        setMerchant(merchantData);
        setStation(stationId || 'counter');
      } catch (err) {
        console.error('Customer Display initialization error:', err);
        setError(err.message || 'Failed to initialize customer display');
      } finally {
        setLoading(false);
      }
    }

    initDisplay();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <p className="text-lg font-medium text-muted-foreground animate-pulse">
          Initializing Customer Display...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background p-6 text-center">
        <h2 className="text-xl font-bold text-destructive mb-2">Display Initialization Error</h2>
        <p className="text-sm text-muted-foreground max-w-md mb-4">{error}</p>
        <p className="text-xs text-slate-400 font-mono">
          URL: {window.location.search}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background p-8">
      <header className="border-b pb-4 mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">{merchant?.business_name || 'Welcome'}</h1>
        <span className="text-sm text-muted-foreground capitalize">Station: {station}</span>
      </header>
      
      {/* Customer Display Content / Active Order Stream */}
      <div className="flex-1 flex items-center justify-center">
        <p className="text-xl text-muted-foreground">Welcome! Ready for next customer.</p>
      </div>
    </div>
  );
}