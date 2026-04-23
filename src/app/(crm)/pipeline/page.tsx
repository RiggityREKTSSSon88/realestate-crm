import { createClient } from "@/lib/supabase/server";
import PipelineClient from "./PipelineClient";

export default async function PipelinePage() {
  const supabase = await createClient();

  const [propertiesRes, listingsRes] = await Promise.all([
    supabase
      .from("properties")
      .select(`
        id, address, suburb, state, property_type, status, updated_at,
        appraisals ( id, contact_id, estimated_value_low, estimated_value_high, status, appraisal_date,
          contacts ( id, full_name ) )
      `)
      .in("status", ["appraisal", "listed", "under_offer", "sold"])
      .order("updated_at", { ascending: false }),
    supabase
      .from("listings")
      .select("id, property_id, contact_id, list_price, list_date, status, enquiries_count, offers_received, contracts_out")
      .in("status", ["active", "under_offer", "sold"])
      .order("created_at", { ascending: false }),
  ]);

  return (
    <PipelineClient
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      properties={(propertiesRes.data ?? []) as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      listings={(listingsRes.data ?? []) as any}
    />
  );
}
