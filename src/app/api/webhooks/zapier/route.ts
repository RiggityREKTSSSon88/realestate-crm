import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAgencyIdForUser } from "@/lib/integrations";

export const ZAPIER_EVENTS = [
  "contact.created",
  "contact.updated",
  "listing.created",
  "listing.updated",
  "listing.sold",
  "appraisal.created",
  "proposal.signed",
  "task.completed",
  "communication.logged",
] as const;

export type ZapierEvent = (typeof ZAPIER_EVENTS)[number];

// GET — list registered webhooks for the agency
export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const agencyId = await getAgencyIdForUser(user.id);
  if (!agencyId) return NextResponse.json({ error: "No agency" }, { status: 400 });

  const { data: webhooks } = await supabase
    .from("zapier_webhooks")
    .select("*")
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false });

  return NextResponse.json({ webhooks: webhooks ?? [] });
}

// POST — register a new webhook
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const agencyId = await getAgencyIdForUser(user.id);
  if (!agencyId) return NextResponse.json({ error: "No agency" }, { status: 400 });

  const { name, url, events } = await req.json() as {
    name: string;
    url: string;
    events: string[];
  };

  if (!name || !url || !events?.length) {
    return NextResponse.json({ error: "name, url, and events are required" }, { status: 400 });
  }

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid webhook URL" }, { status: 400 });
  }

  const validEvents = events.filter((e) => (ZAPIER_EVENTS as readonly string[]).includes(e));
  if (!validEvents.length) {
    return NextResponse.json({ error: "No valid events provided", validEvents: ZAPIER_EVENTS }, { status: 400 });
  }

  const { data: webhook, error } = await supabase
    .from("zapier_webhooks")
    .insert({ agency_id: agencyId, name, url, events: validEvents, active: true })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ webhook }, { status: 201 });
}
