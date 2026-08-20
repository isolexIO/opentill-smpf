import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, AlertCircle, LogIn } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function MagicLogin() {
  const [status, setStatus] = useState('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const email = params.get('email');
    const token = params.get('token');
    const exp = params.get('exp');

    if (!email || !token || !exp) {
      setStatus('error');
      setErrorMsg('Invalid login link. Please request a new one.');
      return;
    }

    if (Date.now() > parseInt(exp)) {
      setStatus('error');
      setErrorMsg('This login link has expired. Please request a new one.');
      return;
    }

    (async () => {
      try {
        const result = await base44.functions.invoke('emailPasswordLogin', {
          email: email.toLowerCase().trim(),
          password: `${token}.${exp}`,
          two_factor_code: null
        });

        if (result.data.requires_2fa) {
          setStatus('error');
          setErrorMsg('This account requires two-factor authentication. Please log in with your password.');
          return;
        }

        if (result.data.success && result.data.user) {
          const user = result.data.user;
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
        } else {
          setStatus('error');
          setErrorMsg(result.data.error || 'Login failed. Please request a new link.');
        }
      } catch (e) {
        setStatus('error');
        setErrorMsg('Login failed. This link may have already been used.');
      }
    })();
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center p-4">
        <Card className="bg-white/10 backdrop-blur-md border-white/20 shadow-2xl max-w-md w-full">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-4" />
            <p className="text-white text-lg font-semibold">Logging you in...</p>
            <p className="text-purple-300 text-sm mt-1">Verifying your login link</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center p-4">
      <Card className="bg-white/10 backdrop-blur-md border-white/20 shadow-2xl max-w-md w-full">
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
          <h1 className="text-white text-xl font-bold mb-2">Login Link Invalid</h1>
          <p className="text-purple-200 text-sm mb-6">{errorMsg}</p>
          <Button
            onClick={() => window.location.href = createPageUrl('EmailLogin')}
            className="w-full"
          >
            <LogIn className="w-4 h-4 mr-2" />
            Go to Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}