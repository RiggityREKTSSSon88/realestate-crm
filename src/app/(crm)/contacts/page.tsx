import { createClient } from "@/lib/supabase/server";
import ContactsClient from "./ContactsClient";

export default async function ContactsPage() {
  const supabase = await createClient();

  const { data: contacts, error } = await supabase
    .from("contacts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching contacts:", error);
  }

  return <ContactsClient initialContacts={contacts ?? []} />;
}
