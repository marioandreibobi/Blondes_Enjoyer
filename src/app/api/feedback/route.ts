import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/db";

interface FeedbackBody {
  category: string;
  rating: number;
  message: string;
  email?: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// In-memory rate limiter for feedback submissions
const feedbackRateLimit = new Map<string, { count: number; firstRequest: number }>();
const FEEDBACK_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_FEEDBACK_PER_WINDOW = 5;

function checkFeedbackRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = feedbackRateLimit.get(ip);
  if (!entry || now - entry.firstRequest > FEEDBACK_WINDOW_MS) {
    feedbackRateLimit.set(ip, { count: 1, firstRequest: now });
    return true;
  }
  entry.count++;
  return entry.count <= MAX_FEEDBACK_PER_WINDOW;
}

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

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Prefer request.ip (set by hosting platform like Vercel), then x-real-ip
    // (set by trusted reverse proxy), then x-forwarded-for as last resort.
    // In production, ensure only the trusted proxy can set these headers.
    const clientIp =
      request.ip ??
      request.headers.get("x-real-ip")?.trim() ??
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";

    if (!checkFeedbackRateLimit(clientIp)) {
      return NextResponse.json(
        { error: "Too many feedback submissions. Please try again later." },
        { status: 429 }
      );
    }

    const body = (await request.json()) as FeedbackBody;
    const { category, rating, message, email } = body;

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: "Feedback message is required." },
        { status: 400 }
      );
    }

    if (!category || !["general", "bug", "feature"].includes(category)) {
      return NextResponse.json(
        { error: "Invalid category." },
        { status: 400 }
      );
    }

    if (typeof rating !== "number" || rating < 0 || rating > 5) {
      return NextResponse.json(
        { error: "Invalid rating." },
        { status: 400 }
      );
    }

    const trimmedMessage = message.trim().slice(0, 5000);
    const trimmedEmail = email ? email.trim().slice(0, 254) : null;

    await prisma.feedback.create({
      data: {
        category,
        rating,
        message: trimmedMessage,
        email: trimmedEmail,
        ipAddress: clientIp !== "unknown" ? clientIp : null,
      },
    });

    const sanitizedMessage = escapeHtml(trimmedMessage);
    const sanitizedEmail = escapeHtml(trimmedEmail || "Not provided");
    const stars = rating > 0 ? "★".repeat(rating) + "☆".repeat(5 - rating) : "No rating";

    const recipient = process.env.SMTP_FROM || process.env.SMTP_USER;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: recipient,
      subject: `CodeAtlas Feedback — ${category.charAt(0).toUpperCase() + category.slice(1)}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px; background: #0a0e27; color: #e2e8f0; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <span style="font-size: 24px; font-weight: bold; color: #e2e8f0;">Code<span style="color: #6366f1;">Atlas</span></span>
          </div>
          <h2 style="color: #e2e8f0; font-size: 20px; margin-bottom: 24px; text-align: center;">New Feedback Received</h2>
          <div style="background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.3); border-radius: 8px; padding: 20px; margin-bottom: 16px;">
            <p style="margin: 0 0 8px; color: rgba(255,255,255,0.5); font-size: 12px; text-transform: uppercase;">Category</p>
            <p style="margin: 0; color: #818cf8; font-size: 16px; font-weight: 600;">${category.charAt(0).toUpperCase() + category.slice(1)}</p>
          </div>
          <div style="background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.3); border-radius: 8px; padding: 20px; margin-bottom: 16px;">
            <p style="margin: 0 0 8px; color: rgba(255,255,255,0.5); font-size: 12px; text-transform: uppercase;">Rating</p>
            <p style="margin: 0; color: #eab308; font-size: 20px;">${stars}</p>
          </div>
          <div style="background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.3); border-radius: 8px; padding: 20px; margin-bottom: 16px;">
            <p style="margin: 0 0 8px; color: rgba(255,255,255,0.5); font-size: 12px; text-transform: uppercase;">From</p>
            <p style="margin: 0; color: #e2e8f0; font-size: 14px;">${sanitizedEmail}</p>
          </div>
          <div style="background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.3); border-radius: 8px; padding: 20px;">
            <p style="margin: 0 0 8px; color: rgba(255,255,255,0.5); font-size: 12px; text-transform: uppercase;">Message</p>
            <p style="margin: 0; color: #e2e8f0; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${sanitizedMessage}</p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Feedback send error:", err);
    return NextResponse.json(
      { error: "Failed to send feedback. Please try again." },
      { status: 500 }
    );
  }
}
