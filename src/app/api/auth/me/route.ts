import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET(): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();
    return NextResponse.json({ user });
  } catch (err) {
    console.error("Auth me error:", err);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
