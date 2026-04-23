// TODO: ADD RATEMYAGENT API KEY — set in Settings → Integrations → RateMyAgent
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getIntegrationCredentials, getAgencyIdForUser, notConfiguredResponse } from "@/lib/integrations";

const RMA_BASE = "https://www.ratemyagent.com.au/api/v1";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const agencyId = await getAgencyIdForUser(user.id);
  if (!agencyId) return NextResponse.json({ error: "No agency" }, { status: 400 });

  const creds = await getIntegrationCredentials(agencyId, "ratemyagent");
  if (!creds.api_key) return notConfiguredResponse("RateMyAgent");

  const { agentId } = await req.json() as { agentId: string };

  const rmaRes = await fetch(`${RMA_BASE}/agents/${agentId}/reviews`, {
    headers: {
      "X-API-Key": creds.api_key,
      Accept: "application/json",
    },
  });

  if (!rmaRes.ok) {
    return NextResponse.json({ error: "RateMyAgent API error", configured: true }, { status: 502 });
  }

  const { reviews } = await rmaRes.json() as {
    reviews: Array<{
      id: string;
      reviewer_name: string;
      rating: number;
      review_text: string;
      review_date: string;
    }>;
  };

  let synced = 0;
  for (const review of reviews ?? []) {
    await supabase.from("agent_reviews").upsert(
      {
        agency_id: agencyId,
        agent_id: agentId,
        reviewer_name: review.reviewer_name,
        rating: review.rating,
        review_text: review.review_text,
        review_date: review.review_date,
        source: "ratemyagent",
      },
      { onConflict: "agency_id,agent_id,reviewer_name,review_date" }
    );
    synced++;
  }

  return NextResponse.json({ configured: true, synced, total: reviews?.length ?? 0 });
}
