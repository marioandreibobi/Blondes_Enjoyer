import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export function generateVerificationCode(): string {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  return code;
}

export async function sendVerificationEmail(
  to: string,
  code: string
): Promise<void> {
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: "CodeAtlas — Your Verification Code",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #0a0e27; color: #e2e8f0; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <span style="font-size: 24px; font-weight: bold; color: #e2e8f0;">Code<span style="color: #6366f1;">Atlas</span></span>
        </div>
        <h2 style="color: #e2e8f0; font-size: 20px; margin-bottom: 8px; text-align: center;">Verify Your Email</h2>
        <p style="color: rgba(255,255,255,0.5); text-align: center; margin-bottom: 24px; font-size: 14px;">
          Enter this code on the sign-up page to create your account.
        </p>
        <div style="background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.3); border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #818cf8;">${code}</span>
        </div>
        <p style="color: rgba(255,255,255,0.35); text-align: center; font-size: 12px;">
          This code expires in 10 minutes. If you didn&apos;t request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}
