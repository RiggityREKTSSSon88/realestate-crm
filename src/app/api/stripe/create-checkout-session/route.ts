import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// TODO: STRIPE — uncomment and install: npm install stripe
// import Stripe from "stripe";
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });

const PLAN_PRICE_MAP: Record<string, string> = {
  // TODO: STRIPE — replace these with real Stripe price IDs from your dashboard
  starter: process.env.STRIPE_STARTER_PRICE_ID ?? "price_TODO_STRIPE_STARTER",
  professional: process.env.STRIPE_PRO_PRICE_ID ?? "price_TODO_STRIPE_PRO",
  enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID ?? "price_TODO_STRIPE_ENTERPRISE",
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { plan } = await req.json() as { plan: string };
  const priceId = PLAN_PRICE_MAP[plan];
  if (!priceId) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

  const { data: userProfile } = await supabase
    .from("users")
    .select("agency_id, email, full_name")
    .eq("id", authData.user.id)
    .single();

  if (!userProfile?.agency_id) return NextResponse.json({ error: "Agency not found" }, { status: 404 });

  const { data: agency } = await supabase
    .from("agencies")
    .select("id, name, stripe_customer_id")
    .eq("id", userProfile.agency_id)
    .single();

  if (!agency) return NextResponse.json({ error: "Agency not found" }, { status: 404 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // TODO: STRIPE — replace this entire block with real Stripe checkout session creation:
  // let customerId = agency.stripe_customer_id;
  // if (!customerId) {
  //   const customer = await stripe.customers.create({
  //     email: authData.user.email,
  //     name: agency.name,
  //     metadata: { agency_id: agency.id },
  //   });
  //   customerId = customer.id;
  //   await supabase.from("agencies").update({ stripe_customer_id: customerId }).eq("id", agency.id);
  // }
  // const session = await stripe.checkout.sessions.create({
  //   customer: customerId,
  //   mode: "subscription",
  //   line_items: [{ price: priceId, quantity: 1 }],
  //   success_url: `${appUrl}/dashboard?billing=success`,
  //   cancel_url: `${appUrl}/pricing?billing=cancelled`,
  //   metadata: { agency_id: agency.id, plan },
  // });
  // return NextResponse.json({ url: session.url });

  // PLACEHOLDER: redirect to pricing page until Stripe is connected
  console.log(`[TODO: STRIPE] Would create checkout for agency ${agency.id}, plan: ${plan}, price: ${priceId}`);
  return NextResponse.json({
    url: `${appUrl}/pricing?plan=${plan}&pending=true`,
    placeholder: true,
    message: "Stripe not yet connected. Add STRIPE_SECRET_KEY to activate billing.",
  });
}
