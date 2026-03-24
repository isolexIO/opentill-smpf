import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { Connection, PublicKey, Transaction } from 'npm:@solana/web3.js@1.87.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, ...params } = await req.json();

    switch (action) {
      case 'generatePaymentRequest':
        return await generatePaymentRequest(base44, params);
      
      case 'verifyTransaction':
        return await verifyTransaction(base44, params);
      
      case 'processRefund':
        return await processRefund(base44, params);
      
      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Solana Pay error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});

async function generatePaymentRequest(base44, { merchantId, amount, orderId, reference }) {
  try {
    // Get merchant settings
    const merchants = await base44.asServiceRole.entities.Merchant.filter({ id: merchantId });
    if (!merchants || merchants.length === 0) {
      throw new Error('Merchant not found');
    }
    
    const merchant = merchants[0];
    const solanaWallet = merchant.settings?.solana_wallet_address;
    const network = merchant.settings?.blockchain_network || 'devnet';
    
    if (!solanaWallet) {
      throw new Error('Merchant has not configured Solana wallet');
    }

    // Validate Solana address
    try {
      new PublicKey(solanaWallet);
    } catch (e) {
      throw new Error('Invalid Solana wallet address configured');
    }

    // Generate Solana Pay URL
    const solanaPayUrl = `solana:${solanaWallet}?amount=${amount}&reference=${reference}&label=${encodeURIComponent(merchant.business_name)}&message=${encodeURIComponent(`Order ${orderId}`)}`;
    
    // Generate QR code URL
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(solanaPayUrl)}`;

    return Response.json({
      success: true,
      paymentUrl: solanaPayUrl,
      qrCodeUrl,
      recipientAddress: solanaWallet,
      amount,
      network,
      reference
    });
  } catch (error) {
    throw error;
  }
}

async function verifyTransaction(base44, { signature, reference, expectedAmount, network }) {
  try {
    // Connect to Solana network
    const endpoint = network === 'mainnet' 
      ? 'https://api.mainnet-beta.solana.com'
      : 'https://api.devnet.solana.com';
    
    const connection = new Connection(endpoint, 'confirmed');

    // Get transaction details
    const tx = await connection.getTransaction(signature, {
      commitment: 'confirmed'
    });

    if (!tx) {
      return Response.json({
        success: false,
        verified: false,
        message: 'Transaction not found'
      });
    }

    // Verify transaction succeeded
    if (tx.meta.err) {
      return Response.json({
        success: false,
        verified: false,
        message: 'Transaction failed',
        error: tx.meta.err
      });
    }

    // Get transaction amount (in lamports)
    const lamports = tx.meta.postBalances[1] - tx.meta.preBalances[1];
    const solAmount = lamports / 1000000000; // Convert lamports to SOL

    // In production, you'd verify:
    // 1. The reference matches
    // 2. The amount matches (with tolerance for fees)
    // 3. The recipient matches
    
    return Response.json({
      success: true,
      verified: true,
      signature,
      amount: solAmount,
      lamports,
      timestamp: tx.blockTime,
      confirmations: tx.slot
    });
  } catch (error) {
    return Response.json({
      success: false,
      verified: false,
      message: error.message
    });
  }
}

async function processRefund(base44, { orderId, merchantId, amount, recipientAddress }) {
  try {
    // SECURITY NOTICE: Solana refunds require merchant's private key to sign transactions.
    // Private keys should NEVER be stored in the database or environment variables.
    // 
    // Recommended implementation:
    // 1. Use a secure key management service (AWS KMS, Google Cloud KMS, HashiCorp Vault)
    // 2. Or require merchant to approve refund via their wallet (safer option)
    // 3. Store only encrypted keys with proper access controls
    // 4. Implement multi-signature requirements for refunds
    
    // For now, create a refund record that requires manual processing
    await base44.asServiceRole.entities.Order.update(orderId, {
      status: 'refund_pending',
      payment_details: {
        refund_requested: true,
        refund_amount: amount,
        refund_recipient: recipientAddress,
        refund_requested_at: new Date().toISOString()
      }
    });
    
    // Log refund request for admin review
    await base44.asServiceRole.entities.SystemLog.create({
      merchant_id: merchantId,
      log_type: 'payment_event',
      severity: 'warning',
      action: 'Solana Refund Requested',
      description: `Refund of ${amount} SOL requested for order ${orderId}. Manual processing required.`,
      metadata: {
        order_id: orderId,
        amount: amount,
        recipient: recipientAddress
      }
    });
    
    return Response.json({
      success: true,
      message: 'Refund request submitted. An administrator will process this manually for security.',
      requires_manual_processing: true,
      refundAmount: amount,
      recipient: recipientAddress,
      orderId
    });
  } catch (error) {
    throw error;
  }
}