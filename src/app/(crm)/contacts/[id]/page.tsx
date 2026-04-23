import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import GoldenProfileClient from "./GoldenProfileClient";
import type { KYCDocument, ComplianceAuditLog } from "@/types/database";

export default async function ContactProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: contact } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", id)
    .single();

  if (!contact) notFound();

  const { data: appraisals } = await supabase
    .from("appraisals")
    .select(`*, properties ( id, address, suburb, state, postcode, property_type )`)
    .eq("contact_id", id)
    .order("appraisal_date", { ascending: false });

  const propertyIds = (appraisals ?? []).map((a) => a.property_id).filter(Boolean);

  const [communicationsRes, tasksContactRes, tasksPropertyRes, listingsRes, proposalsRes, kycDocsRes, auditRes, userRoleRes] = await Promise.all([
    supabase
      .from("communications")
      .select("*")
      .eq("contact_id", id)
      .order("sent_at", { ascending: false })
      .limit(20),
    supabase
      .from("tasks")
      .select("*")
      .eq("related_contact_id", id)
      .order("due_date", { ascending: true }),
    propertyIds.length > 0
      ? supabase
          .from("tasks")
          .select("*")
          .in("related_property_id", propertyIds)
          .order("due_date", { ascending: true })
      : Promise.resolve({ data: [] }),
    propertyIds.length > 0
      ? supabase
          .from("listings")
          .select(`*, properties ( id, address, suburb, state, property_type )`)
          .in("property_id", propertyIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase
      .from("proposals")
      .select("*, document_events(id, event_type, duration_seconds)")
      .eq("contact_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("kyc_documents")
      .select("*")
      .eq("contact_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("compliance_audit_log")
      .select("*")
      .eq("contact_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    user
      ? supabase.from("users").select("role").eq("id", user.id).single()
      : Promise.resolve({ data: null }),
  ]);

  const allTaskIds = new Set<string>();
  const allTasks = [...(tasksContactRes.data ?? []), ...(tasksPropertyRes.data ?? [])].filter((t) => {
    if (allTaskIds.has(t.id)) return false;
    allTaskIds.add(t.id);
    return true;
  }).sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));

  return (
    <GoldenProfileClient
      contact={contact}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      appraisals={(appraisals ?? []) as any}
      communications={communicationsRes.data ?? []}
      tasks={allTasks}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      listings={(listingsRes.data ?? []) as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      proposals={(proposalsRes.data ?? []) as any}
      kycDocuments={(kycDocsRes.data ?? []) as KYCDocument[]}
      auditLog={(auditRes.data ?? []) as ComplianceAuditLog[]}
      currentUserRole={userRoleRes.data?.role ?? "agent"}
    />
  );
}
