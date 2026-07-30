import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import {
  Search,
  QrCode,
  LogOut,
  Coins,
  TrendingUp,
  ShoppingBag,
  Calendar,
  ArrowLeft,
  Loader2,
  Wallet,
} from 'lucide-react';
import QRCode from 'qrcode';

export default function CustomerPortal() {
  const [lookupValue, setLookupValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const { toast } = useToast();

  const handleLookup = async (e) => {
    e?.preventDefault();
    if (!lookupValue.trim()) return;
    setLoading(true);
    try {
      const isEmail = lookupValue.includes('@');
      const { data } = await base44.functions.invoke('getCustomerPortalData', {
        [isEmail ? 'email' : 'phone']: lookupValue.trim(),
      });
      if (data?.success && data.customer) {
        setCustomer(data.customer);
      } else {
        toast({ title: 'Not found', description: 'No account found with that ' + (isEmail ? 'email' : 'phone number'), variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Lookup failed', description: err.message || 'Please try again', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleShowQR = async () => {
    if (!customer) return;
    try {
      const payload = JSON.stringify({ customer_id: customer.id, merchant_id: customer.merchant_id, type: 'duc_payment' });
      const url = await QRCode.toDataURL(payload, { width: 280, margin: 1 });
      setQrDataUrl(url);
      setShowQR(true);
    } catch (err) {
      toast({ title: 'QR Error', description: 'Could not generate QR code', variant: 'destructive' });
    }
  };

  const handleSignOut = () => {
    setCustomer(null);
    setLookupValue('');
    setShowQR(false);
    setQrDataUrl('');
  };

  // QR payment view
  if (showQR && customer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex flex-col items-center justify-center p-6 text-white">
        <button onClick={() => setShowQR(false)} className="absolute top-4 left-4 flex items-center gap-1 text-white/80 hover:text-white">
          <ArrowLeft className="w-5 h-5" /> Back
        </button>
        <h2 className="text-xl font-bold mb-1">Pay with $DUC</h2>
        <p className="text-sm text-white/70 mb-6">Show this QR code to the cashier</p>
        <div className="bg-white rounded-2xl p-4 shadow-xl">
          {qrDataUrl && <img src={qrDataUrl} alt="Payment QR" className="w-64 h-64" />}
        </div>
        <div className="mt-6 text-center">
          <p className="text-sm text-white/70">Available Balance</p>
          <p className="text-3xl font-bold">{customer.duc_balance.toFixed(2)} $DUC</p>
          <p className="text-xs text-white/50 mt-2">{customer.name}</p>
        </div>
      </div>
    );
  }

  // Customer dashboard
  if (customer) {
    const stats = [
      { label: 'Loyalty Points', value: customer.loyalty_points.toLocaleString(), icon: Coins, color: 'text-amber-600 bg-amber-50' },
      { label: '$DUC Balance', value: customer.duc_balance.toFixed(2), icon: Wallet, color: 'text-purple-600 bg-purple-50' },
      { label: 'Total Spent', value: `$${customer.total_spent.toFixed(2)}`, icon: TrendingUp, color: 'text-green-600 bg-green-50' },
      { label: 'Visits', value: customer.visit_count.toLocaleString(), icon: Calendar, color: 'text-blue-600 bg-blue-50' },
    ];

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-br from-blue-600 to-purple-600 text-white px-6 py-6">
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-xl font-bold">My Rewards</h1>
                <p className="text-sm text-white/70">{customer.merchant_name}</p>
              </div>
              <button onClick={handleSignOut} className="flex items-center gap-1 text-sm text-white/80 hover:text-white">
                <LogOut className="w-4 h-4" /> Exit
              </button>
            </div>
            <div className="bg-white/15 backdrop-blur rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-white/70">Welcome back,</p>
                <p className="font-semibold">{customer.name}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-md mx-auto px-4 py-6 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            {stats.map(({ label, value, icon: Icon, color }) => (
              <Card key={label}>
                <CardContent className="p-4">
                  <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center mb-2`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <p className="text-xs text-gray-500 font-medium">{label}</p>
                  <p className="text-lg font-bold text-gray-900">{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Lifetime $DUC earned */}
          {customer.duc_lifetime_earned > 0 && (
            <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
              <CardContent className="p-4 flex items-center gap-3">
                <Coins className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Lifetime $DUC Earned</p>
                  <p className="text-lg font-bold text-purple-700">{customer.duc_lifetime_earned.toFixed(2)} $DUC</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pay with $DUC */}
          <Button
            size="lg"
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:opacity-90"
            onClick={handleShowQR}
            disabled={customer.duc_balance <= 0}
          >
            <QrCode className="w-5 h-5 mr-2" />
            {customer.duc_balance > 0 ? 'Pay with $DUC (QR)' : 'No $DUC Available'}
          </Button>
          {customer.duc_balance <= 0 && (
            <p className="text-center text-xs text-gray-400">
              Earn $DUC by shopping — loyalty rewards are credited automatically after each purchase.
            </p>
          )}
        </div>
      </div>
    );
  }

  // Lookup screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="text-center text-white mb-8">
          <div className="w-16 h-16 bg-white/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Coins className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold mb-1">Customer Portal</h1>
          <p className="text-sm text-white/70">Track your loyalty rewards and $DUC balance</p>
        </div>

        <Card className="max-w-md">
          <CardContent className="p-6">
            <form onSubmit={handleLookup} className="space-y-4">
              <div>
                <Label htmlFor="lookup">Phone or Email</Label>
                <Input
                  id="lookup"
                  value={lookupValue}
                  onChange={(e) => setLookupValue(e.target.value)}
                  placeholder="(555) 123-4567 or you@email.com"
                  className="mt-1"
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading || !lookupValue.trim()}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                {loading ? 'Searching…' : 'Find My Account'}
              </Button>
            </form>
            <p className="text-xs text-gray-400 text-center mt-4">
              Enter the phone number or email associated with your rewards account.
            </p>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <a href={createPageUrl('Home')} className="text-sm text-white/60 hover:text-white">
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}