import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import QRCode from 'npm:qrcode@1.5.3';

Deno.serve(async (req) => {
    try {
        console.log('generateSolanaPayQR: Starting...');
        
        const base44 = createClientFromRequest(req);
        
        // Allow unauthenticated calls for customer display
        try {
            await base44.auth.me();
        } catch (e) {
            console.log('generateSolanaPayQR: No auth (customer display)');
        }
        
        const body = await req.json();
        const { paymentUrl, size } = body;

        if (!paymentUrl) {
            console.error('generateSolanaPayQR: Missing paymentUrl');
            return Response.json({ 
                success: false,
                error: 'paymentUrl is required' 
            }, { status: 400 });
        }

        console.log('Generating QR for URL:', paymentUrl);
        console.log('QR size:', size || 400);

        // Generate QR code as data URL
        const qrCodeDataUrl = await QRCode.toDataURL(paymentUrl, {
            width: size || 400,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            },
            errorCorrectionLevel: 'M'
        });

        console.log('QR code generated successfully, length:', qrCodeDataUrl.length);

        return Response.json({ 
            success: true,
            qrCode: qrCodeDataUrl,
            qrCodeDataUrl: qrCodeDataUrl,
            paymentUrl: paymentUrl
        });

    } catch (error) {
        console.error('generateSolanaPayQR error:', error);
        return Response.json({ 
            success: false,
            error: 'Failed to generate QR code',
            details: error.message,
            stack: error.stack
        }, { status: 500 });
    }
});