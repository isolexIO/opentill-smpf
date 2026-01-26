import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertCircle, ExternalLink, Copy, Check } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function SolanaPayScreen({ order, settings, onPaymentComplete }) {
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
      console.log('SolanaPay: Initiating Solana payment...');
      setStatus('loading');
      setError(null);

      console.log('SolanaPay: Selected token:', token);

      // Convert USD amount to crypto amount
      let cryptoAmount = order.total;
      let price = null;

      if (token !== 'USDC' && token !== 'USDT') {
        console.log('SolanaPay: Converting USD to crypto...');
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
        console.log('SolanaPay: Conversion successful:', {
          usd: order.total,
          crypto: cryptoAmount,
          price: price
        });
      } else {
        setTokenAmount(cryptoAmount);
        setTokenPrice(1.0);
      }

      // Create Solana Pay transaction
      const txData = {
        recipient: settings?.solana_pay?.wallet_address,
        amount: cryptoAmount,
        label: `${settings?.business_name || 'ChainLINK POS'} Payment`,
        memo: `Order ${order.order_number}`,
        order_id: order.id,
        network: network,
        token: token,
        custom_token_mint: settings?.solana_pay?.custom_token_mint,
        custom_token_symbol: settings?.solana_pay?.custom_token_symbol,
        custom_token_decimals: settings?.solana_pay?.custom_token_decimals
      };

      console.log('SolanaPay: Creating transaction with data:', txData);

      const txResult = await base44.functions.invoke('createSolanaPayTransaction', txData);

      if (!txResult.data?.success) {
        throw new Error(txResult.data?.error || 'Failed to create payment URL');
      }

      console.log('SolanaPay: Transaction created successfully');
      setPaymentUrl(txResult.data.paymentUrl);
      setReference(txResult.data.reference);

      // Generate QR code
      console.log('SolanaPay: Generating QR code...');
      const qrResult = await base44.functions.invoke('generateSolanaPayQR', {
        paymentUrl: txResult.data.paymentUrl,
        size: 400
      });

      console.log('SolanaPay: QR generation response:', qrResult);

      if (!qrResult.data?.success) {
        console.error('SolanaPay: QR generation failed:', qrResult.data);
        throw new Error(qrResult.data?.error || 'Failed to generate QR code');
      }

      console.log('SolanaPay: QR code generated successfully');
      // Try both possible property names
      const qrDataUrl = qrResult.data.qrCodeDataUrl || qrResult.data.qrCode;
      if (!qrDataUrl) {
        throw new Error('QR code data not found in response');
      }
      setQrCode(qrDataUrl);
      setStatus('waiting');

    } catch (err) {
      console.error('SolanaPay: Error initiating payment:', err);
      setError(err.message || 'Failed to initialize Solana Pay');
      setStatus('error');
    }
  };

  const checkTransaction = async () => {
    try {
      setCheckAttempts(prev => prev + 1);
      console.log(`SolanaPay: Checking transaction (attempt ${checkAttempts + 1}/${MAX_CHECK_ATTEMPTS})...`);

      const result = await base44.functions.invoke('findSolanaPayTransaction', {
        reference: reference,
        network: network,
        recipient: settings?.solana_pay?.wallet_address
      });

      console.log('SolanaPay: Transaction check result:', result.data);

      if (result.data?.found && result.data?.confirmed) {
        console.log('SolanaPay: Transaction confirmed!', result.data.signature);
        setStatus('confirmed');
        
        // Wait 2 seconds then call onPaymentComplete
        setTimeout(() => {
          console.log('SolanaPay: Calling onPaymentComplete callback');
          if (onPaymentComplete) {
            onPaymentComplete(result.data.signature);
          }
        }, 2000);
      }
    } catch (error) {
      console.error('SolanaPay: Error checking transaction:', error);
      // Don't set error status, just continue polling
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
      <div className="flex flex-col items-center justify-center p-8">
        <Loader2 className="w-16 h-16 animate-spin text-blue-600 mb-4" />
        <p className="text-lg font-medium">Preparing Solana Pay...</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="w-16 h-16 text-red-600 mb-4" />
        <h3 className="text-xl font-bold mb-2">Payment Setup Failed</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={initiateSolanaPayment}>Try Again</Button>
      </div>
    );
  }

  if (status === 'confirmed') {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <CheckCircle className="w-20 h-20 text-green-600 mb-4 animate-bounce" />
        <h3 className="text-2xl font-bold mb-2">Payment Confirmed!</h3>
        <p className="text-gray-600">Your transaction has been confirmed on the Solana blockchain.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Scan to Pay with {token}</h2>
        <div className="space-y-1">
          <p className="text-3xl font-bold text-green-600">
            {tokenAmount.toFixed(token === 'SOL' ? 6 : 2)} {token}
          </p>
          <p className="text-lg text-gray-600">
            ≈ ${order.total.toFixed(2)} USD
          </p>
          {tokenPrice && token !== 'USDC' && token !== 'USDT' && (
            <p className="text-sm text-gray-500">
              1 {token} = ${tokenPrice.toFixed(2)}
            </p>
          )}
        </div>
      </div>

      {qrCode && (
        <div className="bg-white p-4 rounded-xl shadow-lg mb-6">
          <img src={qrCode} alt="Solana Pay QR Code" className="w-64 h-64" />
        </div>
      )}

      <div className="w-full mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyUrl}
            className="flex-1"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy Payment Link
              </>
            )}
          </Button>
          <a
            href={paymentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center"
          >
            <Button variant="outline" size="sm">
              <ExternalLink className="w-4 h-4" />
            </Button>
          </a>
        </div>
      </div>

      <div className="w-full space-y-2 mb-4">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Waiting for payment...</span>
          <span>{checkAttempts}/{MAX_CHECK_ATTEMPTS}</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <div className="text-center text-sm text-gray-500">
        <p>Scan the QR code with your Solana wallet</p>
        <p className="mt-1">or click the link to open your wallet app</p>
      </div>
    </div>
  );
}