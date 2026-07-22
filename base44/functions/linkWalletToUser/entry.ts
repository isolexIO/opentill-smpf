import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { PublicKey } from 'npm:@solana/web3.js@1.95.8';
import nacl from 'npm:tweetnacl@1.0.3';

const SOLANA_WALLET_TYPES = ['phantom', 'solflare', 'backpack', 'jupiter'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { wallet_address, wallet_type, signature_data } = await req.json();

    if (!wallet_address || !wallet_type) {
      return Response.json({ error: 'wallet_address and wallet_type are required' }, { status: 400 });
    }
    if (!signature_data || !signature_data.message) {
      return Response.json({ error: 'signature_data with message is required' }, { status: 400 });
    }

    // Verify the wallet signature to prove ownership before linking
    let signatureValid = false;

    if (SOLANA_WALLET_TYPES.includes(wallet_type)) {
      try {
        const publicKey = new PublicKey(wallet_address);
        const messageBytes = new TextEncoder().encode(signature_data.message);
        const signatureBytes = new Uint8Array(signature_data.signature);
        signatureValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKey.toBytes());
      } catch (error) {
        console.error('Solana signature verification error:', error);
        signatureValid = false;
      }
    } else if (wallet_type === 'ethereum' || wallet_type === 'metamask') {
      try {
        const ethers = await import('npm:ethers@6.13.0');
        const recoveredAddress = ethers.verifyMessage(signature_data.message, signature_data.signature);
        signatureValid = recoveredAddress.toLowerCase() === wallet_address.toLowerCase();
      } catch (error) {
        console.error('Ethereum signature verification error:', error);
        signatureValid = false;
      }
    } else {
      return Response.json({
        error: `Unsupported wallet type: ${wallet_type}. Supported: phantom, solflare, backpack, jupiter, ethereum, metamask.`
      }, { status: 400 });
    }

    if (!signatureValid) {
      return Response.json({ error: 'Invalid wallet signature' }, { status: 401 });
    }

    // Store the wallet in pos_settings.{walletType}_wallet and set as primary wallet_address
    const walletField = `${wallet_type}_wallet`;
    const updatedPosSettings = {
      ...(user.pos_settings || {}),
      [walletField]: wallet_address
    };

    await base44.auth.updateMe({
      wallet_address: wallet_address,
      pos_settings: updatedPosSettings
    });

    // Log the action
    await base44.asServiceRole.entities.SystemLog.create({
      merchant_id: user.merchant_id || null,
      log_type: 'merchant_action',
      severity: 'info',
      action: 'Wallet Linked',
      description: `User ${user.email} linked ${wallet_type} wallet: ${wallet_address}`,
      user_id: user.id,
      user_email: user.email,
      user_role: user.role,
      metadata: { wallet_address, wallet_type }
    });

    return Response.json({
      success: true,
      wallet_address: wallet_address
    });

  } catch (error) {
    console.error('Link wallet error:', error);
    return Response.json({
      error: error.message,
      success: false
    }, { status: 500 });
  }
});