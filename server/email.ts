import sgMail from "@sendgrid/mail";

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";
const FROM_EMAIL = process.env.OTP_FROM_EMAIL || "noreply@leadedly.com";
const FROM_NAME = process.env.OTP_FROM_NAME || "Leadedly";

export const isEmailConfigured =
  SENDGRID_API_KEY !== "" && SENDGRID_API_KEY !== "your_sendgrid_api_key";

if (isEmailConfigured) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

// ─── Generate a 6-digit OTP ────────────────────────────────────────────────
export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ─── Send OTP email via SendGrid ───────────────────────────────────────────
export async function sendOtpEmail(toEmail: string, firstName: string, otp: string): Promise<void> {
  if (!isEmailConfigured) {
    // Dev mode: log to console instead of sending
    console.log(`[OTP DEV] Code for ${toEmail}: ${otp}`);
    return;
  }

  const msg = {
    to: toEmail,
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject: `Your Leadedly verification code: ${otp}`,
    text: `Hi ${firstName},\n\nYour verification code is: ${otp}\n\nThis code expires in 10 minutes. Do not share it with anyone.\n\nIf you didn't request this code, please ignore this email.\n\n— The Leadedly Team`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;">
        <!-- Header -->
        <tr>
          <td style="background:#0b1628;padding:28px 36px;border-bottom:1px solid #1d4ed8;">
            <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Leadedly</span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 36px 28px;">
            <p style="margin:0 0 8px;font-size:15px;color:#94a3b8;">Hi ${firstName},</p>
            <p style="margin:0 0 28px;font-size:15px;color:#cbd5e1;line-height:1.6;">
              Use the code below to verify your identity and access your Leadedly account.
            </p>
            <!-- OTP box -->
            <div style="background:#0f172a;border:1px solid #334155;border-radius:12px;padding:24px;text-align:center;margin-bottom:28px;">
              <p style="margin:0 0 8px;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:1.5px;">Your verification code</p>
              <p style="margin:0;font-size:42px;font-weight:700;color:#ffffff;letter-spacing:12px;font-family:'Courier New',monospace;">${otp}</p>
            </div>
            <p style="margin:0 0 8px;font-size:13px;color:#64748b;">
              ⏱ This code expires in <strong style="color:#94a3b8;">10 minutes</strong>.
            </p>
            <p style="margin:0;font-size:13px;color:#64748b;">
              🔒 Never share this code. Leadedly will never ask for it by phone or chat.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 36px;border-top:1px solid #1e293b;">
            <p style="margin:0;font-size:12px;color:#475569;">
              If you didn't request this code, you can safely ignore this email.
              Someone may have entered your email address by mistake.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };

  await sgMail.send(msg);
}
