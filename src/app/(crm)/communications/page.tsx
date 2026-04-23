import { createClient } from "@/lib/supabase/server";
import CommunicationsClient from "./CommunicationsClient";

export default async function CommunicationsPage() {
  const supabase = await createClient();

  const { data: communications } = await supabase
    .from("communications")
    .select(`
      *,
      contacts ( id, full_name ),
      users:sent_by ( id, full_name )
    `)
    .order("sent_at", { ascending: false })
    .limit(100);

  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, full_name")
    .order("full_name");

  return (
    <CommunicationsClient
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initialCommunications={(communications ?? []) as any}
      contacts={contacts ?? []}
    />
  );
}
