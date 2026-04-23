import { createClient } from "@/lib/supabase/server";

export type IntegrationName =
  | "corelogic"
  | "domain"
  | "ratemyagent"
  | "inspectrealestate"
  | "reiformslive"
  | "movemein";

export type IntegrationCredentials = {
  api_key: string | null;
  api_secret: string | null;
  config: Record<string, unknown>;
};

export async function getIntegrationCredentials(
  agencyId: string,
  integration: IntegrationName
): Promise<IntegrationCredentials> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("integration_settings")
    .select("api_key, api_secret, config")
    .eq("agency_id", agencyId)
    .eq("integration_name", integration)
    .single();
  return {
    api_key: data?.api_key ?? null,
    api_secret: data?.api_secret ?? null,
    config: (data?.config as Record<string, unknown>) ?? {},
  };
}

export async function getAgencyIdForUser(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("agency_id")
    .eq("id", userId)
    .single();
  return data?.agency_id ?? null;
}

export function notConfiguredResponse(integration: string) {
  return Response.json(
    {
      configured: false,
      error: `${integration} is not yet connected. Add your API key in Settings → Integrations.`,
    },
    { status: 503 }
  );
}
