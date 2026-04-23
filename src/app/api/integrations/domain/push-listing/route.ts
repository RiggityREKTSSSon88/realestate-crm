// TODO: ADD DOMAIN API KEY — set client ID and secret in Settings → Integrations → Domain.com.au
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getIntegrationCredentials, getAgencyIdForUser, notConfiguredResponse } from "@/lib/integrations";

const DOMAIN_BASE = "https://api.domain.com.au/v1";

async function getDomainToken(clientId: string, clientSecret: string): Promise<string> {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch("https://auth.domain.com.au/v1/connect/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({ grant_type: "client_credentials", scope: "api_listings_write" }),
  });
  if (!res.ok) throw new Error("Domain auth failed");
  const data = await res.json();
  return data.access_token as string;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const agencyId = await getAgencyIdForUser(user.id);
  if (!agencyId) return NextResponse.json({ error: "No agency" }, { status: 400 });

  const creds = await getIntegrationCredentials(agencyId, "domain");
  if (!creds.api_key || !creds.api_secret) return notConfiguredResponse("Domain.com.au");

  const { listingId } = await req.json() as { listingId: string };

  const { data: listing } = await supabase
    .from("listings")
    .select(`*, properties ( address, suburb, state, postcode, bedrooms, bathrooms, parking, property_type, photo_urls )`)
    .eq("id", listingId)
    .single();

  if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

  const property = (listing as typeof listing & { properties: Record<string, unknown> }).properties;

  const token = await getDomainToken(creds.api_key, creds.api_secret);

  const domainPayload = {
    listingAction: "sale",
    propertyDetails: {
      propertyType: property?.property_type ?? "house",
      beds: property?.bedrooms ?? null,
      baths: property?.bathrooms ?? null,
      carspaces: property?.parking ?? null,
      address: {
        street: property?.address ?? "",
        suburb: property?.suburb ?? "",
        state: property?.state ?? "",
        postcode: property?.postcode ?? "",
        country: "AU",
      },
      images: ((property?.photo_urls as string[]) ?? []).map((url: string, i: number) => ({
        url,
        order: i + 1,
      })),
    },
    priceDetails: {
      displayPrice: listing.list_price ? `$${listing.list_price.toLocaleString()}` : "Contact Agent",
      priceFrom: listing.list_price ?? null,
    },
    status: "active",
    channel: "residential",
  };

  const domainRes = await fetch(`${DOMAIN_BASE}/listings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(domainPayload),
  });

  if (!domainRes.ok) {
    const err = await domainRes.text();
    return NextResponse.json({ error: `Domain API error: ${err}`, configured: true }, { status: 502 });
  }

  const result = await domainRes.json();

  await supabase
    .from("listings")
    .update({ vendor_notes: `Domain listing ID: ${result.id ?? "unknown"}` })
    .eq("id", listingId);

  return NextResponse.json({ configured: true, domainListingId: result.id, ...result });
}
