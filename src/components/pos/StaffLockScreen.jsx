import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Lock, AlertCircle } from 'lucide-react';

/**
 * Full-screen fast-switch lock screen for POS terminals.
 *
 * Verifies a staff PIN against the station's merchant (authenticatePinUser)
 * and calls onUnlock(user) on success. The underlying station session stays
 * intact — only the active cashier changes.
 */
export default function StaffLockScreen({ merchantId, stationName, onUnlock }) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (pin.length < 4 || loading) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await base44.functions.invoke('authenticatePinUser', {
        pin,
        merchant_id: merchantId,
      });
      if (!data.success) {
        setError(data.error || 'Invalid PIN. Please try again.');
        setPin('');
        return;
      }
      onUnlock(data.user);
      setPin('');
    } catch (err) {
      setError(err.message || 'Authentication failed. Please try again.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const press = (k) => {
    if (pin.length < 6) setPin((p) => p + k);
  };
  const back = () => setPin((p) => p.slice(0, -1));

  return (
    <div className="fixed inset-0 z-[100] bg-gray-900/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
        <div className="text-center mb-5">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Terminal Locked</h2>
          <p className="text-sm text-gray-500 mt-1">
            {stationName ? `${stationName} — ` : ''}Enter staff PIN to continue
          </p>
        </div>

        {error && (
          <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-center gap-2.5 mb-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-full transition-colors ${pin.length > i ? 'bg-blue-600' : 'bg-gray-300'}`}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => press(k)}
              className="h-16 text-2xl font-semibold rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors"
            >
              {k}
            </button>
          ))}
          <button
            type="button"
            onClick={back}
            className="h-16 text-2xl rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300"
          >
            ⌫
          </button>
          <button
            type="button"
            onClick={() => press('0')}
            className="h-16 text-2xl font-semibold rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300"
          >
            0
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={loading || pin.length < 4}
            className="h-16 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center text-lg font-semibold"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}