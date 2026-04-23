// TODO: ADD CORELOGIC API KEY — set client ID and secret in Settings → Integrations → CoreLogic RP Data
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getIntegrationCredentials, getAgencyIdForUser, notConfiguredResponse } from "@/lib/integrations";

const CORELOGIC_BASE = "https://api-uat.corelogic.asia";

async function getCoreLogicToken(clientId: string, clientSecret: string): Promise<string> {
  const res = await fetch(`${CORELOGIC_BASE}/access/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!res.ok) throw new Error("CoreLogic auth failed");
  const data = await res.json();
  return data.access_token as string;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const agencyId = await getAgencyIdForUser(user.id);
  if (!agencyId) return NextResponse.json({ error: "No agency" }, { status: 400 });

  const creds = await getIntegrationCredentials(agencyId, "corelogic");
  if (!creds.api_key || !creds.api_secret) return notConfiguredResponse("CoreLogic RP Data");

  const { address, suburb, state, postcode } = await req.json() as {
    address: string;
    suburb: string;
    state: string;
    postcode: string;
  };

  const token = await getCoreLogicToken(creds.api_key, creds.api_secret);

  const query = encodeURIComponent(`${address} ${suburb} ${state} ${postcode}`);
  const suggestRes = await fetch(
    `${CORELOGIC_BASE}/property-suggest/au?q=${query}&limit=5`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!suggestRes.ok) {
    return NextResponse.json({ error: "CoreLogic property search failed", configured: true }, { status: 502 });
  }

  const suggestions = await suggestRes.json();

  if (!suggestions?.suggestions?.length) {
    return NextResponse.json({ results: [], configured: true });
  }

  const topId = suggestions.suggestions[0]?.propertyId;
  if (!topId) return NextResponse.json({ results: suggestions.suggestions, configured: true });

  const detailRes = await fetch(
    `${CORELOGIC_BASE}/property/au/${topId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const detail = detailRes.ok ? await detailRes.json() : null;

  return NextResponse.json({
    configured: true,
    results: suggestions.suggestions,
    detail,
  });
}
