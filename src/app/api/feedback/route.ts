import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendFeedbackNotification } from "@/lib/email";

interface FeedbackBody {
  category: string;
  rating: number;
  message: string;
  email?: string;
}

const VALID_CATEGORIES = ["general", "bug", "feature", "other"];

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: FeedbackBody = await request.json();
    const { category, rating, message, email } = body;

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: "Invalid category." },
        { status: 400 }
      );
    }

    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5." },
        { status: 400 }
      );
    }

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { error: "Message is required." },
        { status: 400 }
      );
    }

    if (message.length > 5000) {
      return NextResponse.json(
        { error: "Message too long (max 5000 characters)." },
        { status: 400 }
      );
    }

    if (email && typeof email === "string") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: "Invalid email address." },
          { status: 400 }
        );
      }
    }

    await prisma.feedback.create({
      data: {
        category,
        rating,
        message: message.trim(),
        email: email?.trim() || null,
      },
    });

    // Send email notification (don't block the response on failure)
    sendFeedbackNotification({
      category,
      rating,
      message: message.trim(),
      email: email?.trim() || null,
    }).catch(() => { /* email delivery is best-effort */ });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to submit feedback." },
      { status: 500 }
    );
  }
}
