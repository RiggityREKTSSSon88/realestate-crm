import { createClient } from "@/lib/supabase/server";
import ProposalsClient from "./ProposalsClient";

export default async function ProposalsPage() {
  const supabase = await createClient();

  const { data: proposals } = await supabase
    .from("proposals")
    .select("*, contacts(id, full_name, email), properties(id, address, suburb)")
    .order("updated_at", { ascending: false });

  const { data: events } = await supabase
    .from("document_events")
    .select("proposal_id, event_type");

  return (
    <ProposalsClient
      proposals={(proposals ?? []) as unknown as Parameters<typeof ProposalsClient>[0]["proposals"]}
      events={events ?? []}
    />
  );
}
