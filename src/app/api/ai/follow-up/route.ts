// TODO: ADD API KEY — set ANTHROPIC_API_KEY in .env.local before launch (server-side only, never NEXT_PUBLIC_)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient } from "@/lib/anthropic";

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const anthropic = getAnthropicClient();
  if (!anthropic) {
    return NextResponse.json({
      suggestion: "AI features not yet configured. Add ANTHROPIC_API_KEY to .env.local to enable follow-up suggestions.",
      configured: false,
    });
  }

  const body = await req.json();
  const { contactId } = body as { contactId: string };
  if (!contactId) return NextResponse.json({ error: "contactId required" }, { status: 400 });

  const [contactRes, tasksRes, commsRes, appraisalsRes] = await Promise.all([
    supabase.from("contacts").select("full_name, status, type, last_contacted_at, lead_score").eq("id", contactId).single(),
    supabase.from("tasks").select("title, due_date, completed").eq("related_contact_id", contactId).eq("completed", false).order("due_date", { ascending: true }).limit(5),
    supabase.from("communications").select("type, subject, sent_at, sentiment").eq("contact_id", contactId).order("sent_at", { ascending: false }).limit(5),
    supabase.from("appraisals").select("appraisal_date, status, estimated_value_low, estimated_value_high").eq("contact_id", contactId).order("appraisal_date", { ascending: false }).limit(3),
  ]);

  const contact = contactRes.data;
  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  const daysSinceLast = contact.last_contacted_at
    ? Math.floor((Date.now() - new Date(contact.last_contacted_at).getTime()) / 86400000)
    : null;

  const context = {
    name: contact.full_name,
    status: contact.status,
    type: contact.type,
    leadScore: contact.lead_score,
    daysSinceLastContact: daysSinceLast,
    upcomingTasks: (tasksRes.data ?? []).map((t) => ({ title: t.title, dueDate: t.due_date })),
    recentComms: (commsRes.data ?? []).map((c) => ({ type: c.type, subject: c.subject, sentiment: c.sentiment, date: c.sent_at })),
    recentAppraisals: (appraisalsRes.data ?? []).map((a) => ({ date: a.appraisal_date, status: a.status, valueLow: a.estimated_value_low, valueHigh: a.estimated_value_high })),
  };

  const prompt = `You are a real estate agent assistant. Based on this contact's profile, suggest the single most important next action the agent should take.

Contact data:
${JSON.stringify(context, null, 2)}

Respond with a JSON object: {"action":"call|email|sms|visit|task","suggestion":"one concise sentence describing exactly what to do and why","urgency":"low|medium|high"}`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content.find((b) => b.type === "text")?.text ?? "{}";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return NextResponse.json({ error: "Invalid AI response" }, { status: 500 });

  return NextResponse.json({ ...JSON.parse(jsonMatch[0]), configured: true });
}
