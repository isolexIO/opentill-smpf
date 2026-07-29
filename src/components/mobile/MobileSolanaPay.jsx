import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertCircle, ExternalLink, Copy, Check, ArrowLeft } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function MobileSolanaPay({ order, settings, merchant, onPaymentComplete, onBack }) {
  const [qrCode, setQrCode] = useState(null);
  const [paymentUrl, setPaymentUrl] = useState('');
  const [reference, setReference] = useState('');
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [tokenAmount, setTokenAmount] = useState(0);
  const [tokenPrice, setTokenPrice] = useState(null);
  const [checkAttempts, setCheckAttempts] = useState(0);
  const [copied, setCopied] = useState(false);
  const MAX_CHECK_ATTEMPTS = 120;

  const token = settings?.solana_pay?.accepted_token || 'USDC';
  const network = settings?.solana_pay?.network || 'mainnet';

  useEffect(() => {
    initiateSolanaPayment();
  }, []);

  useEffect(() => {
    if (status === 'waiting' && reference && checkAttempts < MAX_CHECK_ATTEMPTS) {
      const timer = setTimeout(() => {
        checkTransaction();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status, reference, checkAttempts]);

  const initiateSolanaPayment = async () => {
    try {
      setStatus('loading');
      setError(null);

      let cryptoAmount = order.total;
      let price = null;

      if (token !== 'USDC' && token !== 'USDT') {
        const conversionResult = await base44.functions.invoke('convertUSDToCrypto', {
          usd_amount: order.total,
          token: token,
          network: network
        });

        if (!conversionResult.data?.success) {
          throw new Error(conversionResult.data?.error || 'Failed to convert USD to crypto');
        }

        cryptoAmount = conversionResult.data.crypto_amount;
        price = conversionResult.data.token_price;
        setTokenAmount(cryptoAmount);
        setTokenPrice(price);
      } else {
        setTokenAmount(cryptoAmount);
        setTokenPrice(1.0);
      }

      const businessName = merchant?.business_name || 'openTILL';
      const businessAddress = merchant?.address || '';
      const itemList = (order.items || [])
        .map(item => `${item.quantity}x ${item.product_name || 'Item'}`)
        .join(', ');

      const txData = {
        recipient: settings?.solana_pay?.wallet_address,
        amount: cryptoAmount,
        label: businessName,
        message: itemList || `Order ${order.order_number}`,
        memo: businessAddress ? `${businessName} - ${businessAddress}` : businessName,
        order_id: order.id,
        network: network,
        token: token,
        custom_token_mint: settings?.solana_pay?.custom_token_mint,
        custom_token_symbol: settings?.solana_pay?.custom_token_symbol,
        custom_token_decimals: settings?.solana_pay?.custom_token_decimals
      };

      const txResult = await base44.functions.invoke('createSolanaPayTransaction', txData);

      if (!txResult.data?.success) {
        throw new Error(txResult.data?.error || 'Failed to create payment URL');
      }

      setPaymentUrl(txResult.data.paymentUrl);
      setReference(txResult.data.reference);

      const qrResult = await base44.functions.invoke('generateSolanaPayQR', {
        paymentUrl: txResult.data.paymentUrl,
        size: 400
      });

      if (!qrResult.data?.success) {
        throw new Error(qrResult.data?.error || 'Failed to generate QR code');
      }

      const qrDataUrl = qrResult.data.qrCodeDataUrl || qrResult.data.qrCode;
      if (!qrDataUrl) {
        throw new Error('QR code data not found in response');
      }
      setQrCode(qrDataUrl);
      setStatus('waiting');
    } catch (err) {
      console.error('MobileSolanaPay: Error initiating payment:', err);
      setError(err.message || 'Failed to initialize Solana Pay');
      setStatus('error');
    }
  };

  const checkTransaction = async () => {
    try {
      setCheckAttempts(prev => prev + 1);

      const result = await base44.functions.invoke('findSolanaPayTransaction', {
        reference: reference,
        network: network,
        recipient: settings?.solana_pay?.wallet_address
      });

      if (result.data?.found && result.data?.confirmed) {
        setStatus('confirmed');
        setTimeout(() => {
          if (onPaymentComplete) {
            onPaymentComplete(true, {
              payment_method: 'solana_pay',
              signature: result.data.signature,
              timestamp: new Date().toISOString()
            });
          }
        }, 2000);
      }
    } catch (error) {
      console.error('MobileSolanaPay: Error checking transaction:', error);
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(paymentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const progress = (checkAttempts / MAX_CHECK_ATTEMPTS) * 100;

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
        <p className="text-lg font-medium text-gray-600">Preparing Solana Pay...</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <AlertCircle className="w-16 h-16 text-red-600 mb-4" />
        <h3 className="text-xl font-bold mb-2">Payment Setup Failed</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={initiateSolanaPayment} className="mb-2">Try Again</Button>
        {onBack && <Button variant="outline" onClick={onBack}>Back</Button>}
      </div>
    );
  }

  if (status === 'confirmed') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-500 to-emerald-600 text-white p-6">
        <CheckCircle className="w-20 h-20 mb-4 animate-bounce" />
        <h3 className="text-2xl font-bold mb-2">Payment Confirmed!</h3>
        <p className="text-gray-100">Your transaction has been confirmed on the Solana blockchain.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-purple-600 text-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        {onBack && (
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <h1 className="text-lg font-bold">Solana Pay</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center">
        <div className="text-center mb-6 mt-4">
          <h2 className="text-xl font-bold mb-2">Scan to Pay with {token}</h2>
          <p className="text-3xl font-bold text-purple-600">
            {tokenAmount.toFixed(token === 'SOL' ? 6 : 2)} {token}
          </p>
          <p className="text-lg text-gray-600">≈ ${order.total.toFixed(2)} USD</p>
          {tokenPrice && token !== 'USDC' && token !== 'USDT' && (
            <p className="text-sm text-gray-500">1 {token} = ${tokenPrice.toFixed(2)}</p>
          )}
        </div>

        {qrCode && (
          <div className="bg-white p-4 rounded-xl shadow-lg mb-6">
            <img src={qrCode} alt="Solana Pay QR Code" className="w-56 h-56 sm:w-64 sm:h-64" />
          </div>
        )}

        <div className="w-full max-w-sm mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Button variant="outline" size="sm" onClick={handleCopyUrl} className="flex-1">
              {copied ? (
                <><Check className="w-4 h-4 mr-2" />Copied!</>
              ) : (
                <><Copy className="w-4 h-4 mr-2" />Copy Link</>
              )}
            </Button>
            <a href={paymentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center">
              <Button variant="outline" size="sm">
                <ExternalLink className="w-4 h-4" />
              </Button>
            </a>
          </div>
        </div>

        <div className="w-full max-w-sm space-y-2 mb-4">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Waiting for payment...</span>
            <span>{checkAttempts}/{MAX_CHECK_ATTEMPTS}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="text-center text-sm text-gray-500">
          <p>Scan the QR code with your Solana wallet</p>
          <p className="mt-1">or tap the link to open your wallet app</p>
        </div>
      </div>
    </div>
  );
}