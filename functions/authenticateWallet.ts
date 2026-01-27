import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { PublicKey } from 'npm:@solana/web3.js@1.87.6';
import nacl from 'npm:tweetnacl@1.0.3';
import bs58 from 'npm:bs58@5.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { wallet_address, wallet_type, signature_data, merchant_id } = await req.json();

    console.log('authenticateWallet called:', {
      wallet_address,
      wallet_type,
      merchant_id
    });

    if (!wallet_address || !wallet_type) {
      return Response.json({
        success: false,
        error: 'wallet_address and wallet_type are required'
      }, { status: 400 });
    }

    // Verify signature based on wallet type
    let signatureValid = false;

    if (wallet_type === 'phantom' || wallet_type === 'solflare') {
      // Verify Solana signature
      try {
        const publicKey = new PublicKey(wallet_address);
        const messageBytes = new TextEncoder().encode(signature_data.message);
        const signatureBytes = new Uint8Array(signature_data.signature);

        signatureValid = nacl.sign.detached.verify(
          messageBytes,
          signatureBytes,
          publicKey.toBytes()
        );

        console.log('Solana signature verification:', signatureValid);
      } catch (error) {
        console.error('Solana signature verification error:', error);
        signatureValid = false;
      }
    } else if (wallet_type === 'ethereum' || wallet_type === 'metamask') {
      // Verify Ethereum signature using ethers
      try {
        const ethers = await import('npm:ethers@6.13.0');
        
        const recoveredAddress = ethers.verifyMessage(
          signature_data.message,
          signature_data.signature
        );
        
        signatureValid = recoveredAddress.toLowerCase() === wallet_address.toLowerCase();
        console.log('Ethereum signature verification:', signatureValid);
      } catch (error) {
        console.error('Ethereum signature verification error:', error);
        signatureValid = false;
      }
    } else {
      // For other wallet types, verify they at least provided signature data
      signatureValid = signature_data && signature_data.signature && signature_data.signature.length > 0;
      console.log('Generic wallet signature present:', signatureValid);
    }

    if (!signatureValid) {
      return Response.json({
        success: false,
        error: 'Invalid wallet signature'
      }, { status: 401 });
    }

    // First, check if this wallet is linked to an existing user via pos_settings
    const walletField = `${wallet_type}_wallet`;
    // For efficient lookup, ideally the database would support querying nested JSON fields.
    // As a workaround, we fetch all users and iterate. For a large number of users, this
    // might become inefficient and would require a more advanced database query mechanism
    // if available or a denormalized field.
    const allUsers = await base44.asServiceRole.entities.User.list();
    let linkedUser = null;

    for (const u of allUsers) {
      if (u.pos_settings?.[walletField] === wallet_address) {
        linkedUser = u;
        break;
      }
    }

    let user;

    if (linkedUser) {
      // Wallet is linked to an existing user - log them in
      user = linkedUser;
      console.log('Found user with linked wallet:', user.id);

      // Update last login
      await base44.asServiceRole.entities.User.update(user.id, {
        last_login: new Date().toISOString()
      });

    } else {
      // Check if user exists with wallet address as email (legacy behavior)
      const existingUsers = await base44.asServiceRole.entities.User.filter({
        email: wallet_address.toLowerCase()
      });

      if (existingUsers && existingUsers.length > 0) {
        // User exists with wallet address as email, use this user
        user = existingUsers[0];
        console.log('Existing wallet user found by email:', user.id);

        // Update last login
        await base44.asServiceRole.entities.User.update(user.id, {
          last_login: new Date().toISOString()
        });

      } else {
        // No existing user found - new user, needs onboarding
        console.log('New wallet user - needs onboarding');

        return Response.json({
          success: true,
          is_new_user: true,
          wallet_address: wallet_address,
          wallet_type: wallet_type,
          message: 'New user - onboarding required'
        });
      }
    }

    return Response.json({
      success: true,
      user: user,
      is_new_user: false,
      message: 'Wallet authenticated successfully'
    });

  } catch (error) {
    console.error('authenticateWallet error:', error);
    return Response.json({
      success: false,
      error: error.message || 'Wallet authentication failed'
    }, { status: 500 });
  }
});