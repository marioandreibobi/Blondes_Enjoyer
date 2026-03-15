import nodemailer from "nodemailer";
import crypto from "crypto";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: process.env.NODE_ENV === "production",
  },
});

export function generateVerificationCode(): string {
  const code = crypto.randomInt(100000, 999999).toString();
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

const RATING_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Needs Improvement",
  3: "Average",
  4: "Good",
  5: "Excellent",
};

export async function sendFeedbackNotification(feedback: {
  category: string;
  rating: number;
  message: string;
  email?: string | null;
}): Promise<void> {
  const recipient = process.env.FEEDBACK_EMAIL || process.env.SMTP_USER;
  if (!recipient) return;

  const ratingLabel = RATING_LABELS[feedback.rating] || String(feedback.rating);
  const stars = "★".repeat(feedback.rating) + "☆".repeat(5 - feedback.rating);

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: recipient,
    subject: `CodeAtlas Feedback — ${ratingLabel} (${feedback.category})`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; background: #0a0e27; color: #e2e8f0; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <span style="font-size: 24px; font-weight: bold; color: #e2e8f0;">Code<span style="color: #6366f1;">Atlas</span></span>
        </div>
        <h2 style="color: #e2e8f0; font-size: 20px; margin-bottom: 16px; text-align: center;">New Feedback Received</h2>
        <div style="background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.3); border-radius: 8px; padding: 20px; margin-bottom: 16px;">
          <p style="margin: 0 0 8px; color: rgba(255,255,255,0.5); font-size: 12px; text-transform: uppercase;">Rating</p>
          <p style="margin: 0; font-size: 24px; color: #fbbf24;">${stars}</p>
          <p style="margin: 4px 0 0; color: #818cf8; font-size: 14px;">${ratingLabel}</p>
        </div>
        <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <p style="margin: 0 0 8px; color: rgba(255,255,255,0.5); font-size: 12px; text-transform: uppercase;">Category</p>
          <p style="margin: 0; color: #e2e8f0; font-size: 14px;">${feedback.category}</p>
        </div>
        <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <p style="margin: 0 0 8px; color: rgba(255,255,255,0.5); font-size: 12px; text-transform: uppercase;">Message</p>
          <p style="margin: 0; color: #e2e8f0; font-size: 14px; white-space: pre-wrap;">${feedback.message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
        </div>
        ${feedback.email ? `
        <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 16px;">
          <p style="margin: 0 0 8px; color: rgba(255,255,255,0.5); font-size: 12px; text-transform: uppercase;">User Email</p>
          <p style="margin: 0; color: #818cf8; font-size: 14px;">${feedback.email.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
        </div>
        ` : ""}
      </div>
    `,
  });
}
