import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import IntegrationsClient from "./IntegrationsClient";

export default async function IntegrationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("agency_id, role")
    .eq("id", user.id)
    .single();

  const { data: settings } = await supabase
    .from("integration_settings")
    .select("integration_name, api_key, api_secret, config, connected_at")
    .eq("agency_id", profile?.agency_id ?? "");

  const { data: webhooks } = await supabase
    .from("zapier_webhooks")
    .select("*")
    .eq("agency_id", profile?.agency_id ?? "")
    .order("created_at", { ascending: false });

  const maskedSettings = (settings ?? []).map((row) => ({
    integration_name: row.integration_name,
    has_api_key: !!row.api_key,
    has_api_secret: !!row.api_secret,
    config: row.config as Record<string, unknown>,
    connected_at: row.connected_at,
  }));

  return (
    <IntegrationsClient
      userRole={profile?.role ?? "agent"}
      initialSettings={maskedSettings}
      initialWebhooks={webhooks ?? []}
    />
  );
}
