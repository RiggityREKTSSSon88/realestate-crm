import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import OnboardingFlow from "./OnboardingFlow";

export default async function OnboardingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: userProfile } = await supabase
    .from("users")
    .select("id, full_name, agency_id, role")
    .eq("id", user.id)
    .single();

  if (!userProfile) {
    return (
      <OnboardingFlow
        userId={user.id}
        userEmail={user.email ?? ""}
        existingAgencyId={null}
        existingFullName={null}
      />
    );
  }

  if (userProfile.agency_id) {
    const { data: agency } = await supabase
      .from("agencies")
      .select("onboarding_completed")
      .eq("id", userProfile.agency_id)
      .single();

    if (agency?.onboarding_completed) {
      redirect("/dashboard");
    }
  }

  return (
    <OnboardingFlow
      userId={user.id}
      userEmail={user.email ?? ""}
      existingAgencyId={userProfile.agency_id ?? null}
      existingFullName={userProfile.full_name ?? null}
    />
  );
}
