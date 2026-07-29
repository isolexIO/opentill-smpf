import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useStationDisplay } from '@/hooks/useStationDisplay';
import WelcomeScreen from '@/components/customer-display/WelcomeScreen';
import ApprovalScreen from '@/components/customer-display/ApprovalScreen';
import TipScreen from '@/components/customer-display/TipScreen';
import SolanaPayScreen from '@/components/customer-display/SolanaPayScreen';
import TransactionStatusScreen from '@/components/customer-display/TransactionStatusScreen';
import CardPaymentStatusScreen from '@/components/customer-display/CardPaymentStatusScreen';
import PaymentMethodSelectionScreen from '@/components/customer-display/PaymentMethodSelectionScreen';
import EBTPaymentScreen from '@/components/customer-display/EBTPaymentScreen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Loader2, WifiOff, AlertCircle, RefreshCw, Smartphone } from 'lucide-react';

export default function MobileStationDisplay() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorCode, setErrorCode] = useState(null);
  const [station, setStation] = useState(null);
  const [merchant, setMerchant] = useState(null);
  const [pinRequired, setPinRequired] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const heartbeatRef = useRef(null);

  const resolveStation = async (pinValue) => {
    setLoading(true);
    setError(null);
    setPinError(null);
    try {
      const res = await base44.functions.invoke('resolveMobileStation', {
        token,
        pin: pinValue || undefined,
      });

      if (!res.data?.success) {
        setError(res.data?.error || 'Unable to load station.');
        setErrorCode(res.data?.code || 'unknown');
        setLoading(false);
        return;
      }

      if (res.data.pin_required) {
        setStation(res.data.station);
        setMerchant({ business_name: res.data.merchant?.business_name });
        setPinRequired(true);
        setLoading(false);
        return;
      }

      setPinRequired(false);
      setStation(res.data.station);
      setMerchant(res.data.merchant);

      // Register device session
      try {
        const sessionResult = await base44.functions.invoke('registerDeviceSession', {
          merchant_id: res.data.merchant.id,
          device_name: 'Mobile Display',
          device_type: 'mobile',
          station_id: res.data.station.station_id,
          station_name: res.data.station.name,
        });

        if (sessionResult.data?.session_id) {
          setSessionId(sessionResult.data.session_id);
          startHeartbeat(sessionResult.data.session_id, res.data.merchant.id);
        }
      } catch (e) {
        console.warn('MobileStationDisplay: Could not register device session:', e);
      }

      setLoading(false);
    } catch (err) {
      setError('Failed to connect to station. Please check your internet connection.');
      setErrorCode('network');
      setLoading(false);
    }
  };

  const startHeartbeat = (sid, merchantId) => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    heartbeatRef.current = setInterval(async () => {
      try {
        await base44.functions.invoke('updateDeviceHeartbeat', {
          session_id: sid,
        });
      } catch (e) {
        // non-fatal
      }
    }, 10000);
  };

  useEffect(() => {
    if (token) {
      resolveStation();
    } else {
      setError('Invalid link.');
      setErrorCode('invalid_link');
      setLoading(false);
    }

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (sessionId) {
        base44.functions.invoke('disconnectDeviceSession', { session_id: sessionId }).catch(() => {});
      }
    };
  }, [token]);

  // PWA meta tags for "Add to Home Screen"
  useEffect(() => {
    const metas = [
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
      { name: 'mobile-web-app-capable', content: 'yes' },
      { name: 'theme-color', content: '#3B82F6' },
    ];
    const created = metas.map(m => {
      const el = document.createElement('meta');
      el.name = m.name;
      el.content = m.content;
      document.head.appendChild(el);
      return el;
    });
    // Prevent pinch-to-zoom on mobile
    const viewport = document.querySelector('meta[name="viewport"]');
    const originalViewport = viewport?.content;
    if (viewport) {
      viewport.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no';
    }
    return () => {
      created.forEach(el => el.remove());
      if (viewport && originalViewport) {
        viewport.content = originalViewport;
      }
    };
  }, []);

  const displayTimeout = station?.mobile_display_timeout || 8;
  const {
    currentOrder,
    currentScreen,
    connectionLost,
    handleTipSelected,
    handlePaymentMethodSelected,
    handlePaymentComplete,
    handleApprove,
  } = useStationDisplay({
    merchant,
    // Pass null so the mobile display picks up any pending order for the
    // merchant — the POS may auto-generate a station_id that doesn't match
    // the Station entity's station_id, and filtering by station_id would
    // prevent the mobile display from ever seeing the order.
    stationId: null,
    sessionId,
    displayTimeout,
  });

  const handlePinSubmit = (e) => {
    e?.preventDefault();
    if (!pin || pin.length < 4) {
      setPinError('PIN must be at least 4 digits');
      return;
    }
    resolveStation(pin);
  };

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    resolveStation(pinRequired ? pin : undefined);
  };

  // --- Loading state ---
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-600 to-purple-700 text-white">
        <Loader2 className="w-12 h-12 animate-spin mb-4" />
        <p className="text-lg font-medium">Connecting to station…</p>
      </div>
    );
  }

  // --- Error state ---
  if (error) {
    const isTemporary = errorCode === 'network';
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-900 to-red-700 p-6">
        <div className="bg-white rounded-2xl p-8 max-w-sm text-center shadow-2xl">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            {errorCode === 'network' ? (
              <WifiOff className="w-8 h-8 text-red-600" />
            ) : (
              <AlertCircle className="w-8 h-8 text-red-600" />
            )}
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {errorCode === 'invalid_link' ? 'Link Not Found' :
             errorCode === 'link_expired' ? 'Link Expired' :
             errorCode === 'mobile_disabled' ? 'Mobile Access Disabled' :
             errorCode === 'station_inactive' ? 'Station Inactive' :
             errorCode === 'merchant_inactive' ? 'Account Inactive' :
             errorCode === 'max_connections' ? 'Connection Limit Reached' :
             errorCode === 'invalid_pin' ? 'Incorrect PIN' :
             'Connection Error'}
          </h2>
          <p className="text-gray-600 text-sm mb-6">{error}</p>
          {isTemporary && (
            <Button onClick={handleRetry} className="w-full bg-blue-600 hover:bg-blue-700">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reconnect
            </Button>
          )}
          {errorCode === 'invalid_pin' && (
            <Button onClick={() => { setError(null); setPin(''); }} className="w-full bg-blue-600 hover:bg-blue-700">
              Try Again
            </Button>
          )}
        </div>
      </div>
    );
  }

  // --- PIN entry state ---
  if (pinRequired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-900 p-6">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            {merchant?.business_name || 'Station'}
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {station?.name ? `${station.name} · ` : ''}Enter PIN to continue
          </p>
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <Input
              type="password"
              inputMode="numeric"
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="• • • •"
              maxLength={8}
              className="text-center text-2xl tracking-widest h-16"
            />
            {pinError && <p className="text-sm text-red-600">{pinError}</p>}
            <Button type="submit" className="w-full h-12 text-base font-bold">
              Unlock
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // --- Customer Display (reuses all existing screens) ---
  return (
    <div className="min-h-screen bg-black relative" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Station badge */}
      {station && (
        <div className="fixed top-2 left-2 z-50 bg-black/60 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm">
          <Smartphone className="w-3 h-3 inline mr-1" />
          {station.name}
        </div>
      )}

      {/* Connection lost indicator */}
      {connectionLost && (
        <div className="fixed top-2 right-2 z-50 bg-orange-500/90 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1 backdrop-blur-sm">
          <WifiOff className="w-3 h-3" />
          Reconnecting…
        </div>
      )}

      {/* Idle Screen */}
      {currentScreen === 'welcome' && (
        <WelcomeScreen
          merchant={merchant}
          order={null}
          settings={merchant?.settings}
        />
      )}

      {/* Active Order / Approval Screen */}
      {currentScreen === 'approval' && currentOrder && (
        <ApprovalScreen
          order={currentOrder}
          settings={merchant?.settings}
          onApprove={handleApprove}
        />
      )}

      {/* Tip Screen */}
      {currentScreen === 'tip' && currentOrder && (
        <TipScreen
          order={currentOrder}
          settings={merchant?.settings}
          onTipSelected={handleTipSelected}
        />
      )}

      {/* Payment Method Selection */}
      {currentScreen === 'payment_method' && currentOrder && (
        <PaymentMethodSelectionScreen
          order={currentOrder}
          settings={merchant?.settings}
          onMethodSelected={handlePaymentMethodSelected}
        />
      )}

      {/* Solana Pay / QR Payment */}
      {currentScreen === 'solana_pay' && currentOrder && (
        <SolanaPayScreen
          order={currentOrder}
          settings={merchant?.settings}
          merchant={merchant}
          onPaymentComplete={handlePaymentComplete}
        />
      )}

      {/* Card Payment Processing */}
      {currentScreen === 'card_payment' && currentOrder && (
        <CardPaymentStatusScreen
          order={currentOrder}
          settings={merchant?.settings}
          onComplete={handlePaymentComplete}
        />
      )}

      {/* EBT Payment */}
      {currentScreen === 'ebt_payment' && currentOrder && (
        <EBTPaymentScreen
          order={currentOrder}
          settings={merchant?.settings}
          onComplete={handlePaymentComplete}
        />
      )}

      {/* Approved Screen */}
      {currentScreen === 'success' && currentOrder && (
        <TransactionStatusScreen
          success={true}
          order={currentOrder}
          settings={merchant?.settings}
        />
      )}

      {/* Declined / Failed Screen */}
      {currentScreen === 'error' && (
        <TransactionStatusScreen
          success={false}
          order={currentOrder}
          settings={merchant?.settings}
          errorMessage="Payment was not completed. Please try again."
        />
      )}
    </div>
  );
}