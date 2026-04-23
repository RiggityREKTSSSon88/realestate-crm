// TODO: ADD INSPECTREALESTATE API KEY — set in Settings → Integrations → InspectRealEstate
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getIntegrationCredentials, getAgencyIdForUser, notConfiguredResponse } from "@/lib/integrations";

const IRE_BASE = "https://api.inspectrealestate.com.au/v1";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const agencyId = await getAgencyIdForUser(user.id);
  if (!agencyId) return NextResponse.json({ error: "No agency" }, { status: 400 });

  const creds = await getIntegrationCredentials(agencyId, "inspectrealestate");
  if (!creds.api_key) return notConfiguredResponse("InspectRealEstate");

  const { openHomeId } = await req.json() as { openHomeId: string };

  const { data: openHome } = await supabase
    .from("open_homes")
    .select(`*, listings ( *, properties ( address, suburb, state, postcode ) )`)
    .eq("id", openHomeId)
    .single();

  if (!openHome) return NextResponse.json({ error: "Open home not found" }, { status: 404 });

  const listing = (openHome as typeof openHome & { listings: Record<string, unknown> }).listings;
  const property = (listing as Record<string, unknown>)?.properties as Record<string, unknown> | null;

  const irePayload = {
    openHome: {
      startTime: openHome.scheduled_at,
      address: {
        street: property?.address ?? "",
        suburb: property?.suburb ?? "",
        state: property?.state ?? "",
        postcode: property?.postcode ?? "",
      },
      agencyKey: creds.config?.agency_key ?? agencyId,
    },
  };

  const ireRes = await fetch(`${IRE_BASE}/open-homes`, {
    method: "POST",
    headers: {
      "X-API-Key": creds.api_key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(irePayload),
  });

  if (!ireRes.ok) {
    const err = await ireRes.text();
    return NextResponse.json({ error: `InspectRealEstate error: ${err}`, configured: true }, { status: 502 });
  }

  const result = await ireRes.json();

  return NextResponse.json({ configured: true, ireOpenHomeId: result.id, ...result });
}
