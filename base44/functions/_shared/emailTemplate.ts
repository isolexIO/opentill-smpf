// Shared openTILL SMPF email template — brochure theme.
// Deep-space gradient outer background with a glowing white glass card,
// purple→green gradient accent bars, and the openTILL logo.
// All inner content stays dark-on-white for readability.

const LOGO_URL =
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6970e2871534100b4ebb8d45/8e45f76fe_DUC3.png';

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Full HTML document wrapper. `innerHtml` is rendered on a white card so dark
// text stays readable while the surrounding deep-space gradient + glow carries
// the brochure aesthetic.
export function brandedEmail(innerHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0618;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0618;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(123,47,214,0.28),0 0 1px rgba(15,209,122,0.2);">
        <tr><td style="height:6px;background:linear-gradient(90deg,#7B2FD6 0%,#0FD17A 100%);font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="padding:44px 48px 20px 48px;text-align:center;">
          <img src="${LOGO_URL}" alt="openTILL" width="64" height="64" style="display:block;margin:0 auto 16px auto;border-radius:16px;box-shadow:0 0 24px rgba(123,47,214,0.45);" />
          <h1 style="margin:0;font-size:26px;font-weight:800;color:#18181b;letter-spacing:-0.5px;">openTILL <span style="color:#7B2FD6;">SMPF</span></h1>
          <p style="margin:8px 0 0 0;font-size:12px;color:#71717a;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;">Structured Merchant Participation Framework</p>
        </td></tr>
        <tr><td style="padding:8px 48px 40px 48px;">
          ${innerHtml}
        </td></tr>
        <tr><td style="padding:28px 48px;background:#fafafa;border-top:1px solid #e4e4e7;">
          <p style="margin:0 0 8px 0;font-size:13px;color:#52525b;line-height:1.6;">
            <strong style="color:#18181b;">openTILL SMPF</strong> — The blockchain-integrated Point of Sale for modern commerce.
          </p>
          <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.6;">
            &copy; ${new Date().getFullYear()} openTILL Corporation. All rights reserved.<br>
            This is an automated message — please do not reply directly to this email.
          </p>
        </td></tr>
        <tr><td style="height:6px;background:linear-gradient(90deg,#0FD17A 0%,#7B2FD6 100%);font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// Gradient call-to-action button.
export function emailButton(href: string, text: string): string {
  return `<div style="text-align:center;margin:32px 0;"><a href="${href}" style="display:inline-block;padding:14px 40px;background:linear-gradient(90deg,#7B2FD6 0%,#0FD17A 100%);color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;border-radius:10px;box-shadow:0 4px 16px rgba(123,47,214,0.35);">${text}</a></div>`;
}

// Subtle info card for credentials / key-value blocks.
export function emailCard(contentHtml: string): string {
  return `<div style="margin:28px 0;background:#f4f4f5;border:1px solid #e4e4e7;border-radius:12px;padding:24px;">${contentHtml}</div>`;
}

// Success / highlight banner.
export function emailBanner(contentHtml: string): string {
  return `<div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;padding:16px 20px;margin:24px 0;">${contentHtml}</div>`;
}

// Standard paragraph helpers (dark text on the white card).
export function p(text: string): string {
  return `<p style="margin:0 0 16px 0;font-size:16px;color:#3f3f46;line-height:1.7;">${text}</p>`;
}

export function h2(text: string): string {
  return `<h2 style="margin:0 0 20px 0;font-size:22px;font-weight:700;color:#18181b;">${text}</h2>`;
}