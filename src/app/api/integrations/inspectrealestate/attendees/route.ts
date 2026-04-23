// TODO: ADD INSPECTREALESTATE API KEY — set in Settings → Integrations → InspectRealEstate
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getIntegrationCredentials, getAgencyIdForUser, notConfiguredResponse } from "@/lib/integrations";

const IRE_BASE = "https://api.inspectrealestate.com.au/v1";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const agencyId = await getAgencyIdForUser(user.id);
  if (!agencyId) return NextResponse.json({ error: "No agency" }, { status: 400 });

  const creds = await getIntegrationCredentials(agencyId, "inspectrealestate");
  if (!creds.api_key) return notConfiguredResponse("InspectRealEstate");

  const { searchParams } = new URL(req.url);
  const ireOpenHomeId = searchParams.get("ireOpenHomeId");
  const openHomeId = searchParams.get("openHomeId");

  if (!ireOpenHomeId) return NextResponse.json({ error: "ireOpenHomeId required" }, { status: 400 });

  const ireRes = await fetch(`${IRE_BASE}/open-homes/${ireOpenHomeId}/attendees`, {
    headers: { "X-API-Key": creds.api_key },
  });

  if (!ireRes.ok) {
    return NextResponse.json({ error: "InspectRealEstate error", configured: true }, { status: 502 });
  }

  const { attendees } = await ireRes.json() as {
    attendees: Array<{
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      feedback?: string;
    }>;
  };

  // Sync attendees back to open_homes.attendees
  if (openHomeId && attendees?.length) {
    await supabase
      .from("open_homes")
      .update({ attendees })
      .eq("id", openHomeId);
  }

  return NextResponse.json({ configured: true, attendees: attendees ?? [], synced: openHomeId ? (attendees?.length ?? 0) : 0 });
}
