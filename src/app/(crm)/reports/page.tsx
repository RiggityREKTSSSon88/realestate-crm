import { createClient } from "@/lib/supabase/server";
import ReportsClient from "./ReportsClient";
import type { ReportData } from "./types";

export default async function ReportsPage() {
  const supabase = await createClient();

  const [agentsRes, listingsRes, appraisalsRes, commissionsRes, scheduledRes] = await Promise.all([
    supabase.from("users").select("id, full_name, email, role").order("full_name"),
    supabase
      .from("listings")
      .select(`*, properties(id,address,suburb,state,postcode,property_type), users:listed_by(id,full_name,email,role)`)
      .order("created_at", { ascending: false }),
    supabase
      .from("appraisals")
      .select(`*, properties(id,address,suburb,state,postcode,property_type), contacts(id,full_name)`)
      .order("appraisal_date", { ascending: false }),
    supabase
      .from("commissions")
      .select(`*, listings(*, properties(id,address,suburb,state,postcode,property_type)), agents:agent_id(id,full_name,email,role)`)
      .order("created_at", { ascending: false }),
    supabase.from("scheduled_reports").select("*").order("created_at", { ascending: false }),
  ]);

  const data: ReportData = {
    agents: (agentsRes.data ?? []) as ReportData["agents"],
    listings: (listingsRes.data ?? []) as unknown as ReportData["listings"],
    appraisals: (appraisalsRes.data ?? []) as unknown as ReportData["appraisals"],
    commissions: (commissionsRes.data ?? []) as unknown as ReportData["commissions"],
    scheduledReports: (scheduledRes.data ?? []) as ReportData["scheduledReports"],
  };

  return <ReportsClient data={data} />;
}
