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
  ArrowRight,
  Loader2,
  Wallet,
  Lock,
  Receipt,
} from 'lucide-react';
import QRCode from 'qrcode';
import ICOLink from '@/components/vault/ICOLink';
import CustomerInlineWallet from '@/components/portal/CustomerInlineWallet';

const PORTAL_BG = 'https://media.base44.com/images/public/6970e2871534100b4ebb8d45/e5026a0a1_ChatGPTImageAug2202611_33_54AM.png';

export default function CustomerPortal() {
  const { toast } = useToast();

  // Flow: 'lookup' -> 'pin' or 'set_pin' -> 'dashboard'
  const [step, setStep] = useState('lookup');
  const [identifier, setIdentifier] = useState('');
  const [pin, setPin] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [showQR, setShowQR] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [registerName, setRegisterName] = useState('');

  const handleLookup = async (e) => {
    e?.preventDefault();
    if (!identifier.trim()) return;
    setLookupLoading(true);
    try {
      const { data } = await base44.functions.invoke('customerAuth', {
        action: 'lookup',
        identifier: identifier.trim(),
      });
      if (data?.success) {
        if (data.pin_set) {
          setStep('pin');
        } else if (data.verification_code_sent) {
          // OTP was emailed out-of-band by the server; the customer types it in.
          setVerificationCode('');
          setStep('set_pin');
        } else {
          toast({ title: 'Setup required', description: data?.error || 'Please contact your merchant.', variant: 'destructive' });
        }
      } else {
        if (data?.can_register) {
          setStep('register');
        } else {
          toast({ title: 'Not found', description: data?.error || 'No account found', variant: 'destructive' });
        }
      }
    } catch (err) {
      toast({ title: 'Lookup failed', description: err.message || 'Please try again', variant: 'destructive' });
    } finally {
      setLookupLoading(false);
    }
  };

  const handlePinSubmit = async (e) => {
    e?.preventDefault();
    if (!pin.trim()) return;
    setAuthLoading(true);
    try {
      const payload = {
        action: step === 'set_pin' ? 'set_pin' : 'login',
        identifier: identifier.trim(),
        pin: pin.trim(),
      };
      if (step === 'set_pin') {
        payload.verification_code = verificationCode;
      }
      const { data } = await base44.functions.invoke('customerAuth', payload);
      if (data?.success) {
        setCustomer(data.customer);
        setOrders(data.orders || []);
        setStep('dashboard');
        setPin('');
      } else {
        toast({ title: 'Authentication failed', description: data?.error || 'Please try again', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Login failed', description: err.message || 'Please try again', variant: 'destructive' });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e?.preventDefault();
    if (!identifier.trim() || !registerName.trim() || !pin.trim()) return;
    setAuthLoading(true);
    try {
      const { data } = await base44.functions.invoke('customerAuth', {
        action: 'register',
        identifier: identifier.trim(),
        name: registerName.trim(),
        pin: pin.trim(),
      });
      if (data?.success) {
        setCustomer(data.customer);
        setOrders(data.orders || []);
        setStep('dashboard');
        setPin('');
        setRegisterName('');
      } else {
        toast({ title: 'Registration failed', description: data?.error || 'Please try again', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Registration failed', description: err.message || 'Please try again', variant: 'destructive' });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleShowQR = async () => {
    if (!customer) return;
    try {
      const payload = JSON.stringify({ customer_id: customer.id, merchant_id: customer.merchant_id, type: 'duc_payment' });
      const url = await QRCode.toDataURL(payload, { width: 280, margin: 1 });
      setQrDataUrl(url);
      setShowQR(true);
    } catch {
      toast({ title: 'QR Error', description: 'Could not generate QR code', variant: 'destructive' });
    }
  };

  const handleSignOut = () => {
    setCustomer(null);
    setOrders([]);
    setIdentifier('');
    setPin('');
    setStep('lookup');
    setShowQR(false);
    setQrDataUrl('');
    setVerificationCode('');
    setRegisterName('');
  };

  // === QR Payment View ===
  if (showQR && customer) {
    return (
      <div className="min-h-screen relative flex flex-col items-center justify-center p-6 text-white" style={{ backgroundImage: `url(${PORTAL_BG})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div className="absolute inset-0 bg-black/60" />
        <button onClick={() => setShowQR(false)} className="absolute top-4 left-4 z-10 flex items-center gap-1 text-white/80 hover:text-white">
          <ArrowLeft className="w-5 h-5" /> Back
        </button>
        <h2 className="relative z-10 text-xl font-bold mb-1">Pay with $DUC</h2>
        <p className="relative z-10 text-sm text-white/70 mb-6">Show this QR code to the cashier</p>
        <div className="relative z-10 bg-white rounded-2xl p-4 shadow-xl">
          {qrDataUrl && <img src={qrDataUrl} alt="Payment QR" className="w-64 h-64" />}
        </div>
        <div className="relative z-10 mt-6 text-center">
          <p className="text-sm text-white/70">Available Balance</p>
          <p className="text-3xl font-bold">{customer.duc_balance.toFixed(2)} $DUC</p>
          <p className="text-xs text-white/50 mt-2">{customer.name}</p>
        </div>
      </div>
    );
  }

  // === Dashboard View ===
  if (customer) {
    const stats = [
      { label: 'Loyalty Points', value: customer.loyalty_points.toLocaleString(), icon: Coins, color: 'text-amber-600 bg-amber-50' },
      { label: '$DUC Balance', value: customer.duc_balance.toFixed(2), icon: Wallet, color: 'text-purple-600 bg-purple-50' },
      { label: 'Total Spent', value: `$${customer.total_spent.toFixed(2)}`, icon: TrendingUp, color: 'text-green-600 bg-green-50' },
      { label: 'Visits', value: customer.visit_count.toLocaleString(), icon: Calendar, color: 'text-blue-600 bg-blue-50' },
    ];

    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0A0A12] via-[#0d1b2a] to-[#1a1a2e]">
        <div className="relative text-white px-6 py-6" style={{ backgroundImage: `url(${PORTAL_BG})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
          <div className="absolute inset-0 bg-black/50" />

          <div className="relative z-10 max-w-md mx-auto">
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

          {/* Lifetime $DUC */}
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
            <p className="text-center text-xs text-white/50">
              Earn $DUC by shopping — loyalty rewards are credited automatically after each purchase.
            </p>
          )}

          <ICOLink />

          {/* Inline SMPF Wallet */}
          <CustomerInlineWallet customerKey={customer?.email || identifier} />

          {/* Purchase History */}
          <div className="pt-2">
            <div className="flex items-center gap-2 mb-3">
              <Receipt className="w-4 h-4 text-white/70" />
              <h3 className="font-semibold text-white">Purchase History</h3>
            </div>
            {orders.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-sm text-gray-400">
                  No purchases yet
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {orders.map((order, i) => (
                  <Card key={i}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Order {order.order_number || `#${i + 1}`}</p>
                          <p className="text-xs text-gray-400">
                            {order.item_count} {order.item_count === 1 ? 'item' : 'items'}
                            {order.payment_method && ` · ${order.payment_method}`}
                          </p>
                          {order.items && order.items.length > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                              {order.items.map(it => it.name).join(', ')}
                              {order.item_count > order.items.length ? '…' : ''}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">${(order.total || 0).toFixed(2)}</p>
                          <p className="text-xs text-gray-400">
                            {order.created_date ? new Date(order.created_date).toLocaleDateString() : ''}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // === Set PIN View ===
  if (step === 'set_pin') {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-6" style={{ backgroundImage: `url(${PORTAL_BG})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative max-w-md w-full">
          <div className="text-center text-white mb-8">
            <div className="w-16 h-16 bg-white/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold mb-1">Create Your PIN</h1>
            <p className="text-sm text-white/70">Set a 4+ digit PIN to secure your account</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-center">
            <p className="text-sm text-blue-800">A verification code was sent to your email.</p>
            <p className="text-xs text-blue-700 mt-1">Enter it below to confirm your identity. The code expires in 10 minutes.</p>
          </div>
          <Card>
            <CardContent className="p-6">
              <form onSubmit={handlePinSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="vcode">Verification Code</Label>
                  <Input id="vcode" type="text" inputMode="numeric" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} placeholder="123456" className="mt-1 tracking-widest text-center text-lg" autoFocus maxLength={6} />
                </div>
                <div>
                  <Label htmlFor="pin">New PIN</Label>
                  <Input id="pin" type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="••••" className="mt-1" />
                </div>
                <Button type="submit" className="w-full" disabled={authLoading || pin.length < 4 || verificationCode.length < 4}>
                  {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
                  {authLoading ? 'Creating…' : 'Create PIN & Continue'}
                </Button>
              </form>
            </CardContent>
          </Card>
          <button onClick={() => { setStep('lookup'); setPin(''); }} className="flex items-center gap-1 text-sm text-white/60 hover:text-white mx-auto mt-6">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </div>
      </div>
    );
  }

  // === Register View ===
  if (step === 'register') {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-6" style={{ backgroundImage: `url(${PORTAL_BG})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative max-w-md w-full">
          <div className="text-center text-white mb-8">
            <div className="w-16 h-16 bg-white/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Coins className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold mb-1">Create Your Account</h1>
            <p className="text-sm text-white/70">No account found for {identifier}. Create one to start earning rewards at all merchants.</p>
          </div>
          <Card>
            <CardContent className="p-6">
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <Label htmlFor="rname">Full Name</Label>
                  <Input id="rname" value={registerName} onChange={(e) => setRegisterName(e.target.value)} placeholder="Jane Doe" className="mt-1" autoFocus />
                </div>
                <div>
                  <Label htmlFor="rpin">Create PIN</Label>
                  <Input id="rpin" type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="••••" className="mt-1" />
                  <p className="text-xs text-gray-400 mt-1">4+ digits. You'll use this to log in.</p>
                </div>
                <Button type="submit" className="w-full" disabled={authLoading || !registerName.trim() || !pin || pin.length < 4}>
                  {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
                  {authLoading ? 'Creating…' : 'Create Account'}
                </Button>
              </form>
            </CardContent>
          </Card>
          <button onClick={() => { setStep('lookup'); setPin(''); setRegisterName(''); }} className="flex items-center gap-1 text-sm text-white/60 hover:text-white mx-auto mt-6">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </div>
      </div>
    );
  }

  // === PIN Login View ===
  if (step === 'pin') {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-6" style={{ backgroundImage: `url(${PORTAL_BG})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative max-w-md w-full">
          <div className="text-center text-white mb-8">
            <div className="w-16 h-16 bg-white/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold mb-1">Enter PIN</h1>
            <p className="text-sm text-white/70">Enter your PIN to access your rewards</p>
          </div>
          <Card>
            <CardContent className="p-6">
              <form onSubmit={handlePinSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="pin">PIN</Label>
                  <Input id="pin" type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="••••" className="mt-1" autoFocus />
                </div>
                <Button type="submit" className="w-full" disabled={authLoading || !pin}>
                  {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                  {authLoading ? 'Verifying…' : 'Sign In'}
                </Button>
              </form>
            </CardContent>
          </Card>
          <button onClick={() => { setStep('lookup'); setPin(''); }} className="flex items-center gap-1 text-sm text-white/60 hover:text-white mx-auto mt-6">
            <ArrowLeft className="w-4 h-4" /> Use different account
          </button>
        </div>
      </div>
    );
  }

  // === Lookup View ===
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
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleLookup} className="space-y-4">
              <div>
                <Label htmlFor="lookup">Phone or Email</Label>
                <Input id="lookup" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="(555) 123-4567 or you@email.com" className="mt-1" autoFocus />
              </div>
              <Button type="submit" className="w-full" disabled={lookupLoading || !identifier.trim()}>
                {lookupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                {lookupLoading ? 'Searching…' : 'Continue'}
              </Button>
            </form>
            <p className="text-xs text-gray-400 text-center mt-4">
              First time? You'll be prompted to create a PIN.
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