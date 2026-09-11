import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { QrCode, MessageSquare, X, Loader2, CheckCircle, ChevronRight, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CARRIERS = [
  { value: 'att', label: 'AT&T' },
  { value: 'verizon', label: 'Verizon' },
  { value: 'tmobile', label: 'T-Mobile' },
  { value: 'sprint', label: 'Sprint / T-Mobile' },
  { value: 'boost', label: 'Boost Mobile' },
  { value: 'cricket', label: 'Cricket' },
  { value: 'uscellular', label: 'US Cellular' },
  { value: 'googlefi', label: 'Google Fi' },
  { value: 'metropcs', label: 'Metro PCS' },
];

export default function ReceiptScreen({ order, merchant, onReturnToIdle }) {
  const [mode, setMode] = useState('options'); // 'options' | 'qr' | 'sms' | 'sending' | 'sent'
  const [countdown, setCountdown] = useState(20);
  const [phone, setPhone] = useState('');
  const [carrier, setCarrier] = useState('att');
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  const receiptUrl = `${window.location.origin}/receipt/${order?.id}`;

  // QR code display with 20-second countdown, then return to idle (ads)
  useEffect(() => {
    if (mode === 'qr') {
      setCountdown(20);
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            onReturnToIdle();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [mode]);

  const formatPhone = (val) => {
    const d = val.replace(/\D/g, '').slice(0, 10);
    if (d.length === 0) return '';
    if (d.length < 4) return `(${d}`;
    if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  };

  const handleSendSms = async () => {
    setError(null);
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 10) {
      setError('Enter a valid 10-digit phone number');
      return;
    }
    setMode('sending');
    try {
      const res = await base44.functions.invoke('sendReceiptSMS', {
        phone: digits,
        carrier,
        order_id: order?.id,
      });
      if (res.data?.success) {
        setMode('sent');
        setTimeout(() => onReturnToIdle(), 5000);
      } else {
        setError(res.data?.error || 'Failed to send SMS');
        setMode('sms');
      }
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Failed to send SMS');
      setMode('sms');
    }
  };

  const optionBtn = 'flex items-center w-full gap-4 p-5 rounded-2xl border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-left';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-700 p-6">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full"
      >
        <AnimatePresence mode="wait">
          {mode === 'options' && (
            <motion.div key="options" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-3xl font-bold text-center mb-1 text-gray-900">Get Your Receipt</h2>
              <p className="text-gray-500 text-center mb-8">Choose how you'd like to receive it</p>
              <div className="space-y-3">
                <button onClick={() => setMode('qr')} className={optionBtn}>
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <QrCode className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-lg text-gray-900">QR Code</p>
                    <p className="text-sm text-gray-500">Scan with your phone camera</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>

                <button onClick={() => setMode('sms')} className={optionBtn}>
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-lg text-gray-900">SMS Text</p>
                    <p className="text-sm text-gray-500">Send link to your phone</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>

                <button onClick={onReturnToIdle} className="flex items-center w-full gap-4 p-5 rounded-2xl border-2 border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-all text-left">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <X className="w-6 h-6 text-gray-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-lg text-gray-700">No Receipt</p>
                    <p className="text-sm text-gray-500">Skip and continue</p>
                  </div>
                </button>
              </div>
            </motion.div>
          )}

          {mode === 'qr' && (
            <motion.div key="qr" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-2xl font-bold text-center mb-1 text-gray-900">Scan for Digital Receipt</h2>
              <p className="text-gray-500 text-center mb-6">Point your phone camera at the code</p>
              <div className="flex justify-center mb-6">
                <div className="p-3 bg-white rounded-2xl border-2 border-gray-200 shadow-sm">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=0&data=${encodeURIComponent(receiptUrl)}`}
                    alt="Receipt QR Code"
                    className="w-60 h-60"
                  />
                </div>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full">
                  <span className="text-gray-600">Returning to idle in</span>
                  <span className="font-bold text-blue-600 text-lg">{countdown}</span>
                  <span className="text-gray-600">seconds</span>
                </div>
                <div className="mt-4">
                  <Button variant="ghost" size="sm" onClick={onReturnToIdle}>Done</Button>
                </div>
              </div>
            </motion.div>
          )}

          {mode === 'sms' && (
            <motion.div key="sms" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <button onClick={() => setMode('options')} className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-4 text-sm">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <h2 className="text-2xl font-bold text-center mb-1 text-gray-900">Text My Receipt</h2>
              <p className="text-gray-500 text-center mb-6">Enter your mobile number and carrier</p>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Phone Number</label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    placeholder="(555) 123-4567"
                    inputMode="tel"
                    className="text-lg h-12"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Carrier</label>
                  <Select value={carrier} onValueChange={setCarrier}>
                    <SelectTrigger className="h-12 text-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CARRIERS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                <Button onClick={handleSendSms} className="w-full h-12 text-lg">Send Receipt Link</Button>
              </div>
            </motion.div>
          )}

          {mode === 'sending' && (
            <motion.div key="sending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-12 text-center">
              <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-600 mb-4" />
              <p className="text-gray-600 text-lg">Sending receipt link...</p>
            </motion.div>
          )}

          {mode === 'sent' && (
            <motion.div key="sent" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="py-8 text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}>
                <CheckCircle className="w-20 h-20 mx-auto text-green-500 mb-4" strokeWidth={1.5} />
              </motion.div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Receipt Sent!</h2>
              <p className="text-gray-500">Check your phone for the link</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}