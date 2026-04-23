import { createClient } from "@/lib/supabase/server";
import PropertiesClient from "./PropertiesClient";

export default async function PropertiesPage() {
  const supabase = await createClient();
  const { data: properties } = await supabase
    .from("properties")
    .select("*")
    .order("created_at", { ascending: false });

  return <PropertiesClient initialProperties={properties ?? []} />;
}
