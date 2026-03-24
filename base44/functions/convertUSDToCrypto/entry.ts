Deno.serve(async (req) => {
    try {
        console.log('convertUSDToCrypto: Starting...');
        
        const body = await req.json();
        const { usd_amount, token, network } = body;

        if (!usd_amount || !token) {
            return Response.json({ 
                success: false,
                error: 'usd_amount and token are required' 
            }, { status: 400 });
        }

        console.log('Converting USD to crypto:', {
            usd_amount,
            token,
            network: network || 'mainnet'
        });

        let tokenPrice = null;
        let cryptoAmount = null;

        // For stablecoins, use 1:1 ratio
        if (token === 'USDC' || token === 'USDT') {
            tokenPrice = 1.0;
            cryptoAmount = parseFloat(usd_amount);
            console.log('Using 1:1 ratio for stablecoin');
        } else if (token === 'SOL') {
            // Fetch current SOL price from CoinGecko API
            try {
                const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
                const data = await response.json();
                
                if (data.solana && data.solana.usd) {
                    tokenPrice = data.solana.usd;
                    cryptoAmount = parseFloat(usd_amount) / tokenPrice;
                    console.log('SOL price fetched:', tokenPrice);
                    console.log('Calculated amount (raw):', cryptoAmount, 'SOL');
                } else {
                    throw new Error('Unable to fetch SOL price from CoinGecko');
                }
            } catch (fetchError) {
                console.error('Error fetching SOL price:', fetchError);
                
                // Fallback: Try alternative API
                try {
                    const response = await fetch('https://api.coinbase.com/v2/exchange-rates?currency=SOL');
                    const data = await response.json();
                    
                    if (data.data && data.data.rates && data.data.rates.USD) {
                        tokenPrice = parseFloat(data.data.rates.USD);
                        cryptoAmount = parseFloat(usd_amount) / tokenPrice;
                        console.log('SOL price from Coinbase:', tokenPrice);
                    } else {
                        throw new Error('Unable to fetch price from backup source');
                    }
                } catch (backupError) {
                    console.error('Backup price fetch failed:', backupError);
                    throw new Error('Unable to fetch current SOL price. Please try again in a moment.');
                }
            }
        } else {
            // For other tokens, return error (custom tokens would need their own price source)
            return Response.json({ 
                success: false,
                error: `Price conversion not supported for token: ${token}. Please use stablecoins or configure custom pricing.`
            }, { status: 400 });
        }

        // Determine appropriate decimals based on token
        const decimals = token === 'SOL' ? 9 : 6;
        
        // For display purposes, keep full precision but return both formatted and raw
        const cryptoAmountRaw = cryptoAmount; // Keep full precision
        const cryptoAmountFormatted = token === 'SOL' 
            ? cryptoAmount.toFixed(6) // Show 6 decimals for SOL (enough precision for most cases)
            : cryptoAmount.toFixed(2); // Show 2 decimals for stablecoins

        console.log('Conversion result:', {
            raw: cryptoAmountRaw,
            formatted: cryptoAmountFormatted,
            decimals: decimals
        });

        return Response.json({ 
            success: true,
            usd_amount: parseFloat(usd_amount),
            token: token,
            token_price: tokenPrice,
            crypto_amount: cryptoAmountRaw, // Full precision for blockchain
            crypto_amount_formatted: cryptoAmountFormatted, // For display
            decimals: decimals,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('convertUSDToCrypto error:', error);
        return Response.json({ 
            success: false,
            error: 'Failed to convert USD to crypto',
            details: error.message
        }, { status: 500 });
    }
});