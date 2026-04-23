// TODO: ADD MOVEMEIN API KEY — set in Settings → Integrations → Move Me In
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getIntegrationCredentials, getAgencyIdForUser, notConfiguredResponse } from "@/lib/integrations";

const MMI_BASE = "https://api.movemein.com.au/v1";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const agencyId = await getAgencyIdForUser(user.id);
  if (!agencyId) return NextResponse.json({ error: "No agency" }, { status: 400 });

  const creds = await getIntegrationCredentials(agencyId, "movemein");
  if (!creds.api_key) return notConfiguredResponse("Move Me In");

  const { contactId, propertyId, moveInDate } = await req.json() as {
    contactId: string;
    propertyId: string;
    moveInDate?: string;
  };

  const [contactRes, propertyRes] = await Promise.all([
    supabase.from("contacts").select("full_name, email, phone").eq("id", contactId).single(),
    supabase.from("properties").select("address, suburb, state, postcode").eq("id", propertyId).single(),
  ]);

  if (!contactRes.data || !propertyRes.data) {
    return NextResponse.json({ error: "Contact or property not found" }, { status: 404 });
  }

  const referralPayload = {
    partnerKey: creds.api_key,
    referenceId: `${agencyId}-${contactId}-${propertyId}`,
    customer: {
      name: contactRes.data.full_name,
      email: contactRes.data.email ?? "",
      phone: contactRes.data.phone ?? "",
    },
    property: {
      address: propertyRes.data.address,
      suburb: propertyRes.data.suburb,
      state: propertyRes.data.state,
      postcode: propertyRes.data.postcode,
    },
    moveInDate: moveInDate ?? null,
    services: ["electricity", "gas", "internet", "water"],
  };

  const mmiRes = await fetch(`${MMI_BASE}/referrals`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${creds.api_key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(referralPayload),
  });

  if (!mmiRes.ok) {
    const err = await mmiRes.text();
    return NextResponse.json({ error: `Move Me In error: ${err}`, configured: true }, { status: 502 });
  }

  const result = await mmiRes.json();
  return NextResponse.json({ configured: true, referralId: result.referralId, referralUrl: result.referralUrl, ...result });
}
