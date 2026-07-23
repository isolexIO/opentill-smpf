import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { PublicKey } from 'npm:@solana/web3.js@1.95.8';
import nacl from 'npm:tweetnacl@1.0.3';

/**
 * Complete wallet user onboarding by creating user with full merchant info
 * SECURITY: requires a verified cryptographic signature proving ownership of
 * the wallet_address before creating any account, preventing registration
 * spoofing of arbitrary wallet addresses.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { wallet_address, wallet_type, business_name, owner_name, email, phone, signature_data } = await req.json();

    console.log('completeWalletOnboarding:', { wallet_address, wallet_type, business_name });

    if (!wallet_address || !wallet_type || !business_name || !owner_name) {
      return Response.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    // SECURITY: Verify cryptographic ownership of the wallet before onboarding.
    // The signed message must contain a fresh timestamp (within 5 minutes) and
    // bind to the claimed wallet_address, preventing replay and registration
    // spoofing of arbitrary wallet addresses.
    if (!signature_data || !signature_data.message) {
      return Response.json({
        success: false,
        error: 'Wallet signature is required to complete onboarding'
      }, { status: 401 });
    }
    const FRESHNESS_WINDOW_MS = 5 * 60 * 1000;
    const tsMatch = typeof signature_data.message === 'string'
      && signature_data.message.match(/Timestamp:\s*(\d+)/);
    if (!tsMatch) {
      return Response.json({ success: false, error: 'Missing timestamp in signed message' }, { status: 401 });
    }
    const msgTime = parseInt(tsMatch[1], 10);
    if (!Number.isFinite(msgTime) || Math.abs(Date.now() - msgTime) > FRESHNESS_WINDOW_MS) {
      return Response.json({ success: false, error: 'Signature timestamp expired or invalid' }, { status: 401 });
    }
    const walletMatch = typeof signature_data.message === 'string'
      && signature_data.message.match(/Wallet:\s*([A-Za-z0-9]+)/);
    if (walletMatch && walletMatch[1].toLowerCase() !== wallet_address.toLowerCase()) {
      return Response.json({ success: false, error: 'Signed message does not bind to this wallet' }, { status: 401 });
    }

    let signatureValid = false;
    if (['phantom', 'solflare', 'backpack', 'jupiter'].includes(wallet_type)) {
      try {
        const publicKey = new PublicKey(wallet_address);
        const messageBytes = new TextEncoder().encode(signature_data.message);
        const signatureBytes = new Uint8Array(signature_data.signature);
        signatureValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKey.toBytes());
      } catch (e) {
        signatureValid = false;
      }
    } else if (wallet_type === 'ethereum' || wallet_type === 'metamask') {
      try {
        const ethers = await import('npm:ethers@6.13.0');
        const recovered = ethers.verifyMessage(signature_data.message, signature_data.signature);
        signatureValid = recovered.toLowerCase() === wallet_address.toLowerCase();
      } catch (e) {
        signatureValid = false;
      }
    } else {
      return Response.json({
        success: false,
        error: `Unsupported wallet type: ${wallet_type}`
      }, { status: 400 });
    }
    if (!signatureValid) {
      return Response.json({ success: false, error: 'Invalid wallet signature' }, { status: 401 });
    }

    // Check if wallet already has an account (direct field lookup)
    const existingWalletUsers = await base44.asServiceRole.entities.User.filter({
      wallet_address: wallet_address
    });
    if (existingWalletUsers && existingWalletUsers.length > 0) {
      return Response.json({
        success: false,
        error: 'This wallet is already registered'
      }, { status: 409 });
    }

    // Create merchant account
    const merchant = await base44.asServiceRole.entities.Merchant.create({
      business_name: business_name,
      display_name: business_name,
      owner_email: email || wallet_address.toLowerCase(),
      owner_name: owner_name,
      phone: phone || '',
      status: 'trial',
      subscription_plan: 'pro',
      trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      activated_at: new Date().toISOString(),
      onboarding_completed: true,
      features_enabled: ['pos', 'inventory', 'reports', 'online_ordering', 'kitchen_display'],
      settings: {
        timezone: 'America/New_York',
        currency: 'USD',
        tax_rate: 0.08,
        enable_chainlink_payments: true,
        solana_pay: {
          enabled: false,
          network: 'mainnet',
          wallet_address: wallet_address,
          accepted_token: 'USDC',
          display_in_customer_terminal: true
        }
      }
    });

    console.log('Created merchant:', merchant.id);

    // Generate random PIN
    const randomPin = Math.floor(1000 + Math.random() * 9000).toString();

    // Create user
    const user = await base44.asServiceRole.entities.User.create({
      email: email || wallet_address.toLowerCase(),
      full_name: owner_name,
      pin: randomPin,
      role: 'merchant_admin',
      merchant_id: merchant.id,
      permissions: ['process_orders', 'manage_inventory', 'manage_users', 'view_reports', 'admin_settings', 'configure_payments', 'submit_tickets'],
      is_active: true,
      wallet_address: wallet_address,
      last_login: new Date().toISOString()
    });

    console.log('Created user:', user.id);

    // Log the account creation
    await base44.asServiceRole.entities.SystemLog.create({
      merchant_id: merchant.id,
      log_type: 'merchant_action',
      action: 'Wallet Onboarding Complete',
      description: `New merchant account created via ${wallet_type} wallet: ${business_name}`,
      user_email: email || wallet_address,
      user_id: user.id,
      severity: 'info'
    });

    return Response.json({
      success: true,
      user: user,
      merchant: merchant,
      message: 'Onboarding completed successfully'
    });

  } catch (error) {
    console.error('completeWalletOnboarding error:', error);
    return Response.json({
      success: false,
      error: error.message || 'Failed to complete onboarding'
    }, { status: 500 });
  }
});