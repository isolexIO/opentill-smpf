import { encodeURL } from 'npm:@solana/pay@0.2.5';
import { PublicKey, Keypair } from 'npm:@solana/web3.js@1.87.6';
import BigNumber from 'npm:bignumber.js@9.1.2';

Deno.serve(async (req) => {
    try {
        console.log('createSolanaPayTransaction: Starting...');
        
        const body = await req.json();
        const { 
            recipient, 
            amount, 
            label, 
            memo, 
            order_id, 
            network, 
            token,
            custom_token_mint,
            custom_token_symbol,
            custom_token_decimals
        } = body;

        if (!recipient || !amount) {
            return Response.json({ 
                success: false,
                error: 'recipient and amount are required' 
            }, { status: 400 });
        }

        console.log('Creating Solana Pay transaction:', {
            recipient,
            amount,
            label,
            memo,
            order_id,
            network: network || 'mainnet',
            token: token || 'USDC'
        });

        // Validate recipient address
        let recipientPubkey;
        try {
            recipientPubkey = new PublicKey(recipient);
            console.log('Recipient public key validated:', recipientPubkey.toBase58());
        } catch (e) {
            console.error('Invalid recipient address:', e);
            return Response.json({ 
                success: false,
                error: 'Invalid Solana wallet address' 
            }, { status: 400 });
        }

        // Generate a unique reference for this transaction
        const reference = Keypair.generate().publicKey;
        console.log('Generated reference:', reference.toBase58());

        // Determine token details
        let splToken;
        let decimals;
        let actualToken;

        if (token === 'CUSTOM' && custom_token_mint) {
            try {
                splToken = new PublicKey(custom_token_mint);
                decimals = custom_token_decimals || 6;
                actualToken = custom_token_symbol || 'CUSTOM';
                console.log('Using custom token:', actualToken, 'Mint:', custom_token_mint, 'Decimals:', decimals);
            } catch (e) {
                console.error('Invalid custom token mint address:', e);
                return Response.json({ 
                    success: false,
                    error: 'Invalid custom token mint address' 
                }, { status: 400 });
            }
        } else if (token === 'SOL') {
            splToken = undefined;
            decimals = 9;
            actualToken = 'SOL';
            console.log('Using native SOL');
        } else if (token === 'USDC') {
            splToken = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
            decimals = 6;
            actualToken = 'USDC';
            console.log('Using USDC');
        } else if (token === 'USDT') {
            splToken = new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB');
            decimals = 6;
            actualToken = 'USDT';
            console.log('Using USDT');
        } else {
            splToken = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
            decimals = 6;
            actualToken = 'USDC';
            console.log('Defaulting to USDC');
        }

        // Create BigNumber with proper precision
        const amountBN = new BigNumber(amount);
        
        console.log('Amount details:', {
            original: amount,
            bigNumber: amountBN.toString(),
            token: actualToken,
            decimals,
            splToken: splToken?.toBase58()
        });

        // Build Solana Pay URL parameters
        const urlParams = {
            recipient: recipientPubkey,
            amount: amountBN,
            reference: reference,
            label: label || 'Payment',
            message: memo || 'Payment'
        };

        // Only add splToken if it's defined (not for native SOL)
        if (splToken) {
            urlParams.splToken = splToken;
        }

        // Add memo only if provided
        if (memo) {
            urlParams.memo = memo;
        }

        console.log('URL params:', {
            recipient: urlParams.recipient.toBase58(),
            amount: urlParams.amount.toString(),
            splToken: urlParams.splToken?.toBase58(),
            reference: urlParams.reference.toBase58(),
            label: urlParams.label,
            message: urlParams.message,
            memo: urlParams.memo
        });

        // Create payment URL using Solana Pay spec
        const url = encodeURL(urlParams);
        const paymentUrl = url.toString();
        
        console.log('Payment URL created:', paymentUrl);

        return Response.json({ 
            success: true,
            paymentUrl: paymentUrl,
            reference: reference.toBase58(),
            amount: amount,
            token: actualToken,
            decimals: decimals,
            recipient: recipient
        });

    } catch (error) {
        console.error('createSolanaPayTransaction error:', error);
        return Response.json({ 
            success: false,
            error: 'Failed to create Solana Pay transaction',
            details: error.message
        }, { status: 500 });
    }
});