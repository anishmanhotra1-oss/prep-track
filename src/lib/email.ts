import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const fromEmail = process.env.RESEND_FROM_EMAIL || "Prep Track <onboarding@resend.dev>";

export async function sendPasswordResetEmail(
  toEmail: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://prep-track-ruddy.vercel.app";
  const resetUrl = `${baseUrl.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FFF9F5; margin: 0; padding: 24px; color: #2B2118;">
        <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #FFE4D0; padding: 36px 32px; box-shadow: 0 4px 20px rgba(184, 90, 18, 0.06);">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; background: #FFE9D6; color: #B85A12; font-weight: 800; font-size: 18px; padding: 10px 20px; border-radius: 12px; letter-spacing: -0.5px;">
              Prep Track
            </div>
          </div>
          
          <h2 style="font-size: 22px; font-weight: 800; color: #2B2118; margin: 0 0 12px; text-align: center;">Reset your password</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #6E5E52; margin: 0 0 24px; text-align: center;">
            We received a request to reset the password for your Prep Track account. Click the button below to choose a new password:
          </p>
          
          <div style="text-align: center; margin: 28px 0;">
            <a href="${resetUrl}" style="background-color: #FF9A4D; color: #ffffff; padding: 14px 28px; border-radius: 50px; font-weight: 700; text-decoration: none; font-size: 15px; display: inline-block; box-shadow: 0 4px 14px rgba(255, 154, 77, 0.4);">
              Reset Password
            </a>
          </div>
          
          <p style="font-size: 12px; color: #8C7B6E; line-height: 1.5; margin: 24px 0 0; text-align: center;">
            This password reset link will expire in <strong>1 hour</strong>. If you didn't request a password reset, you can safely ignore this email.
          </p>
          
          <hr style="border: none; border-top: 1px solid #FFE4D0; margin: 28px 0 16px;">
          
          <p style="font-size: 11px; color: #A89A8E; text-align: center; margin: 0;">
            Prep Track &bull; Study & Exam Preparation Tracker
          </p>
        </div>
      </body>
    </html>
  `;

  if (!resend) {
    console.warn(
      `[Email Service] RESEND_API_KEY is not set. In production, configure RESEND_API_KEY in environment variables to deliver real emails to ${toEmail}.`
    );
    return { success: true };
  }

  try {
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: [toEmail],
      subject: "Reset your Prep Track password",
      html: htmlContent,
    });

    if (error) {
      console.error("[Email Service] Resend error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("[Email Service] Failed to send email:", err);
    return { success: false, error: err.message };
  }
}
