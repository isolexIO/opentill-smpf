import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader, CreditCard, ShieldCheck, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function CardPaymentStatusScreen({ order, settings, onComplete, onPaymentSuccess }) {
  // Support both prop names
  const handleComplete = onComplete || onPaymentSuccess;
  const [status, setStatus] = useState('processing'); // processing, succeeded, failed
  const [pollingCount, setPollingCount] = useState(0);

  useEffect(() => {
    if (!order) return;

    // Poll the order status to detect when POS completes payment
    const pollInterval = setInterval(async () => {
      setPollingCount(prev => prev + 1);

      try {
        const updatedOrders = await base44.entities.Order.filter({ id: order.id });
        const updatedOrder = updatedOrders[0];
        
        if (updatedOrder.status === 'completed') {
        setStatus('succeeded');
        clearInterval(pollInterval);
        setTimeout(() => {
          if (handleComplete) {
            handleComplete(true, { payment_method: 'card', timestamp: new Date().toISOString() });
          }
        }, 2000);
        } else if (updatedOrder.status === 'cancelled' || 
                 (updatedOrder.status === 'ready_for_payment' && updatedOrder.payment_method === 'pending')) {
        setStatus('failed');
        clearInterval(pollInterval);
        setTimeout(() => {
          if (handleComplete) handleComplete(false, {});
        }, 3000);
        }
      } catch (error) {
        console.error('Error polling order status:', error);
      }

      // Timeout after 2 minutes
      if (pollingCount > 60) {
        setStatus('failed');
        clearInterval(pollInterval);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [order, pollingCount]);

  const statusConfig = {
    processing: {
      icon: Loader,
      text: 'Processing Payment...',
      subtext: 'Please wait while we authorize your card',
      color: 'text-blue-400',
      bgGradient: 'from-blue-900 to-indigo-900',
      animate: true,
    },
    succeeded: {
      icon: ShieldCheck,
      text: 'Payment Approved',
      subtext: 'Thank you for your payment',
      color: 'text-green-400',
      bgGradient: 'from-green-900 to-emerald-900',
      animate: false,
    },
    failed: {
      icon: AlertTriangle,
      text: 'Payment Declined',
      subtext: 'Please try another payment method',
      color: 'text-red-400',
      bgGradient: 'from-red-900 to-orange-900',
      animate: false,
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={`w-full h-full flex flex-col items-center justify-center text-white p-12 bg-gradient-to-br ${config.bgGradient}`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center flex flex-col items-center gap-8"
      >
        <CreditCard className="w-24 h-24 text-white/50" />
        <div className="flex flex-col items-center gap-4">
          <Icon className={`w-16 h-16 ${config.color} ${config.animate ? 'animate-spin' : ''}`} />
          <h1 className="text-5xl font-bold">{config.text}</h1>
          <p className="text-xl text-white/70">{config.subtext}</p>
        </div>
        
        {status === 'processing' && (
          <p className="text-sm text-white/50 mt-4">
            Do not close this screen or press any buttons
          </p>
        )}
      </motion.div>
    </div>
  );
}