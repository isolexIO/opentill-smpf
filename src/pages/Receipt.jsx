import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Loader2, Printer, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Receipt() {
  const { orderId } = useParams();
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadReceipt();
  }, [orderId]);

  const loadReceipt = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('getPublicReceipt', { order_id: orderId });
      if (res.data?.success) {
        setReceipt(res.data);
      } else {
        setError(res.data?.error || 'Failed to load receipt');
      }
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Failed to load receipt');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
          <p className="text-red-600 text-lg mb-4">{error}</p>
          <Button onClick={loadReceipt} variant="outline">Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-md mx-auto bg-white min-h-screen shadow-lg relative">
        <div className="sticky top-0 bg-white/90 backdrop-blur border-b px-4 py-3 flex items-center justify-between z-10">
          <h1 className="font-bold text-base text-gray-900">Digital Receipt</h1>
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-1" /> Print
          </Button>
        </div>
        <div dangerouslySetInnerHTML={{ __html: receipt?.receipt_html }} />
      </div>
    </div>
  );
}