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

  const { suburb, state, postcode } = await req.json() as {
    suburb: string;
    state: string;
    postcode: string;
  };

  const token = await getCoreLogicToken(creds.api_key, creds.api_secret);

  // Resolve suburb ID first
  const locQuery = encodeURIComponent(`${suburb} ${state} ${postcode}`);
  const locRes = await fetch(
    `${CORELOGIC_BASE}/location/au?q=${locQuery}&limit=1`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!locRes.ok) {
    return NextResponse.json({ error: "Suburb lookup failed", configured: true }, { status: 502 });
  }

  const locData = await locRes.json();
  const suburbId = locData?.suggestions?.[0]?.locationId;
  if (!suburbId) {
    return NextResponse.json({ error: "Suburb not found", configured: true }, { status: 404 });
  }

  // Fetch 12-month statistics for houses and units
  const [houseStats, unitStats] = await Promise.all([
    fetch(`${CORELOGIC_BASE}/statistics/au/suburb/${suburbId}?propertyType=house&period=12months`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
    fetch(`${CORELOGIC_BASE}/statistics/au/suburb/${suburbId}?propertyType=unit&period=12months`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  ]);

  return NextResponse.json({
    configured: true,
    suburb,
    state,
    postcode,
    suburbId,
    houses: houseStats.ok ? await houseStats.json() : null,
    units: unitStats.ok ? await unitStats.json() : null,
  });
}
