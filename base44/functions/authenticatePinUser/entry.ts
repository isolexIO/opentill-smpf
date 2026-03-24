import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Simple in-memory rate limiting (in production, use Redis)
const rateLimitMap = new Map();
const RATE_LIMIT = 5; // Max attempts
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(ipAddress) {
  const now = Date.now();
  const key = ipAddress;
  
  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, []);
  }
  
  const attempts = rateLimitMap.get(key);
  
  // Remove old attempts outside the window
  const recentAttempts = attempts.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);
  rateLimitMap.set(key, recentAttempts);
  
  if (recentAttempts.length >= RATE_LIMIT) {
    return false; // Rate limited
  }
  
  recentAttempts.push(now);
  return true; // OK
}

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { pin } = body;
    
    if (!pin || typeof pin !== 'string') {
      return Response.json(
        { success: false, error: 'Invalid PIN provided' },
        { status: 400 }
      );
    }
    
    // Get client IP for rate limiting
    const ipAddress = req.headers.get('x-forwarded-for') || 
                      req.headers.get('x-real-ip') || 
                      req.remote?.hostname || 
                      'unknown';
    
    // Check rate limit
    if (!checkRateLimit(ipAddress)) {
      return Response.json(
        { success: false, error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }
    
    const base44 = createClientFromRequest(req);
    
    // Use service role to securely look up PIN - never expose all users
    let user;
    try {
      const users = await base44.asServiceRole.entities.User.filter({ pin });
      
      if (!users || users.length === 0) {
        // Generic error - don't reveal if PIN exists
        return Response.json(
          { success: false, error: 'Invalid PIN. Please try again.' },
          { status: 401 }
        );
      }
      
      user = users[0];
    } catch (error) {
      console.error('Error looking up user by PIN:', error);
      return Response.json(
        { success: false, error: 'Authentication failed' },
        { status: 500 }
      );
    }
    
    // Verify user is active
    if (!user.is_active) {
      return Response.json(
        { success: false, error: 'Your account is inactive. Please contact support.' },
        { status: 403 }
      );
    }
    
    // Update last login
    try {
      await base44.asServiceRole.entities.User.update(user.id, {
        last_login: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Could not update last login:', e);
    }
    
    // Log successful authentication
    try {
      await base44.asServiceRole.entities.SystemLog.create({
        merchant_id: user.merchant_id || null,
        log_type: 'merchant_action',
        action: 'User PIN Login',
        description: `User ${user.full_name} logged in via PIN`,
        user_id: user.id,
        user_email: user.email,
        user_role: user.role,
        ip_address: ipAddress,
        severity: 'info'
      });
    } catch (logError) {
      console.warn('Could not create log:', logError);
    }
    
    // Return user (without sensitive fields)
    return Response.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        merchant_id: user.merchant_id,
        dealer_id: user.dealer_id,
        is_active: user.is_active,
        pos_settings: user.pos_settings || {}
      }
    });
    
  } catch (error) {
    console.error('authenticatePinUser ERROR:', error);
    return Response.json(
      { success: false, error: 'Authentication service error' },
      { status: 500 }
    );
  }
});