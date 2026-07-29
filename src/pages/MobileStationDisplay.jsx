import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import MobilePOS from '@/components/mobile/MobilePOS';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Loader2, WifiOff, AlertCircle, RefreshCw } from 'lucide-react';

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

  useEffect(() => {
    if (token) {
      resolveStation();
    } else {
      setError('Invalid link.');
      setErrorCode('invalid_link');
      setLoading(false);
    }

  }, [token]);

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

  // --- Full Mobile POS ---
  return <MobilePOS merchant={merchant} station={station} sessionId={sessionId} />;
}