import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ReviewsClient from "./ReviewsClient";

export default async function ReviewsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("agency_id")
    .eq("id", user.id)
    .single();

  const { data: reviews } = await supabase
    .from("agent_reviews")
    .select("*")
    .eq("agent_id", user.id)
    .order("review_date", { ascending: false });

  return (
    <ReviewsClient
      initialReviews={reviews ?? []}
      agentId={user.id}
      agencyId={profile?.agency_id ?? ""}
    />
  );
}
