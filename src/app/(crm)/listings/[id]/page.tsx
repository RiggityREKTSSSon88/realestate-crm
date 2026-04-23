import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import VendorReportClient from "./VendorReportClient";

export default async function VendorReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: listing } = await supabase
    .from("listings")
    .select(`
      *,
      properties ( id, address, suburb, state, postcode, property_type, bedrooms, bathrooms ),
      contacts:contact_id ( id, full_name, phone, email ),
      agents:listed_by ( id, full_name )
    `)
    .eq("id", id)
    .single();

  if (!listing) notFound();

  const { data: openHomes } = await supabase
    .from("open_homes")
    .select("*")
    .eq("listing_id", id)
    .order("scheduled_at", { ascending: false });

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("related_property_id", listing.property_id)
    .order("due_date", { ascending: true });

  const { data: commission } = await supabase
    .from("commissions")
    .select("*")
    .eq("listing_id", id)
    .single();

  const { data: agents } = await supabase
    .from("users")
    .select("id, full_name")
    .order("full_name");

  return (
    <VendorReportClient
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      listing={listing as any}
      openHomes={openHomes ?? []}
      tasks={tasks ?? []}
      commission={commission ?? null}
      agents={agents ?? []}
    />
  );
}
