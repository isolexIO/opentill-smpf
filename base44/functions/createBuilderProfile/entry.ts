import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Escape user-supplied strings before interpolating into HTML email bodies
// to prevent HTML injection / content spoofing (CWE-79).
function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const slugifyName = (name) =>
  (name || '').toLowerCase().trim().replace(/&/g, 'and').replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').substring(0, 32) || 'site';

async function assignBuilderSubdomain(base44, builderId, name) {
  const base = slugifyName(name);
  let slug = base;
  let counter = 1;
  for (;;) {
    let taken = false;
    for (const e of ['Merchant', 'Ambassador', 'Builder']) {
      const matches = await base44.asServiceRole.entities[e].filter({ opentill_subdomain: slug });
      if (matches && matches.some((m) => m.id !== builderId)) { taken = true; break; }
    }
    if (!taken) break;
    slug = `${base}-${counter}`.substring(0, 32);
    counter++;
    if (counter > 50) break;
  }
  const now = new Date().toISOString();
  await base44.asServiceRole.entities.Builder.update(builderId, {
    opentill_subdomain: slug,
    subdomain_status: 'active',
    subdomain_requested_at: now,
    subdomain_approved_at: now,
  });
  return `${slug}.openTILL.io`;
}

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

    // SECURITY: A builder profile may only be created for the authenticated
    // caller's own email, preventing identity spoofing / profile squatting.
    if (!user_email || user.email.toLowerCase() !== user_email.toLowerCase()) {
      return Response.json(
        { success: false, error: 'Forbidden: builder email must match your authenticated account' },
        { status: 403 }
      );
    }

    if (!full_name || !company_name) {
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

    // Auto-assign a <companyName>.openTILL.io DNS subdomain.
    try {
      await assignBuilderSubdomain(base44, builder.id, company_name || full_name);
    } catch (subErr) {
      console.error('Failed to auto-assign builder subdomain:', subErr);
    }

    // Generate a unique 6-digit PIN for quick login
    let builderPin = null;
    try {
      let pinIsUnique = false;
      let attempts = 0;
      while (!pinIsUnique && attempts < 10) {
        const randomBytes = crypto.getRandomValues(new Uint32Array(1));
        const candidate = (100000 + (randomBytes[0] % 900000)).toString();
        const existingPinUsers = await base44.asServiceRole.entities.User.filter({ pin: candidate });
        if (!existingPinUsers || existingPinUsers.length === 0) {
          builderPin = candidate;
          pinIsUnique = true;
        } else {
          attempts++;
        }
      }
      if (builderPin) {
        await base44.asServiceRole.entities.User.update(user.id, { pin: builderPin });
      }
    } catch (pinError) {
      console.error('Failed to generate/set builder PIN:', pinError);
    }

    // Derive app URL from request origin
    const origin = req.headers.get('origin') || req.headers.get('referer') || 'https://opentill.openTILL.io';
    const appUrl = origin.replace(/\/$/, '');

    // Send confirmation email with openTILL credentials
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: user_email,
        subject: 'Welcome to the openTILL Builder Program — Your Credentials Inside',
        body: `
          <h2>Welcome to the openTILL Builder Program, ${escapeHtml(full_name)}!</h2>
          <p>Your builder profile for <strong>${escapeHtml(company_name)}</strong> has been submitted and is under review.</p>
          ${builderPin ? `
          <div style="background:#f4f4f5;border:1px solid #e4e4e7;border-radius:12px;padding:24px;margin:24px 0;">
            <p style="margin:0 0 16px 0;font-size:13px;font-weight:700;color:#3f3f46;text-transform:uppercase;letter-spacing:0.5px;">Your openTILL Login Credentials</p>
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding:8px 0;font-size:14px;color:#71717a;font-weight:500;width:140px;">Login Email</td>
                <td style="padding:8px 0;font-size:14px;color:#18181b;font-weight:600;font-family:monospace;">${escapeHtml(user_email)}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;font-size:14px;color:#71717a;font-weight:500;">Quick-Login PIN</td>
                <td style="padding:8px 0;font-size:22px;color:#7B2FD6;font-weight:800;font-family:monospace;letter-spacing:4px;">${escapeHtml(builderPin)}</td>
              </tr>
            </table>
          </div>
          <div style="text-align:center;margin:32px 0;">
            <a href="${appUrl}/BuilderDashboard" style="display:inline-block;padding:14px 40px;background:linear-gradient(90deg,#7B2FD6 0%,#0FD17A 100%);color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;border-radius:10px;box-shadow:0 2px 8px rgba(123,47,214,0.3);">Go to Builder Dashboard &rarr;</a>
          </div>
          ` : `
          <h3>How to Log In</h3>
          <p>Use <strong>Google Sign-In</strong> with ${escapeHtml(user_email)} (recommended), or the email magic link.</p>
          <p>Visit: <a href="${appUrl}/BuilderDashboard">Your Builder Dashboard</a></p>
          `}
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