// TODO: ADD API KEY — set NEXT_PUBLIC_ANTHROPIC_API_KEY in .env.local before launch
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient } from "@/lib/anthropic";

export async function POST(_req: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const anthropic = getAnthropicClient();
  if (!anthropic) {
    return NextResponse.json({ error: "AI features not yet configured. Add NEXT_PUBLIC_ANTHROPIC_API_KEY to enable." }, { status: 503 });
  }

  const { data: userData } = await supabase.from("users").select("agency_id").eq("id", user.id).single();
  if (!userData?.agency_id) return NextResponse.json({ error: "No agency" }, { status: 400 });

  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, full_name, status, type, last_contacted_at, seller_likelihood")
    .eq("agency_id", userData.agency_id);

  if (!contacts || contacts.length === 0) return NextResponse.json({ updated: 0 });

  const { data: appraisals } = await supabase
    .from("appraisals")
    .select("contact_id, appraisal_date, status")
    .eq("agency_id", userData.agency_id);

  const { data: communications } = await supabase
    .from("communications")
    .select("contact_id, sent_at, sentiment")
    .eq("agency_id", userData.agency_id)
    .order("sent_at", { ascending: false });

  const appraisalsByContact = new Map<string, typeof appraisals>();
  for (const a of appraisals ?? []) {
    const list = appraisalsByContact.get(a.contact_id) ?? [];
    list.push(a);
    appraisalsByContact.set(a.contact_id, list);
  }

  const commsByContact = new Map<string, typeof communications>();
  for (const c of communications ?? []) {
    const list = commsByContact.get(c.contact_id) ?? [];
    list.push(c);
    commsByContact.set(c.contact_id, list);
  }

  const contactSummaries = contacts.map((c) => {
    const appr = appraisalsByContact.get(c.id) ?? [];
    const comms = commsByContact.get(c.id) ?? [];
    const daysSinceLast = c.last_contacted_at
      ? Math.floor((Date.now() - new Date(c.last_contacted_at).getTime()) / 86400000)
      : null;
    const sentimentCounts = comms.reduce((acc: Record<string, number>, cm) => {
      if (cm.sentiment) acc[cm.sentiment] = (acc[cm.sentiment] ?? 0) + 1;
      return acc;
    }, {});
    return {
      id: c.id,
      status: c.status,
      type: c.type,
      appraisalCount: appr.length,
      hotAppraisals: appr.filter((a) => a.status === "hot").length,
      recentAppraisals: appr.filter((a) => {
        const age = (Date.now() - new Date(a.appraisal_date).getTime()) / 86400000;
        return age <= 90;
      }).length,
      commCount: comms.length,
      daysSinceLast,
      sentimentCounts,
    };
  });

  const prompt = `You are a real estate CRM scoring engine. Score each contact's lead quality from 0-100 and their seller likelihood (low/medium/high).

Rules:
- Status hot=+30, warm=+20, cold=+10
- Each hot appraisal +15, warm appraisal +8
- Recent appraisal (≤90 days) +10 each
- High comm frequency (≥5) +10
- Positive sentiments +5, negative -5, urgent +15
- Days since last contact: ≤7 +10, ≤30 +5, >60 -10, never -15
- Seller likelihood: high if appraisalCount≥2 AND recentAppraisals≥1; medium if appraisalCount≥1; low otherwise
- Cap score 0-100

Contacts JSON:
${JSON.stringify(contactSummaries)}

Respond ONLY with a JSON array: [{"id":"...","score":N,"seller_likelihood":"low|medium|high"},...]`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content.find((b) => b.type === "text")?.text ?? "[]";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return NextResponse.json({ error: "Invalid AI response" }, { status: 500 });

  const scores: { id: string; score: number; seller_likelihood: string }[] = JSON.parse(jsonMatch[0]);

  let updated = 0;
  for (const s of scores) {
    await supabase
      .from("contacts")
      .update({ lead_score: s.score, seller_likelihood: s.seller_likelihood as "low" | "medium" | "high" })
      .eq("id", s.id);
    updated++;
  }

  return NextResponse.json({ updated });
}
