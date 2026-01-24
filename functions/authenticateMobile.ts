import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { session_id, wallet_address, signature_data } = body;

    if (!session_id || !wallet_address) {
      return Response.json(
        { error: 'Session ID and wallet address required' },
        { status: 400 }
      );
    }

    // Verify signature
    // (In production, verify the signature properly)

    // Find or create user with this wallet address
    let users = await base44.asServiceRole.entities.User.filter({
      wallet_address: wallet_address
    });

    let user;
    if (users && users.length > 0) {
      user = users[0];
    } else {
      // Create new user
      user = await base44.asServiceRole.entities.User.create({
        email: `${wallet_address.substring(0, 8)}@wallet.chainlink`,
        full_name: `Jupiter User ${wallet_address.substring(0, 6)}`,
        wallet_address: wallet_address,
        role: 'merchant_admin',
        is_wallet_user: true
      });
    }

    // Create device session for polling
    await base44.asServiceRole.entities.DeviceSession.create({
      merchant_id: user.merchant_id,
      session_id: session_id,
      device_name: 'Jupiter Mobile',
      device_type: 'mobile',
      user_id: user.id,
      user_name: user.full_name,
      status: 'online',
      connected_at: new Date().toISOString(),
      last_heartbeat: new Date().toISOString()
    });

    // Log the action
    try {
      await base44.asServiceRole.entities.SystemLog.create({
        merchant_id: user.merchant_id || null,
        log_type: 'merchant_action',
        action: 'Jupiter Mobile Login',
        description: `User authenticated via Jupiter Mobile QR: ${wallet_address}`,
        user_email: user.email,
        user_id: user.id,
        severity: 'info'
      });
    } catch (logError) {
      console.log('Could not log mobile authentication:', logError);
    }

    return Response.json({
      success: true,
      user: user
    });

  } catch (error) {
    console.error('Mobile authentication error:', error);
    return Response.json(
      { error: 'Authentication failed', details: error.message },
      { status: 500 }
    );
  }
});