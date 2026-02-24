import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertCircle, Smartphone, RefreshCw } from 'lucide-react';
import QRCode from 'qrcode';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';

export default function JupiterMobileQR({ onSuccess }) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [status, setStatus] = useState('generating'); // generating | waiting | connected | error
  const [error, setError] = useState('');
  const pollingRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    generateSession();
    return () => {
      clearInterval(pollingRef.current);
      clearTimeout(timeoutRef.current);
    };
  }, []);

  const generateSession = async () => {
    clearInterval(pollingRef.current);
    clearTimeout(timeoutRef.current);
    setStatus('generating');
    setError('');
    setQrDataUrl('');

    try {
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSessionId);

      const baseUrl = window.location.origin;
      // WalletConnect-style deep link that any Solana mobile wallet can scan
      // Uses the app's mobile wallet connect endpoint
      const connectUrl = `${baseUrl}${createPageUrl('WalletLoginPage')}?session=${newSessionId}&mode=mobile_connect`;

      const qrUrl = await QRCode.toDataURL(connectUrl, {
        width: 280,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: { dark: '#000000', light: '#FFFFFF' },
      });

      setQrDataUrl(qrUrl);
      setStatus('waiting');
      startPolling(newSessionId);
    } catch (err) {
      setError('Failed to generate QR code: ' + err.message);
      setStatus('error');
    }
  };

  const startPolling = (sid) => {
    pollingRef.current = setInterval(async () => {
      try {
        const { data } = await base44.functions.invoke('checkMobileSession', { session_id: sid });
        if (data.authenticated) {
          clearInterval(pollingRef.current);
          clearTimeout(timeoutRef.current);
          setStatus('connected');
          if (data.user) {
            localStorage.setItem('pinLoggedInUser', JSON.stringify(data.user));
            setTimeout(() => {
              if (onSuccess) onSuccess(data.user);
              else window.location.href = createPageUrl('SystemMenu');
            }, 1000);
          }
        }
      } catch (err) {
        // silent - keep polling
      }
    }, 2000);

    // Expire after 5 minutes
    timeoutRef.current = setTimeout(() => {
      clearInterval(pollingRef.current);
      if (status !== 'connected') {
        setError('QR code expired. Please refresh.');
        setStatus('error');
      }
    }, 300000);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-green-600" />
          Connect with Mobile Wallet
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === 'generating' && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-12 h-12 animate-spin text-green-600 mb-4" />
            <p className="text-gray-600">Generating QR code...</p>
          </div>
        )}

        {status === 'waiting' && qrDataUrl && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="p-3 bg-white rounded-xl shadow-lg border-4 border-green-500">
                <img src={qrDataUrl} alt="Connect QR Code" className="w-64 h-64" />
              </div>
            </div>

            <Alert className="bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <p className="font-semibold mb-1">How to connect:</p>
                <ol className="text-sm space-y-1 ml-4 list-decimal">
                  <li>Open <strong>any Solana wallet</strong> on your phone</li>
                  <li>Tap the QR / Scan icon</li>
                  <li>Scan this QR code</li>
                  <li>Approve the connection in your wallet</li>
                </ol>
                <p className="text-xs mt-2 text-blue-600">Works with Phantom, Solflare, Backpack, Saga & more</p>
              </AlertDescription>
            </Alert>

            <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Waiting for wallet connection...</span>
            </div>
          </div>
        )}

        {status === 'connected' && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <p className="text-lg font-semibold text-gray-900">Connected!</p>
            <p className="text-sm text-gray-500">Redirecting...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-3">
            <Alert className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
            <Button onClick={generateSession} variant="outline" className="w-full gap-2">
              <RefreshCw className="w-4 h-4" />
              Generate New QR
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}