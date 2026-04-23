import { createClient } from "@/lib/supabase/server";
import AppraisalsClient from "./AppraisalsClient";

export default async function AppraisalsPage() {
  const supabase = await createClient();

  const { data: appraisals } = await supabase
    .from("appraisals")
    .select(`
      *,
      contacts ( id, full_name, email, phone, type, status ),
      properties ( id, address, suburb, state, postcode, property_type ),
      users ( id, full_name )
    `)
    .order("created_at", { ascending: false });

  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, full_name, email, phone, type, status")
    .order("full_name");

  // Cast needed: Supabase type inference doesn't resolve join shapes without Relationships defined
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typedAppraisals = (appraisals ?? []) as any;

  return (
    <AppraisalsClient
      initialAppraisals={typedAppraisals}
      contacts={contacts ?? []}
    />
  );
}
