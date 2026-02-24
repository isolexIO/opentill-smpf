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