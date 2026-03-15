import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  createSession,
  setSessionCookie,
} from "@/lib/auth";
import bcrypt from "bcryptjs";

interface SignupBody {
  email: string;
  code: string;
}

const MAX_ATTEMPTS = 5;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as SignupBody;
    const { email, code } = body;

    if (!email || !code) {
      return NextResponse.json(
        { error: "Email and verification code are required." },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedCode = code.trim();

    // Find the most recent pending verification for this email
    const pending = await prisma.pendingVerification.findFirst({
      where: { email: trimmedEmail },
      orderBy: { createdAt: "desc" },
    });

    if (!pending) {
      return NextResponse.json(
        { error: "No verification code found. Please request a new one." },
        { status: 404 }
      );
    }

    if (pending.expiresAt < new Date()) {
      await prisma.pendingVerification.deleteMany({ where: { email: trimmedEmail } });
      return NextResponse.json(
        { error: "Verification code has expired. Please request a new one." },
        { status: 410 }
      );
    }

    if (pending.attempts >= MAX_ATTEMPTS) {
      await prisma.pendingVerification.deleteMany({ where: { email: trimmedEmail } });
      return NextResponse.json(
        { error: "Too many failed attempts. Please request a new code." },
        { status: 429 }
      );
    }

    const codeMatch = await bcrypt.compare(trimmedCode, pending.code);
    if (!codeMatch) {
      await prisma.pendingVerification.update({
        where: { id: pending.id },
        data: { attempts: { increment: 1 } },
      });
      return NextResponse.json(
        { error: "Incorrect verification code. Please try again." },
        { status: 400 }
      );
    }

    // Check if email was taken while pending
    const existingUser = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    });

    if (existingUser) {
      await prisma.pendingVerification.deleteMany({ where: { email: trimmedEmail } });
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    // Create the user with the pre-hashed password
    const user = await prisma.user.create({
      data: {
        email: trimmedEmail,
        name: pending.name,
        passwordHash: pending.passwordHash,
      },
    });

    // Clean up all pending verifications for this email
    await prisma.pendingVerification.deleteMany({ where: { email: trimmedEmail } });

    const token = await createSession(user.id);
    await setSessionCookie(token);

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Signup error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
