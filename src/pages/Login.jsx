import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LogIn, Mail, Lock, Loader2, AlertCircle, Shield, Chrome, Wallet, KeyRound,
} from 'lucide-react';
import { createPageUrl } from '@/utils';
import WalletLogin from '@/components/auth/WalletLogin.jsx';

const ADMIN_ROLES = ['admin', 'super_admin', 'root_admin'];
const DEALER_ROLES = ['dealer_admin', 'ambassador'];

export default function Login() {
  const [tab, setTab] = useState('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [merchantId, setMerchantId] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [dealer, setDealer] = useState(null);
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  useEffect(() => { loadDealer(); }, []);

  // Resolve merchant context + requested method from the URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mid = params.get('merchant_id') || localStorage.getItem('deviceMerchantId') || '';
    setMerchantId(mid);
    if (params.get('mode') === 'mobile_connect') setTab('wallet');
    if (params.get('method') === 'pin') setTab('pin');
  }, []);

  // If returning from Google OAuth already authenticated, route by role
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await base44.auth.me();
        if (user) redirectAfterLogin(user);
      } catch { /* not logged in yet */ }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(''), 5000);
    return () => clearTimeout(t);
  }, [error]);

  const loadDealer = async () => {
    try {
      const subdomain = window.location.hostname.split('.')[0];
      if (subdomain && !['localhost', 'opentill', 'www', ''].includes(subdomain.toLowerCase())) {
        const dealers = await base44.entities.Ambassador.filter({ slug: subdomain });
        if (dealers?.length > 0) setDealer(dealers[0]);
      }
    } catch { /* silent */ }
  };

  const redirectAfterLogin = (user) => {
    localStorage.setItem('pinLoggedInUser', JSON.stringify(user));
    if (user.merchant_id) localStorage.setItem('deviceMerchantId', user.merchant_id);

    // Honor an explicit next destination (e.g. returning to a POS station)
    const next = new URLSearchParams(window.location.search).get('next');
    if (next) {
      const [page, query] = next.split('?');
      window.location.href = query ? `${createPageUrl(page)}?${query}` : createPageUrl(page);
      return;
    }

    const role = user.role;
    if (ADMIN_ROLES.includes(role)) {
      window.location.href = createPageUrl('SuperAdmin');
    } else if (DEALER_ROLES.includes(role)) {
      window.location.href = createPageUrl('DealerDashboard');
    } else if (role === 'driver') {
      window.location.href = createPageUrl('DriverDashboard');
    } else if (user.merchant_id) {
      window.location.href = createPageUrl('SystemMenu');
    } else {
      window.location.href = createPageUrl('Home');
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Please enter both email and password'); return; }
    setLoading(true); setError('');
    try {
      const result = await base44.functions.invoke('emailPasswordLogin', {
        email: email.toLowerCase().trim(),
        password,
        two_factor_code: twoFactorCode || null,
      });
      if (result.data.requires_2fa) { setTwoFactorRequired(true); setLoading(false); return; }
      if (result.data.success && result.data.user) {
        redirectAfterLogin(result.data.user);
      } else {
        setError(result.data.error || 'Login failed');
      }
    } catch {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handlePinLogin = async (e) => {
    e.preventDefault();
    if (pin.length < 4) { setError('PIN must be at least 4 digits'); return; }
    if (!merchantId) { setError('This device is not registered to a merchant. Use email login first.'); return; }
    setLoading(true); setError('');
    try {
      const { data } = await base44.functions.invoke('authenticatePinUser', {
        pin, merchant_id: merchantId,
      });
      if (!data.success) { setError(data.error || 'Invalid PIN'); setPin(''); setLoading(false); return; }
      redirectAfterLogin(data.user);
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true); setError('');
    try {
      await base44.auth.redirectToLogin(createPageUrl('Login'));
    } catch {
      setError('Failed to initiate Google login');
      setGoogleLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) { setError('Enter your email address above first'); return; }
    setLoading(true);
    try {
      const result = await base44.functions.invoke('resetUserPassword', { email: email.toLowerCase().trim() });
      if (result.data.success) {
        alert(`✅ Temporary password sent to ${email}! Check your inbox.`);
      } else {
        setError(result.data.error || 'Failed to send reset email');
      }
    } catch { setError('Failed to send reset email.'); }
    finally { setLoading(false); }
  };

  const brandName = dealer?.name || 'openTILL';
  const primaryColor = dealer?.primary_color || '#7B2FD6';
  const secondaryColor = dealer?.secondary_color || '#0FD17A';
  const logoUrl = dealer?.logo_url;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          {logoUrl ? (
            <img src={logoUrl} alt={brandName} className="h-16 mx-auto mb-4" />
          ) : (
            <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6970e2871534100b4ebb8d45/2e8077855_DUC.png" alt="openTILL" className="h-16 mx-auto mb-4" />
          )}
          <h1 className="text-3xl font-bold text-white mb-1">{brandName}</h1>
          <p className="text-purple-300 text-sm">Sign in to your account</p>
        </div>

        <Card className="bg-white/10 backdrop-blur-md border-white/20 shadow-2xl">
          <CardContent className="p-6">
            {error && (
              <Alert className="mb-4 bg-red-500/20 border-red-400/40">
                <AlertCircle className="h-4 w-4 text-red-300" />
                <AlertDescription className="text-red-200">{error}</AlertDescription>
              </Alert>
            )}

            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="grid grid-cols-4 w-full mb-6 bg-white/10">
                <TabsTrigger value="email" className="text-white/70 data-[state=active]:bg-white/20 data-[state=active]:text-white text-xs">
                  <Mail className="w-3.5 h-3.5 mr-1" /> Email
                </TabsTrigger>
                <TabsTrigger value="google" className="text-white/70 data-[state=active]:bg-white/20 data-[state=active]:text-white text-xs">
                  <Chrome className="w-3.5 h-3.5 mr-1" /> Google
                </TabsTrigger>
                <TabsTrigger value="wallet" className="text-white/70 data-[state=active]:bg-white/20 data-[state=active]:text-white text-xs">
                  <Wallet className="w-3.5 h-3.5 mr-1" /> Wallet
                </TabsTrigger>
                <TabsTrigger value="pin" className="text-white/70 data-[state=active]:bg-white/20 data-[state=active]:text-white text-xs">
                  <KeyRound className="w-3.5 h-3.5 mr-1" /> PIN
                </TabsTrigger>
              </TabsList>

              {/* EMAIL */}
              <TabsContent value="email" className="space-y-4">
                {twoFactorRequired && (
                  <Alert className="bg-blue-500/20 border-blue-400/40">
                    <Shield className="h-4 w-4 text-blue-300" />
                    <AlertDescription className="text-blue-200">2FA enabled — enter your 6-digit code.</AlertDescription>
                  </Alert>
                )}
                <form onSubmit={handleEmailLogin} className="space-y-3">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-purple-400" disabled={loading} autoFocus />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-purple-400" disabled={loading} />
                  </div>
                  {twoFactorRequired && (
                    <div className="relative">
                      <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                      <Input type="text" value={twoFactorCode} onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 text-center tracking-widest font-mono text-lg" maxLength={6} autoFocus />
                    </div>
                  )}
                  <Button type="submit" className="w-full h-11 font-semibold" style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }} disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogIn className="w-4 h-4 mr-2" />}
                    {loading ? 'Signing In...' : 'Sign In'}
                  </Button>
                </form>
                <button onClick={handleForgotPassword} className="w-full text-xs text-purple-300/70 hover:text-white underline text-center" disabled={loading}>
                  Forgot password? Click to reset
                </button>
              </TabsContent>

              {/* GOOGLE */}
              <TabsContent value="google">
                <div className="py-6 text-center space-y-4">
                  <p className="text-white/60 text-sm">Sign in securely with your Google account</p>
                  <Button className="w-full h-12 bg-white text-gray-800 hover:bg-gray-100 font-semibold shadow-lg" onClick={handleGoogleLogin} disabled={googleLoading}>
                    {googleLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 mr-2" onError={(e) => e.target.style.display='none'} />}
                    {googleLoading ? 'Redirecting...' : 'Continue with Google'}
                  </Button>
                  <p className="text-white/30 text-xs">Works for merchants, admins & ambassadors</p>
                </div>
              </TabsContent>

              {/* WALLET */}
              <TabsContent value="wallet">
                <div className="py-2">
                  <WalletLogin onSuccess={redirectAfterLogin} />
                </div>
              </TabsContent>

              {/* PIN */}
              <TabsContent value="pin" className="space-y-4">
                <p className="text-white/60 text-sm">Clock in with your staff PIN</p>
                <form onSubmit={handlePinLogin} className="space-y-3">
                  <Input type="password" inputMode="numeric" pattern="[0-9]*" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} placeholder="Enter PIN" className="bg-white/10 border-white/20 text-white placeholder:text-white/40 text-center text-2xl tracking-widest" autoFocus disabled={loading} />
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <Input value={merchantId} onChange={(e) => setMerchantId(e.target.value)} placeholder="Merchant ID (auto-detected)" className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-purple-400 text-xs" disabled={loading} />
                  </div>
                  <Button type="submit" className="w-full h-11 font-semibold" style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }} disabled={loading || pin.length < 4}>
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogIn className="w-4 h-4 mr-2" />}
                    {loading ? 'Verifying...' : 'Clock In'}
                  </Button>
                </form>
                <p className="text-white/30 text-xs text-center">PINs are scoped per merchant. Use email login to register this device first.</p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-white/20 text-xs">
          © {new Date().getFullYear()} openTILL Corporation · openTILL
        </p>
      </div>
    </div>
  );
}