import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// TODO: STRIPE — uncomment after installing stripe package
// import Stripe from "stripe";
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });

export async function POST(_req: NextRequest) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: userProfile } = await supabase
    .from("users")
    .select("agency_id")
    .eq("id", authData.user.id)
    .single();

  if (!userProfile?.agency_id) return NextResponse.json({ error: "Agency not found" }, { status: 404 });

  const { data: agency } = await supabase
    .from("agencies")
    .select("stripe_customer_id")
    .eq("id", userProfile.agency_id)
    .single();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // TODO: STRIPE — replace with real portal session:
  // if (!agency?.stripe_customer_id) {
  //   return NextResponse.json({ error: "No billing account found" }, { status: 400 });
  // }
  // const session = await stripe.billingPortal.sessions.create({
  //   customer: agency.stripe_customer_id,
  //   return_url: `${appUrl}/settings`,
  // });
  // return NextResponse.json({ url: session.url });

  console.log(`[TODO: STRIPE] Would open billing portal for agency ${userProfile.agency_id}`);
  return NextResponse.json({
    url: `${appUrl}/settings?billing=portal`,
    placeholder: true,
    message: "Stripe not yet connected. Add STRIPE_SECRET_KEY to activate billing.",
  });
}
