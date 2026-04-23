import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// TODO: STRIPE — uncomment after installing stripe package
// import Stripe from "stripe";
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });

// TODO: STRIPE — map Stripe plan price IDs back to our plan names
const PRICE_TO_PLAN: Record<string, "starter" | "professional" | "enterprise"> = {
  [process.env.STRIPE_STARTER_PRICE_ID ?? "price_TODO_STRIPE_STARTER"]: "starter",
  [process.env.STRIPE_PRO_PRICE_ID ?? "price_TODO_STRIPE_PRO"]: "professional",
  [process.env.STRIPE_ENTERPRISE_PRICE_ID ?? "price_TODO_STRIPE_ENTERPRISE"]: "enterprise",
};

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  // TODO: STRIPE — replace with real webhook verification:
  // let event: Stripe.Event;
  // try {
  //   event = stripe.webhooks.constructEvent(body, sig!, process.env.STRIPE_WEBHOOK_SECRET!);
  // } catch (err) {
  //   return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  // }

  // PLACEHOLDER: parse body directly (no signature verification until Stripe is connected)
  if (!sig) {
    console.log("[TODO: STRIPE] Webhook received without signature — Stripe not yet connected");
    return NextResponse.json({ received: true, placeholder: true });
  }

  let event: { type: string; data: { object: Record<string, unknown> } };
  try {
    event = JSON.parse(body) as typeof event;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = await createClient();

  // TODO: STRIPE — handle all relevant events:
  switch (event.type) {
    case "checkout.session.completed": {
      // TODO: STRIPE
      // const session = event.data.object as Stripe.Checkout.Session;
      // const agencyId = session.metadata?.agency_id;
      // const plan = session.metadata?.plan;
      // const customerId = session.customer as string;
      // const subscriptionId = session.subscription as string;
      // if (agencyId && plan) {
      //   await supabase.from("agencies").update({
      //     stripe_customer_id: customerId,
      //     stripe_subscription_id: subscriptionId,
      //     subscription_plan: plan as Agency["subscription_plan"],
      //     subscription_status: "active",
      //   }).eq("id", agencyId);
      // }
      const agencyId = (event.data.object as Record<string, string>)["metadata.agency_id"];
      console.log(`[TODO: STRIPE] checkout.session.completed for agency ${agencyId}`);
      break;
    }

    case "invoice.payment_succeeded": {
      // TODO: STRIPE — keep subscription_status = "active"
      const customerId = (event.data.object as Record<string, string>).customer;
      console.log(`[TODO: STRIPE] invoice.payment_succeeded for customer ${customerId}`);
      if (customerId) {
        await supabase
          .from("agencies")
          .update({ subscription_status: "active" })
          .eq("stripe_customer_id", customerId as string);
      }
      break;
    }

    case "invoice.payment_failed": {
      // TODO: STRIPE — mark past_due
      const customerId = (event.data.object as Record<string, string>).customer;
      console.log(`[TODO: STRIPE] invoice.payment_failed for customer ${customerId}`);
      if (customerId) {
        await supabase
          .from("agencies")
          .update({ subscription_status: "past_due" })
          .eq("stripe_customer_id", customerId as string);
      }
      break;
    }

    case "customer.subscription.deleted": {
      // TODO: STRIPE — mark cancelled
      const customerId = (event.data.object as Record<string, string>).customer;
      console.log(`[TODO: STRIPE] customer.subscription.deleted for customer ${customerId}`);
      if (customerId) {
        await supabase
          .from("agencies")
          .update({ subscription_status: "cancelled", subscription_plan: "trial" })
          .eq("stripe_customer_id", customerId as string);
      }
      break;
    }

    case "customer.subscription.updated": {
      // TODO: STRIPE — handle plan changes
      // const sub = event.data.object as Stripe.Subscription;
      // const priceId = sub.items.data[0]?.price.id;
      // const newPlan = PRICE_TO_PLAN[priceId] ?? "starter";
      console.log(`[TODO: STRIPE] customer.subscription.updated`);
      break;
    }

    default:
      console.log(`[TODO: STRIPE] Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
