import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAgencyIdForUser } from "@/lib/integrations";

// GET — fetch all integration settings for this agency
export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const agencyId = await getAgencyIdForUser(user.id);
  if (!agencyId) return NextResponse.json({ error: "No agency" }, { status: 400 });

  const { data } = await supabase
    .from("integration_settings")
    .select("integration_name, api_key, api_secret, config, connected_at")
    .eq("agency_id", agencyId);

  // Mask keys in response — only expose whether they are set
  const settings = (data ?? []).map((row) => ({
    integration_name: row.integration_name,
    has_api_key: !!row.api_key,
    has_api_secret: !!row.api_secret,
    config: row.config,
    connected_at: row.connected_at,
  }));

  return NextResponse.json({ settings });
}

// POST — save or update integration credentials
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { data: profile } = await supabase.from("users").select("agency_id, role").eq("id", user.id).single();
  if (!profile?.agency_id) return NextResponse.json({ error: "No agency" }, { status: 400 });
  if (profile.role === "agent") return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const { integration_name, api_key, api_secret, config } = await req.json() as {
    integration_name: string;
    api_key?: string;
    api_secret?: string;
    config?: Record<string, unknown>;
  };

  if (!integration_name) return NextResponse.json({ error: "integration_name required" }, { status: 400 });

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("integration_settings")
    .upsert(
      {
        agency_id: profile.agency_id,
        integration_name,
        api_key: api_key ?? null,
        api_secret: api_secret ?? null,
        config: (config ?? {}) as import("@/types/database").Json,
        connected_at: api_key ? now : null,
        updated_at: now,
      },
      { onConflict: "agency_id,integration_name" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
