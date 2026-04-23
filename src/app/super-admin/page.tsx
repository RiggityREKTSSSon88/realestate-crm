import { createClient } from "@/lib/supabase/server";
import SuperAdminClient from "./SuperAdminClient";

type AgencyRow = {
  id: string;
  name: string;
  subscription_plan: string;
  subscription_status: string;
  onboarding_completed: boolean;
  trial_ends_at: string | null;
  created_at: string;
};

type UserRow = {
  id: string;
  agency_id: string | null;
  full_name: string;
  email: string;
  role: string;
};

export default async function SuperAdminPage() {
  const supabase = await createClient();

  const [agenciesRes, usersRes] = await Promise.all([
    supabase
      .from("agencies")
      .select("id, name, subscription_plan, subscription_status, onboarding_completed, trial_ends_at, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("users")
      .select("id, agency_id, full_name, email, role")
      .order("created_at", { ascending: false }),
  ]);

  const agencies = (agenciesRes.data ?? []) as AgencyRow[];
  const users = (usersRes.data ?? []) as UserRow[];

  return <SuperAdminClient agencies={agencies} users={users} />;
}
