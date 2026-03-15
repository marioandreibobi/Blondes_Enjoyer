import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  verifyPassword,
  createSession,
  setSessionCookie,
} from "@/lib/auth";

interface LoginBody {
  email: string;
  password: string;
}

const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_LOGIN_ATTEMPTS = 10;
const loginAttempts = new Map<string, { count: number; firstAttempt: number }>();

function checkLoginRateLimit(email: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(email);
  if (!entry || now - entry.firstAttempt > LOGIN_WINDOW_MS) {
    loginAttempts.set(email, { count: 1, firstAttempt: now });
    return true;
  }
  entry.count++;
  return entry.count <= MAX_LOGIN_ATTEMPTS;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as LoginBody;
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();

    if (!checkLoginRateLimit(trimmedEmail)) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // Clear rate limit on successful login
    loginAttempts.delete(trimmedEmail);

    const token = await createSession(user.id);
    await setSessionCookie(token);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
