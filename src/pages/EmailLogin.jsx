import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Mail, Loader2, AlertCircle, Chrome, Wallet
} from 'lucide-react';
import { createPageUrl } from '@/utils';
import WalletLogin from '@/components/auth/WalletLogin.jsx';

export default function EmailLoginPage() {
  const [tab, setTab] = useState('email');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [dealer, setDealer] = useState(null);
  const [linkSent, setLinkSent] = useState(false);

  useEffect(() => { loadDealer(); }, []);

  // Check if arriving after Google OAuth with role-based redirect
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await base44.auth.me();
        if (user) redirectAfterLogin({ ...user, role: user.role });
      } catch { /* not logged in yet */ }
    };
    checkAuth();
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
        const dealers = await base44.entities.Ambassador.filter({ slug: subdomain });
        if (dealers?.length > 0) setDealer(dealers[0]);
      }
    } catch { /* silent */ }
  };

  const redirectAfterLogin = (user) => {
    localStorage.setItem('pinLoggedInUser', JSON.stringify(user));
    if (user.merchant_id) localStorage.setItem('deviceMerchantId', user.merchant_id);
    const role = user.role;
    if (['admin', 'super_admin', 'root_admin'].includes(role)) {
      window.location.href = createPageUrl('SuperAdmin');
    } else if (['dealer_admin', 'ambassador'].includes(role)) {
      window.location.href = createPageUrl('DealerDashboard');
    } else if (role === 'driver') {
      window.location.href = createPageUrl('DriverDashboard');
    } else if (user.merchant_id) {
      window.location.href = createPageUrl('SystemMenu');
    } else {
      window.location.href = createPageUrl('Home');
    }
  };

  const handleSendLink = async (e) => {
    e.preventDefault();
    if (!email) { setError('Enter your email address'); return; }
    setLoading(true);
    setError('');
    try {
      const result = await base44.functions.invoke('resetUserPassword', { email: email.toLowerCase().trim() });
      if (result.data.success) {
        setLinkSent(true);
      } else {
        setError(result.data.error || 'Failed to send login link');
      }
    } catch { setError('Failed to send login link.'); }
    finally { setLoading(false); }
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
             <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6970e2871534100b4ebb8d45/2e8077855_DUC.png" alt="DUC Token" className="h-16 mx-auto mb-4" />
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
                {linkSent ? (
                  <div className="py-6 text-center space-y-3">
                    <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                      <Mail className="w-6 h-6 text-green-400" />
                    </div>
                    <p className="text-white font-semibold">Check your inbox</p>
                    <p className="text-white/60 text-sm">
                      We sent a login link to <span className="text-white font-medium">{email}</span>.
                      Click the link in the email to sign in.
                    </p>
                    <button
                      onClick={() => { setLinkSent(false); setEmail(''); }}
                      className="text-xs text-purple-300/70 hover:text-white underline"
                    >
                      Use a different email
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSendLink} className="space-y-3">
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
                    <Button
                      type="submit"
                      className="w-full h-11 font-semibold"
                      style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }}
                      disabled={loading}
                    >
                      {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                      {loading ? 'Sending...' : 'Send Login Link'}
                    </Button>
                    <p className="text-center text-white/40 text-xs">
                      We'll email you a secure link to log in — no password needed.
                    </p>
                  </form>
                )}
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
          © {new Date().getFullYear()} openTILL Corporation · openTILL
        </p>
      </div>
    </div>
  );
}