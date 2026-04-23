import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import CheckInClient from "./CheckInClient";
import type { OpenHome } from "@/types/database";

type OpenHomeWithRelations = OpenHome & {
  listings: {
    id: string;
    list_price: number | null;
    list_date: string;
    properties: { address: string; suburb: string; state: string } | null;
  } | null;
};

export default async function OpenHomePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: openHome } = await supabase
    .from("open_homes")
    .select(`*, listings ( id, list_price, list_date, properties ( address, suburb, state ) )`)
    .eq("id", id)
    .single();

  if (!openHome) notFound();

  return <CheckInClient openHome={openHome as unknown as OpenHomeWithRelations} />;
}
