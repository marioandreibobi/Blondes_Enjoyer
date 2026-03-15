import { NextResponse } from "next/server";
import {
  getSessionToken,
  deleteSession,
  clearSessionCookie,
} from "@/lib/auth";

export async function POST(): Promise<NextResponse> {
  try {
    const token = await getSessionToken();
    if (token) {
      await deleteSession(token);
    }
    await clearSessionCookie();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Logout error:", err);
    await clearSessionCookie();
    return NextResponse.json({ success: true });
  }
}
