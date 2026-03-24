import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { user_email } = body;

    if (!user_email || user_email !== user.email) {
      return Response.json(
        { success: false, error: 'Email mismatch' },
        { status: 400 }
      );
    }

    // Get builder
    const builders = await base44.asServiceRole.entities.Builder.filter({
      user_email,
    });

    if (!builders || builders.length === 0) {
      return Response.json(
        { success: false, error: 'Builder not found' },
        { status: 404 }
      );
    }

    const builder = builders[0];

    // In production, initiate actual Stripe Connect OAuth
    // For now, return a placeholder URL
    const stripeConnectUrl = `https://connect.stripe.com/oauth/authorize?client_id=${Deno.env.get('STRIPE_CLIENT_ID')}&state=${builder.id}&redirect_uri=${encodeURIComponent(
      'https://yourdomain.com/stripe-callback'
    )}&scope=read_write`;

    return Response.json({
      success: true,
      url: stripeConnectUrl,
    });
  } catch (error) {
    console.error('Error initiating Stripe Connect:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
});