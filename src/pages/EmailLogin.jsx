import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LogIn, Mail, Lock, Loader2, AlertCircle, Shield, Chrome, Wallet, Link2
} from 'lucide-react';
import { createPageUrl } from '@/utils';
import WalletLogin from '@/components/auth/WalletLogin.jsx';

export default function EmailLoginPage() {
  const [tab, setTab] = useState('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [dealer, setDealer] = useState(null);
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  useEffect(() => { loadDealer(); }, []);

  // Check if arriving after Google OAuth with role-based redirect
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await base44.auth.me();
        if (user) redirectAfterLogin({ ...user, role: user.role });
      } catch { /* not logged in yet */ }
    };
    // Only auto-check when landing on this page fresh (no hash / oauth params)
    if (window.location.search.includes('token') || window.location.hash) {
      checkAuth();
    }
  }, []);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(''), 5000);
    return () => clearTimeout(t);
  }, [error]);

  // Check for mobile_connect QR session mode
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'mobile_connect') {
      setTab('wallet');
    }
  }, []);

  const loadDealer = async () => {
    try {
      const subdomain = window.location.hostname.split('.')[0];
      if (subdomain && !['localhost', 'opentill', 'www', ''].includes(subdomain.toLowerCase())) {
        const dealers = await base44.entities.Dealer.filter({ slug: subdomain });
        if (dealers?.length > 0) setDealer(dealers[0]);
      }
    } catch { /* silent */ }
  };

  const redirectAfterLogin = (user) => {
    localStorage.setItem('pinLoggedInUser', JSON.stringify(user));
    const role = user.role;
    if (['admin', 'super_admin', 'root_admin'].includes(role)) {
      window.location.href = createPageUrl('SuperAdmin');
    } else if (['dealer_admin', 'ambassador'].includes(role)) {
      window.location.href = createPageUrl('DealerDashboard');
    } else {
      window.location.href = createPageUrl('SystemMenu');
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Please enter both email and password'); return; }
    setLoading(true);
    setError('');
    try {
      const result = await base44.functions.invoke('emailPasswordLogin', {
        email: email.toLowerCase().trim(),
        password,
        two_factor_code: twoFactorCode || null
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

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      await base44.auth.redirectToLogin(createPageUrl('EmailLogin'));
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
        {/* Brand */}
        <div className="text-center">
          {logoUrl ? (
            <img src={logoUrl} alt={brandName} className="h-16 mx-auto mb-4" />
          ) : (
            <div className="flex justify-center mb-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl"
                style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }}
              >
                <Link2 className="w-8 h-8 text-white" />
              </div>
            </div>
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
              <TabsList className="grid grid-cols-3 w-full mb-6 bg-white/10">
                <TabsTrigger value="email" className="text-white/70 data-[state=active]:bg-white/20 data-[state=active]:text-white text-sm">
                  <Mail className="w-3.5 h-3.5 mr-1" /> Email
                </TabsTrigger>
                <TabsTrigger value="google" className="text-white/70 data-[state=active]:bg-white/20 data-[state=active]:text-white text-sm">
                  <Chrome className="w-3.5 h-3.5 mr-1" /> Google
                </TabsTrigger>
                <TabsTrigger value="wallet" className="text-white/70 data-[state=active]:bg-white/20 data-[state=active]:text-white text-sm">
                  <Wallet className="w-3.5 h-3.5 mr-1" /> Wallet
                </TabsTrigger>
              </TabsList>

              {/* ─── EMAIL ─── */}
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
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email address"
                      className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-purple-400"
                      disabled={loading}
                      autoFocus
                    />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-purple-400"
                      disabled={loading}
                    />
                  </div>
                  {twoFactorRequired && (
                    <div className="relative">
                      <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                      <Input
                        type="text"
                        value={twoFactorCode}
                        onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 text-center tracking-widest font-mono text-lg"
                        maxLength={6}
                        autoFocus
                      />
                    </div>
                  )}
                  <Button
                    type="submit"
                    className="w-full h-11 font-semibold"
                    style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogIn className="w-4 h-4 mr-2" />}
                    {loading ? 'Signing In...' : 'Sign In'}
                  </Button>
                </form>
                <button
                  onClick={handleForgotPassword}
                  className="w-full text-xs text-purple-300/70 hover:text-white underline text-center"
                  disabled={loading}
                >
                  Forgot password? Click to reset
                </button>
              </TabsContent>

              {/* ─── GOOGLE ─── */}
              <TabsContent value="google">
                <div className="py-6 text-center space-y-4">
                  <p className="text-white/60 text-sm">Sign in securely with your Google account</p>
                  <Button
                    className="w-full h-12 bg-white text-gray-800 hover:bg-gray-100 font-semibold shadow-lg"
                    onClick={handleGoogleLogin}
                    disabled={googleLoading}
                  >
                    {googleLoading
                      ? <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      : <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 mr-2" onError={(e) => e.target.style.display='none'} />
                    }
                    {googleLoading ? 'Redirecting...' : 'Continue with Google'}
                  </Button>
                  <p className="text-white/30 text-xs">Works for merchants, admins & ambassadors</p>
                </div>
              </TabsContent>

              {/* ─── WALLET ─── */}
              <TabsContent value="wallet">
                <div className="py-2">
                  <WalletLogin onSuccess={redirectAfterLogin} />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-white/20 text-xs">
          © {new Date().getFullYear()} Isolex Corporation · openTILL
        </p>
      </div>
    </div>
  );
}