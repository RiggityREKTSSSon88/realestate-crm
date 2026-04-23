import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ProposalBuilder from "./ProposalBuilder";

export default async function NewProposalPage() {
  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const [
    { data: contacts },
    { data: properties },
    { data: appraisals },
    { data: reviews },
    { data: currentUser },
  ] = await Promise.all([
    supabase
      .from("contacts")
      .select("id, full_name, email")
      .order("full_name"),
    supabase
      .from("properties")
      .select("id, address, suburb, state")
      .order("address"),
    supabase
      .from("appraisals")
      .select("id, property_id, comparable_sales, estimated_value_low, estimated_value_high"),
    supabase
      .from("agent_reviews")
      .select("*")
      .eq("agent_id", authData.user.id),
    supabase
      .from("users")
      .select("id, full_name, email, role, avatar_url")
      .eq("id", authData.user.id)
      .single(),
  ]);

  if (!currentUser) redirect("/login");

  return (
    <ProposalBuilder
      contacts={(contacts ?? []) as { id: string; full_name: string; email: string }[]}
      properties={properties ?? []}
      appraisals={(appraisals ?? []) as {
        id: string;
        property_id: string;
        comparable_sales: unknown[];
        estimated_value_low: number | null;
        estimated_value_high: number | null;
      }[]}
      reviews={reviews ?? []}
      currentUser={currentUser as { id: string; full_name: string; email: string; role: string; avatar_url: string | null }}
    />
  );
}
