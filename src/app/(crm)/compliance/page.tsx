import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ComplianceClient from "./ComplianceClient";
import type { KYCDocument, ComplianceAuditLog } from "@/types/database";

type ContactCompliance = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  type: string;
  kyc_status: "unverified" | "pending" | "verified";
  kyc_verified_at: string | null;
  aml_risk_level: "low" | "medium" | "high" | null;
  aml_assessed_at: string | null;
};

type AuditEntry = ComplianceAuditLog & { users: { full_name: string } | null };

export default async function CompliancePage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [contactsRes, documentsRes, auditRes, userRoleRes] = await Promise.all([
    supabase
      .from("contacts")
      .select("id, full_name, email, phone, type, kyc_status, kyc_verified_at, aml_risk_level, aml_assessed_at")
      .order("full_name"),
    supabase
      .from("kyc_documents")
      .select("*"),
    supabase
      .from("compliance_audit_log")
      .select("*, users:performed_by(full_name)")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single(),
  ]);

  const contacts = (contactsRes.data ?? []) as ContactCompliance[];
  const documents = (documentsRes.data ?? []) as KYCDocument[];
  const auditLog = (auditRes.data ?? []) as unknown as AuditEntry[];
  const currentUserRole = userRoleRes.data?.role ?? "agent";

  return (
    <ComplianceClient
      contacts={contacts}
      documents={documents}
      auditLog={auditLog}
      currentUserRole={currentUserRole}
    />
  );
}
