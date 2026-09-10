import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import QRCode from 'npm:qrcode@1.5.3';

// In-memory per-IP rate limiting. This function is a public, stateless QR
// generator called from the customer-facing checkout display, so it cannot
// require a logged-in user. Rate-limiting prevents anonymous resource abuse.
const ipHits = new Map<string, number[]>();
const IP_WINDOW_MS = 60_000;  // 1 minute
const IP_MAX = 30;

function getClientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

Deno.serve(async (req) => {
    try {
        // Rate-limit anonymous callers to protect this public endpoint.
        const now = Date.now();
        const clientIp = getClientIp(req);
        const hits = (ipHits.get(clientIp) || []).filter(t => now - t < IP_WINDOW_MS);
        if (hits.length >= IP_MAX) {
            return Response.json({
                success: false,
                error: 'Too many requests. Please try again later.'
            }, { status: 429 });
        }
        hits.push(now);
        ipHits.set(clientIp, hits);
        if (ipHits.size > 5000) ipHits.clear();

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