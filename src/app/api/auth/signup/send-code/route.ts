import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { generateVerificationCode, sendVerificationEmail } from "@/lib/email";
import bcrypt from "bcryptjs";

interface SendCodeBody {
  email: string;
  name: string;
  password: string;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const CODE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_WINDOW_MS = 2 * 60 * 1000; // 2 minutes
const MAX_PENDING_PER_EMAIL = 3; // max codes within rate limit window

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as SendCodeBody;
    const { email, name, password } = body;

    if (!email || !name || !password) {
      return NextResponse.json(
        { error: "Email, name, and password are required." },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    if (!isValidEmail(trimmedEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    if (trimmedName.length < 2 || trimmedName.length > 100) {
      return NextResponse.json(
        { error: "Name must be between 2 and 100 characters." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    // Check if email already has an account
    const existingUser = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    // Rate limit: max pending verifications per email in the window
    const recentPending = await prisma.pendingVerification.count({
      where: {
        email: trimmedEmail,
        createdAt: { gte: new Date(Date.now() - RATE_LIMIT_WINDOW_MS) },
      },
    });

    if (recentPending >= MAX_PENDING_PER_EMAIL) {
      return NextResponse.json(
        { error: "Too many verification requests. Please wait a few minutes." },
        { status: 429 }
      );
    }

    // Clean up expired verifications for this email
    await prisma.pendingVerification.deleteMany({
      where: {
        email: trimmedEmail,
        expiresAt: { lt: new Date() },
      },
    });

    const code = generateVerificationCode();
    const passwordHash = await hashPassword(password);
    const codeHash = await bcrypt.hash(code, 10);

    // Store pending verification (code stored as hash)
    await prisma.pendingVerification.create({
      data: {
        email: trimmedEmail,
        name: trimmedName,
        passwordHash,
        code: codeHash,
        expiresAt: new Date(Date.now() + CODE_EXPIRY_MS),
      },
    });

    // Send verification email
    await sendVerificationEmail(trimmedEmail, code);

    return NextResponse.json(
      { message: "Verification code sent to your email." },
      { status: 200 }
    );
  } catch (err) {
    console.error("Send verification code error:", err);
    return NextResponse.json(
      { error: "Failed to send verification code. Please try again." },
      { status: 500 }
    );
  }
}
