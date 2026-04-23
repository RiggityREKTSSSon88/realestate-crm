import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    proposalId: string;
    eventType: "opened" | "section_viewed" | "time_spent" | "booking_clicked";
    sectionId?: string;
    durationSeconds?: number;
  };

  const { proposalId, eventType, sectionId, durationSeconds } = body;
  if (!proposalId || !eventType) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // Use service role for public writes — falls back to anon insert (RLS allows it)
  const supabase = await createClient();

  await supabase.from("document_events").insert({
    proposal_id: proposalId,
    event_type: eventType,
    section_id: sectionId ?? null,
    duration_seconds: durationSeconds ?? null,
    metadata: {},
  });

  // Update aggregate on proposal for "opened" and "time_spent"
  if (eventType === "opened") {
    const { data: proposal } = await supabase
      .from("proposals")
      .select("status, first_opened_at")
      .eq("id", proposalId)
      .single();

    if (proposal && proposal.status === "sent") {
      await supabase
        .from("proposals")
        .update({
          status: "opened",
          first_opened_at: proposal.first_opened_at ?? new Date().toISOString(),
        })
        .eq("id", proposalId);
    } else if (proposal && !proposal.first_opened_at) {
      await supabase
        .from("proposals")
        .update({ first_opened_at: new Date().toISOString() })
        .eq("id", proposalId);
    }
  }

  if (eventType === "time_spent" && durationSeconds) {
    const { data: p } = await supabase
      .from("proposals")
      .select("total_view_seconds")
      .eq("id", proposalId)
      .single();
    if (p) {
      await supabase
        .from("proposals")
        .update({ total_view_seconds: (p.total_view_seconds ?? 0) + durationSeconds })
        .eq("id", proposalId);
    }
  }

  return NextResponse.json({ ok: true });
}
