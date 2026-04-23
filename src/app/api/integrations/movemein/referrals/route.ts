// TODO: ADD MOVEMEIN API KEY — set in Settings → Integrations → Move Me In
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getIntegrationCredentials, getAgencyIdForUser, notConfiguredResponse } from "@/lib/integrations";

const MMI_BASE = "https://api.movemein.com.au/v1";

export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const agencyId = await getAgencyIdForUser(user.id);
  if (!agencyId) return NextResponse.json({ error: "No agency" }, { status: 400 });

  const creds = await getIntegrationCredentials(agencyId, "movemein");
  if (!creds.api_key) return notConfiguredResponse("Move Me In");

  const mmiRes = await fetch(`${MMI_BASE}/referrals?partnerKey=${creds.api_key}&limit=50`, {
    headers: { Authorization: `Bearer ${creds.api_key}` },
  });

  if (!mmiRes.ok) {
    return NextResponse.json({ error: "Move Me In API error", configured: true }, { status: 502 });
  }

  const data = await mmiRes.json();
  return NextResponse.json({ configured: true, referrals: data.referrals ?? [], totalCommission: data.totalCommission ?? 0 });
}
