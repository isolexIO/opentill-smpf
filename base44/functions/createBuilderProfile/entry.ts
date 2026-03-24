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
      user_email,
      full_name,
      company_name,
      bio,
      website,
      github_url,
      twitter_url,
      support_email,
    } = body;

    if (!user_email || !full_name || !company_name) {
      return Response.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if builder already exists
    const existing = await base44.asServiceRole.entities.Builder.filter({
      user_email,
    });

    if (existing && existing.length > 0) {
      return Response.json(
        { success: false, error: 'Builder profile already exists' },
        { status: 400 }
      );
    }

    // Create builder
    const builder = await base44.asServiceRole.entities.Builder.create({
      user_email,
      full_name,
      company_name,
      bio: bio || '',
      website: website || '',
      github_url: github_url || '',
      twitter_url: twitter_url || '',
      support_email: support_email || user_email,
      status: 'pending',
    });

    // Send confirmation email
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: user_email,
        subject: 'Welcome to the openTILL Builder Program!',
        body: `
          <h2>Welcome to the openTILL Builder Program, ${full_name}!</h2>
          <p>Your builder profile for <strong>${company_name}</strong> has been submitted and is under review.</p>
          <h3>How to Log In</h3>
          <p>Use the same account you signed up with to access your Builder Dashboard:</p>
          <ul>
            <li><strong>Google Sign-In</strong> (recommended), or</li>
            <li><strong>Email magic link</strong> sent to ${user_email}</li>
          </ul>
          <p>Visit: <a href="https://chainlinkpos.isolex.io/builder-dashboard">Your Builder Dashboard</a></p>
          <p>Our team will review your application and you'll be notified once verified.</p>
          <p>Thank you for building with openTILL!</p>
        `,
      });
    } catch (emailError) {
      console.error('Failed to send builder welcome email:', emailError);
    }

    return Response.json({
      success: true,
      builder,
    });
  } catch (error) {
    console.error('Error creating builder profile:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
});