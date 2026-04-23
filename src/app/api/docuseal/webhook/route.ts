import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const secret = process.env.DOCUSEAL_WEBHOOK_SECRET;
  if (secret) {
    const sig = req.headers.get("x-docuseal-signature");
    if (sig !== secret) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = await req.json() as {
    event_type: string;
    data: { submission_id: number; status: string; submitters?: Array<{ status: string }> };
  };

  const submissionId = String(payload.data.submission_id);
  const supabase = await createClient();

  const { data: proposal } = await supabase
    .from("proposals")
    .select("id, status")
    .eq("docuseal_submission_id", submissionId)
    .single();

  if (!proposal) return NextResponse.json({ ok: true });

  const eventType = payload.event_type;

  if (eventType === "submission.completed") {
    await supabase
      .from("proposals")
      .update({ status: "signed", signed_at: new Date().toISOString() })
      .eq("id", proposal.id);

    await supabase.from("document_events").insert({
      proposal_id: proposal.id,
      event_type: "signed",
      section_id: null,
      duration_seconds: null,
      metadata: { submission_id: submissionId },
    });
  } else if (eventType === "submission.declined") {
    await supabase.from("proposals").update({ status: "declined" }).eq("id", proposal.id);

    await supabase.from("document_events").insert({
      proposal_id: proposal.id,
      event_type: "declined",
      section_id: null,
      duration_seconds: null,
      metadata: { submission_id: submissionId },
    });
  } else if (eventType === "submission.viewed") {
    if (proposal.status === "sent") {
      await supabase
        .from("proposals")
        .update({ status: "opened", first_opened_at: new Date().toISOString() })
        .eq("id", proposal.id);
    }
    await supabase.from("document_events").insert({
      proposal_id: proposal.id,
      event_type: "opened",
      section_id: null,
      duration_seconds: null,
      metadata: {},
    });
  }

  return NextResponse.json({ ok: true });
}
