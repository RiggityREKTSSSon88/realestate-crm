import { createClient } from "@/lib/supabase/server";
import TemplatesClient from "./TemplatesClient";

export type Template = {
  id: string;
  agency_id: string;
  name: string;
  type: "email" | "sms";
  subject: string | null;
  body: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export default async function TemplatesPage() {
  const supabase = await createClient();

  const { data: templates } = await supabase
    .from("templates")
    .select("*")
    .order("type")
    .order("name");

  return <TemplatesClient initialTemplates={(templates ?? []) as Template[]} />;
}
