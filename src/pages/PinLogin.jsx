import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CreditCard, AlertCircle, LogIn, Mail } from 'lucide-react';
import { createPageUrl } from '@/utils';
// WalletLogin component is removed from the outline, so removing its import
// import WalletLogin from '../components/auth/WalletLogin';

const brandName = 'openTILL';

export default function PinLoginPage() {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(''), 4000);
    return () => clearTimeout(timer);
  }, [error]);
  // showWalletLogin and checkingAuth states are removed as per the outline's structure changes
  // const [showWalletLogin, setShowWalletLogin] = useState(false);
  // const [checkingAuth, setCheckingAuth] = useState(true);

  // The useEffect hook and checkExistingAuth function are removed.
  // The outline implies that initial authentication checking is handled elsewhere,
  // and this component is focused solely on PIN, Email, or Merchant onboarding options.
  /*
  useEffect(() => {
    checkExistingAuth();
  }, []);

  const checkExistingAuth = async () => {
    try {
      const user = await base44.auth.me();
      if (user) {
        console.log('User already authenticated:', user);
        localStorage.setItem('pinLoggedInUser', JSON.stringify(user));
        let redirectUrl = createPageUrl('SystemMenu');
        if (user.role === 'super_admin' || user.role === 'admin' || user.role === 'root_admin') {
          redirectUrl = createPageUrl('SuperAdmin');
        } else if (user.role === 'dealer_admin') {
          redirectUrl = createPageUrl('DealerDashboard');
        }
        window.location.href = redirectUrl;
        return;
      }
    } catch (error) {
      console.log('No existing authentication');
    } finally {
      setCheckingAuth(false);
    }
  };
  */

  // handleGoogleLogin function removed as Google login button is no longer present in the outline's JSX.
  /*
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      await base44.auth.redirectToLogin(createPageUrl('PinLogin'));
    } catch (err) {
      console.error('Google login error:', err);
      setError('Failed to initiate Google login');
      setLoading(false);
    }
  };
  */

  // Renamed handlePinSubmit to handleSubmit as per the outline's form onSubmit usage.
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (pin.length < 4 || pin.length > 6) {
      setError('PIN must be 4 to 6 digits long.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data } = await base44.functions.invoke('authenticatePinUser', { pin });

      if (!data.success) {
        setError(data.error || 'Invalid PIN. Please try again.');
        setPin('');
        setLoading(false);
        return;
      }

      const user = data.user;
      localStorage.setItem('pinLoggedInUser', JSON.stringify(user));

      // Staff PIN login only - always goes to SystemMenu
      window.location.href = createPageUrl('SystemMenu');

    } catch (error) {
      console.error('PIN login error:', error);
      setError(error.message || 'Login failed. Please try again.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  // handleKeyPress function removed as form onSubmit handles submission.
  /*
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };
  */

  // handleWalletLoginSuccess function removed as Wallet Login component is no longer present in the outline's JSX.
  /*
  const handleWalletLoginSuccess = (user) => {
    console.log('Wallet login successful:', user);
    let redirectUrl = createPageUrl('SystemMenu');
    if (user.role === 'super_admin' || user.role === 'admin' || user.role === 'root_admin') {
      redirectUrl = createPageUrl('SuperAdmin');
    } else if (user.role === 'dealer_admin') {
      redirectUrl = createPageUrl('DealerDashboard');
    }
    window.location.href = redirectUrl;
  };
  */

  // The conditional rendering for checkingAuth and showWalletLogin is removed,
  // as the outline directly renders the main login form.
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        {/* The CardHeader and CardDescription are replaced by custom elements inside CardContent */}
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center">
                <CreditCard className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {brandName} POS
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Enter your PIN to clock in</p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-800 dark:text-red-200">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* PIN Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="pin" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                PIN Code
              </label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength="6" // Changed from 4 to 6 digits as per outline
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} // Ensure only digits
                placeholder="Enter your PIN"
                className="text-center text-2xl tracking-widest"
                autoFocus
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              size="lg"
              disabled={loading || pin.length < 4} // Button disabled if loading or PIN is less than 4 digits
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-2" />
                  Clock In
                </>
              )}
            </Button>
          </form>

          {/* Additional Login/Signup Options */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 space-y-3">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.location.href = createPageUrl('EmailLogin')}
            >
              <Mail className="w-4 h-4 mr-2" />
              Merchant Login
            </Button>

            <Button
              variant="ghost"
              className="w-full text-sm text-gray-600 dark:text-gray-400"
              onClick={() => window.location.href = 'https://console.isolex.net/CL-signup.php'}
            >
              New merchant? Sign up here
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}