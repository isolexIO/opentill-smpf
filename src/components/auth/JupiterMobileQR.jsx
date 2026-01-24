import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle, Smartphone } from 'lucide-react';
import QRCode from 'qrcode';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';

export default function JupiterMobileQR({ onSuccess }) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [status, setStatus] = useState('generating'); // generating, waiting, connected, error
  const [error, setError] = useState('');
  const pollingInterval = useRef(null);

  useEffect(() => {
    generateSession();
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, []);

  const generateSession = async () => {
    try {
      setStatus('generating');
      
      // Generate unique session ID
      const newSessionId = `sol_mobile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSessionId);

      // Store session in backend for polling
      await base44.functions.invoke('authenticateMobile', {
        session_id: newSessionId,
        action: 'init'
      });

      const baseUrl = window.location.origin;
      const appName = 'ChainLINK POS';
      
      // Use Solana Mobile Wallet Adapter protocol - the standard for mobile wallets
      // Format: solana-wallet://v1/connect?...
      const params = new URLSearchParams({
        dapp_encryption_public_key: newSessionId, // Use session as identifier
        cluster: 'mainnet-beta',
        app_url: baseUrl,
        redirect_link: `${baseUrl}?session=${newSessionId}`
      });
      
      const deepLink = `solana-wallet://v1/associate/local?${params.toString()}`;
      
      // Generate QR code
      const qrUrl = await QRCode.toDataURL(deepLink, {
        width: 300,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      setQrDataUrl(qrUrl);
      setStatus('waiting');

      // Start polling for authentication
      startPolling(newSessionId);

    } catch (err) {
      console.error('QR generation error:', err);
      setError('Failed to generate QR code');
      setStatus('error');
    }
  };

  const startPolling = (sessionId) => {
    // Poll every 2 seconds to check if mobile app has authenticated
    pollingInterval.current = setInterval(async () => {
      try {
        // Check session status via backend function
        const { data } = await base44.functions.invoke('checkMobileSession', {
          session_id: sessionId
        });

        if (data.authenticated) {
          clearInterval(pollingInterval.current);
          setStatus('connected');
          
          // Call success callback with user data
          if (onSuccess && data.user) {
            setTimeout(() => onSuccess(data.user), 1000);
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2000);

    // Stop polling after 5 minutes
    setTimeout(() => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        if (status === 'waiting') {
          setError('QR code expired. Please refresh to try again.');
          setStatus('error');
        }
      }
    }, 300000);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="w-5 h-5" />
          Jupiter Mobile Wallet
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === 'generating' && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="w-12 h-12 animate-spin text-green-600 mb-4" />
            <p className="text-gray-600">Generating QR code...</p>
          </div>
        )}

        {status === 'waiting' && qrDataUrl && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="p-4 bg-white rounded-lg shadow-lg border-4 border-green-500">
                <img src={qrDataUrl} alt="Jupiter QR Code" className="w-64 h-64" />
              </div>
            </div>
            
            <Alert className="bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <div className="space-y-2">
                  <p className="font-semibold">How to connect:</p>
                  <ol className="text-sm space-y-1 ml-4 list-decimal">
                    <li>Open Jupiter app on your mobile device</li>
                    <li>Tap the scan icon</li>
                    <li>Scan this QR code</li>
                    <li>Approve the connection request</li>
                  </ol>
                </div>
              </AlertDescription>
            </Alert>

            <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Waiting for mobile app connection...</span>
            </div>
          </div>
        )}

        {status === 'connected' && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <p className="text-lg font-semibold text-gray-900">Connected Successfully!</p>
            <p className="text-sm text-gray-600">Redirecting...</p>
          </div>
        )}

        {status === 'error' && (
          <Alert className="bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <p className="text-xs text-center text-gray-500">
          Don't have Jupiter? <a href="https://jup.ag/" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">Download it here</a>
        </p>
      </CardContent>
    </Card>
  );
}