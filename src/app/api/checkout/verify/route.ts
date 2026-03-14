import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const sessionId = request.nextUrl.searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.json(
      { error: "Missing session_id parameter" },
      { status: 400 }
    );
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Payment not completed" },
        { status: 402 }
      );
    }

    return NextResponse.json({
      plan: session.metadata?.plan ?? "unknown",
      billing: session.metadata?.billing ?? "unknown",
      customerEmail: session.customer_details?.email ?? null,
    });
  } catch (err) {
    console.error("Session verification error:", err);
    return NextResponse.json(
      { error: "Invalid session" },
      { status: 400 }
    );
  }
}
