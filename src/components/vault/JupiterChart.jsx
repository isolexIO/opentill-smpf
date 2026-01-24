import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function JupiterChart() {
  const chartRef = useRef(null);

  useEffect(() => {
    // Load Jupiter Terminal script
    const script = document.createElement('script');
    script.src = 'https://terminal.jup.ag/main-v2.js';
    script.async = true;
    script.onload = initializeTerminal;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const initializeTerminal = () => {
    if (window.Jupiter && chartRef.current) {
      window.Jupiter.init({
        displayMode: 'integrated',
        integratedTargetId: 'jupiter-terminal',
        endpoint: 'https://api.mainnet-beta.solana.com',
        defaultExplorer: 'Solscan',
        formProps: {
          initialInputMint: 'YOUR_CLINK_MINT_ADDRESS',
          initialOutputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
          fixedInputMint: true,
        },
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>$cLINK Chart & Trading</CardTitle>
      </CardHeader>
      <CardContent>
        <div 
          id="jupiter-terminal" 
          ref={chartRef}
          className="w-full"
          style={{ minHeight: '500px' }}
        />
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Powered by Jupiter</strong> - Trade $cLINK directly on Solana with the best rates
          </p>
        </div>
      </CardContent>
    </Card>
  );
}