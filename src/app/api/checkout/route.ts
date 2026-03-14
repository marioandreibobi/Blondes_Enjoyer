import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

interface CheckoutRequestBody {
  planName: string;
  billing: "monthly" | "annual";
}

const PLAN_PRICES: Record<string, { monthly: number; annual: number }> = {
  pro: { monthly: 1900, annual: 1500 },
  team: { monthly: 4900, annual: 3900 },
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: CheckoutRequestBody = await request.json();
    const { planName, billing } = body;

    if (!planName || !billing) {
      return NextResponse.json(
        { error: "Missing planName or billing" },
        { status: 400 }
      );
    }

    const planKey = planName.toLowerCase();
    const priceConfig = PLAN_PRICES[planKey];

    if (!priceConfig) {
      return NextResponse.json(
        { error: "Invalid plan selected" },
        { status: 400 }
      );
    }

    if (billing !== "monthly" && billing !== "annual") {
      return NextResponse.json(
        { error: "Invalid billing cycle" },
        { status: 400 }
      );
    }

    const unitAmount = billing === "annual" ? priceConfig.annual : priceConfig.monthly;
    const interval = billing === "annual" ? "year" : "month";

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `CodeAtlas ${planName} Plan`,
              description: `${billing === "annual" ? "Annual" : "Monthly"} subscription to CodeAtlas ${planName}`,
            },
            unit_amount: unitAmount,
            recurring: {
              interval,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/checkout/cancel`,
      metadata: {
        plan: planKey,
        billing,
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Failed to create checkout session" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json(
      { error: "Failed to create checkout session. Please try again." },
      { status: 500 }
    );
  }
}
