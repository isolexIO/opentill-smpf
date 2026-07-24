import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      builder_id,
      name,
      short_description,
      description,
      category,
      repository_url,
      documentation_url,
      demo_url,
      logo_url,
      pricing_model,
      price,
      billing_period,
      keywords,
    } = body;

    if (!builder_id || !name || !description || !repository_url || !category) {
      return Response.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // SECURITY: Verify the caller actually owns this Builder profile.
    // Resolve the builder from the authenticated user's email rather than
    // trusting the client-supplied builder_id/builder_email, which would
    // allow an attacker to submit chips under another developer's profile.
    const builders = await base44.asServiceRole.entities.Builder.filter({
      user_email: user.email,
    });

    if (!builders || builders.length === 0) {
      return Response.json(
        { success: false, error: 'No verified builder profile found for your account' },
        { status: 403 }
      );
    }

    const verifiedBuilder = builders.find(b => b.id === builder_id);
    if (!verifiedBuilder) {
      return Response.json(
        { success: false, error: 'Forbidden: you can only submit chips under your own builder profile' },
        { status: 403 }
      );
    }

    // Use the verified builder's email, ignoring any client-supplied value.
    const builder_email = verifiedBuilder.user_email;

    // Create chip submission
    const submission = await base44.asServiceRole.entities.ChipSubmission.create({
      builder_id,
      builder_email,
      name,
      short_description,
      description,
      category,
      repository_url,
      documentation_url: documentation_url || '',
      demo_url: demo_url || '',
      logo_url: logo_url || '',
      pricing_model,
      price: price || 0,
      billing_period,
      keywords: keywords || [],
      status: 'submitted',
    });

    // Update builder's total_chips count
    const builder = await base44.asServiceRole.entities.Builder.filter({
      id: builder_id,
    });

    if (builder && builder.length > 0) {
      await base44.asServiceRole.entities.Builder.update(builder_id, {
        total_chips: (builder[0].total_chips || 0) + 1,
      });
    }

    return Response.json({
      success: true,
      submission,
    });
  } catch (error) {
    console.error('Error submitting chip:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
});