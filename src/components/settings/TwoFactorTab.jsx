import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function TwoFactorTab() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [setupMode, setSetupMode] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetup2FA = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const { data } = await base44.functions.invoke('setup2FA', {
        action: 'setup'
      });

      if (data.success) {
        setQrCode(data.qr_code);
        setSecret(data.secret);
        setSetupMode(true);
      } else {
        setError(data.error || 'Failed to setup 2FA');
      }
    } catch (error) {
      console.error('2FA setup error:', error);
      setError('Failed to setup 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const { data } = await base44.functions.invoke('setup2FA', {
        action: 'verify',
        verification_code: verificationCode
      });

      if (data.success) {
        setSuccess('2FA enabled successfully! Your account is now more secure.');
        setSetupMode(false);
        setQrCode('');
        setSecret('');
        setVerificationCode('');
        await loadUser();
      } else {
        setError(data.error || 'Invalid verification code');
      }
    } catch (error) {
      console.error('2FA verification error:', error);
      setError('Failed to verify 2FA code');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter your current 6-digit code to disable 2FA');
      return;
    }

    if (!confirm('Are you sure you want to disable 2FA? This will make your account less secure.')) {
      return;
    }

    setError('');
    setLoading(true);

    try {
      const { data } = await base44.functions.invoke('setup2FA', {
        action: 'disable',
        verification_code: verificationCode
      });

      if (data.success) {
        setSuccess('2FA disabled successfully');
        setVerificationCode('');
        await loadUser();
      } else {
        setError(data.error || 'Failed to disable 2FA');
      }
    } catch (error) {
      console.error('2FA disable error:', error);
      setError('Failed to disable 2FA');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !user) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Two-Factor Authentication (2FA)
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your account with time-based one-time passwords
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          {!user?.two_factor_enabled && !setupMode && (
            <div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Two-factor authentication is currently disabled. Enable it to protect your account with an authenticator app.
              </p>
              <Button onClick={handleSetup2FA} disabled={loading}>
                <Shield className="w-4 h-4 mr-2" />
                Enable 2FA
              </Button>
            </div>
          )}

          {setupMode && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-300 mb-2">
                  <strong>Step 1:</strong> Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                </p>
                {qrCode && (
                  <div className="flex justify-center my-4">
                    <img src={qrCode} alt="2FA QR Code" className="border-4 border-white rounded-lg" />
                  </div>
                )}
                <p className="text-xs text-blue-700 dark:text-blue-400 mb-2">
                  Or enter this secret manually: <code className="bg-white px-2 py-1 rounded">{secret}</code>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Step 2: Enter the 6-digit code from your app
                </label>
                <Input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="text-center text-2xl tracking-widest font-mono"
                  maxLength={6}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleVerify} disabled={loading || verificationCode.length !== 6} className="flex-1">
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  Verify & Enable
                </Button>
                <Button variant="outline" onClick={() => setSetupMode(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {user?.two_factor_enabled && !setupMode && (
            <div className="space-y-4">
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Two-factor authentication is enabled and protecting your account
                </AlertDescription>
              </Alert>

              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border">
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                  To disable 2FA, enter a valid code from your authenticator app:
                </p>
                <Input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="text-center text-xl tracking-widest font-mono mb-3"
                  maxLength={6}
                />
                <Button 
                  variant="destructive" 
                  onClick={handleDisable2FA}
                  disabled={loading || verificationCode.length !== 6}
                  className="w-full"
                >
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Disable 2FA
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}