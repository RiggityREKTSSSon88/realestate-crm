// TODO: ADD REIFORMSLIVE API KEY — set in Settings → Integrations → REI Forms Live
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getIntegrationCredentials, getAgencyIdForUser, notConfiguredResponse } from "@/lib/integrations";

const REIFORMS_BASE = "https://api.reiformslive.com.au/v2";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const agencyId = await getAgencyIdForUser(user.id);
  if (!agencyId) return NextResponse.json({ error: "No agency" }, { status: 400 });

  const creds = await getIntegrationCredentials(agencyId, "reiformslive");
  if (!creds.api_key) return notConfiguredResponse("REI Forms Live");

  const { contactId, propertyId, formType } = await req.json() as {
    contactId: string;
    propertyId: string;
    formType: "agency_agreement" | "contract_of_sale" | "rental_agreement" | "property_management";
  };

  const [contactRes, propertyRes, agencyRes] = await Promise.all([
    supabase.from("contacts").select("full_name, email, phone").eq("id", contactId).single(),
    supabase.from("properties").select("address, suburb, state, postcode, bedrooms, bathrooms, parking, property_type, land_size").eq("id", propertyId).single(),
    supabase.from("agencies").select("name").eq("id", agencyId).single(),
  ]);

  if (!contactRes.data || !propertyRes.data) {
    return NextResponse.json({ error: "Contact or property not found" }, { status: 404 });
  }

  const formData = {
    formType,
    agencyName: agencyRes.data?.name ?? "",
    vendor: {
      name: contactRes.data.full_name,
      email: contactRes.data.email ?? "",
      phone: contactRes.data.phone ?? "",
    },
    property: {
      address: `${propertyRes.data.address}, ${propertyRes.data.suburb} ${propertyRes.data.state} ${propertyRes.data.postcode}`,
      bedrooms: propertyRes.data.bedrooms,
      bathrooms: propertyRes.data.bathrooms,
      carSpaces: propertyRes.data.parking,
      landSize: propertyRes.data.land_size,
      propertyType: propertyRes.data.property_type,
    },
  };

  const reiRes = await fetch(`${REIFORMS_BASE}/forms/populate`, {
    method: "POST",
    headers: {
      "X-API-Key": creds.api_key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(formData),
  });

  if (!reiRes.ok) {
    const err = await reiRes.text();
    return NextResponse.json({ error: `REI Forms error: ${err}`, configured: true }, { status: 502 });
  }

  const result = await reiRes.json();
  return NextResponse.json({ configured: true, formUrl: result.formUrl, formId: result.formId, ...result });
}
