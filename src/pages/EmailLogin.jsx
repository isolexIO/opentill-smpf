import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LogIn, Mail, Lock, Loader2, AlertCircle, KeyRound, Chrome, Shield } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function EmailLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [dealer, setDealer] = useState(null);
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [tempUserId, setTempUserId] = useState(null);

  useEffect(() => {
    loadDealer();
  }, []);

  // Auto-clear error after 4 seconds
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(''), 4000);
    return () => clearTimeout(timer);
  }, [error]);

  const loadDealer = async () => {
    try {
      const hostname = window.location.hostname;
      const subdomain = hostname.split('.')[0];
      
      if (subdomain && !['localhost', 'chainlinkpos', 'www', ''].includes(subdomain.toLowerCase())) {
        const dealers = await base44.entities.Dealer.filter({ slug: subdomain });
        if (dealers && dealers.length > 0) {
          setDealer(dealers[0]);
        }
      }
    } catch (e) {
      console.warn('Could not load dealer:', e);
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);

    try {
      const result = await base44.functions.invoke('emailPasswordLogin', {
        email: email.toLowerCase().trim(),
        password: password,
        two_factor_code: twoFactorCode || null
      });

      if (result.data.success && result.data.requires_2fa) {
        setTwoFactorRequired(true);
        setTempUserId(result.data.user_id);
        setError('');
        setLoading(false);
        return;
      }

      if (result.data.success && result.data.user) {
        const user = result.data.user;
        localStorage.setItem('pinLoggedInUser', JSON.stringify(user));
        
        // Role-based routing: SuperAdmin, MerchantAdmin, Ambassador
        let redirectUrl = createPageUrl('SystemMenu');
        
        if (user.role === 'admin' || user.role === 'super_admin' || user.role === 'root_admin') {
          redirectUrl = createPageUrl('SuperAdmin');
        } else if (user.role === 'dealer_admin' || user.role === 'ambassador') {
          redirectUrl = createPageUrl('DealerDashboard');
        } else if (user.merchant_id) {
          redirectUrl = createPageUrl('SystemMenu'); // Merchant admin/staff
        }
        
        window.location.href = redirectUrl;
      } else {
        setError(result.data.error || 'Login failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      setError('');
      await base44.auth.redirectToLogin(createPageUrl('EmailLogin'));
    } catch (err) {
      console.error('Google login error:', err);
      setError('Failed to initiate Google login');
      setGoogleLoading(false);
    }
  };

  const brandName = dealer?.name || 'openTILL';
  const primaryColor = dealer?.primary_color || '#7B2FD6';
  const secondaryColor = dealer?.secondary_color || '#0FD17A';
  const logoUrl = dealer?.logo_url;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            {logoUrl ? (
              <img src={logoUrl} alt={brandName} className="h-16 mx-auto mb-4" />
            ) : (
              <div className="flex justify-center mb-4">
                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
                  }}
                >
                  <Mail className="w-8 h-8 text-white" />
                </div>
              </div>
            )}
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {brandName} POS
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Sign in with your email</p>
          </div>

          {error && (
            <Alert className="mb-4 bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          {twoFactorRequired && (
            <Alert className="mb-4 bg-blue-50 border-blue-200">
              <Shield className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                Two-factor authentication is enabled. Please enter your 6-digit code.
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="pl-10"
                  disabled={loading}
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pl-10"
                  disabled={loading}
                />
              </div>
            </div>

            {twoFactorRequired && (
              <div>
                <label htmlFor="2fa" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Two-Factor Code
                </label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="2fa"
                    type="text"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="pl-10 text-center text-2xl tracking-widest font-mono"
                    disabled={loading}
                    maxLength={6}
                    autoFocus={twoFactorRequired}
                  />
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              style={{
                background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
              }}
              size="lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Signing In...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-2" />
                  Sign In
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 space-y-3">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
            >
              {googleLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <Chrome className="w-4 h-4 mr-2" />
                  Sign in with Google
                </>
              )}
            </Button>


          </div>

          <div className="mt-4 text-center">
            <button
              onClick={async () => {
                if (!email) {
                  setError('Please enter your email address first');
                  return;
                }
                setLoading(true);
                setError('');
                try {
                  const result = await base44.functions.invoke('resetUserPassword', { email: email.toLowerCase().trim() });
                  if (result.data.success) {
                    alert(`✅ Temporary password sent to ${email}!\n\nCheck your inbox (and spam/junk folder) for your temporary password.\n\nYour temporary password will be in the email.`);
                  } else {
                    setError(result.data.error || 'Failed to send reset email');
                  }
                } catch (err) {
                  console.error('Password reset error:', err);
                  setError('Failed to send reset email. Please contact support.');
                } finally {
                  setLoading(false);
                }
              }}
              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
              disabled={loading}
            >
              Forgot password? Click here to reset
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}