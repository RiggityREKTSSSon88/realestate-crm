import { createClient } from "@/lib/supabase/server";
import ListingsClient from "./ListingsClient";

export default async function ListingsPage() {
  const supabase = await createClient();

  const { data: listings } = await supabase
    .from("listings")
    .select(`
      *,
      properties ( id, address, suburb, state, postcode, property_type ),
      users:listed_by ( id, full_name )
    `)
    .order("created_at", { ascending: false });

  const { data: properties } = await supabase
    .from("properties")
    .select("id, address, suburb, state")
    .order("address");

  return (
    <ListingsClient
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initialListings={(listings ?? []) as any}
      properties={properties ?? []}
    />
  );
}
