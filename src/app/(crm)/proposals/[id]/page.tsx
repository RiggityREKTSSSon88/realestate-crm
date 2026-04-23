import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import ProposalBuilder from "../new/ProposalBuilder";
import type { Proposal } from "@/types/database";

export default async function EditProposalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const [
    { data: proposal },
    { data: contacts },
    { data: properties },
    { data: appraisals },
    { data: reviews },
    { data: currentUser },
  ] = await Promise.all([
    supabase.from("proposals").select("*").eq("id", id).single(),
    supabase.from("contacts").select("id, full_name, email").order("full_name"),
    supabase.from("properties").select("id, address, suburb, state").order("address"),
    supabase
      .from("appraisals")
      .select("id, property_id, comparable_sales, estimated_value_low, estimated_value_high"),
    supabase.from("agent_reviews").select("*").eq("agent_id", authData.user.id),
    supabase
      .from("users")
      .select("id, full_name, email, role, avatar_url")
      .eq("id", authData.user.id)
      .single(),
  ]);

  if (!proposal) notFound();
  if (!currentUser) redirect("/login");

  return (
    <ProposalBuilder
      proposal={proposal as Proposal}
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
