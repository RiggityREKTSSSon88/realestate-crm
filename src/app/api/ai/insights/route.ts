// TODO: ADD API KEY — set NEXT_PUBLIC_ANTHROPIC_API_KEY in .env.local before launch
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
      configured: false,
      summary: null,
      recommendation: null,
      followUp: null,
    });
  }

  const body = await req.json();
  const { contactId } = body as { contactId: string };
  if (!contactId) return NextResponse.json({ error: "contactId required" }, { status: 400 });

  const [contactRes, commsRes, appraisalsRes, tasksRes] = await Promise.all([
    supabase.from("contacts").select("full_name, status, type, last_contacted_at, lead_score, seller_likelihood, notes").eq("id", contactId).single(),
    supabase.from("communications").select("type, subject, body, sent_at, sentiment").eq("contact_id", contactId).order("sent_at", { ascending: false }).limit(10),
    supabase.from("appraisals").select("appraisal_date, status, estimated_value_low, estimated_value_high, notes").eq("contact_id", contactId).order("appraisal_date", { ascending: false }).limit(5),
    supabase.from("tasks").select("title, due_date, completed").eq("related_contact_id", contactId).order("due_date", { ascending: true }).limit(5),
  ]);

  const contact = contactRes.data;
  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  const daysSinceLast = contact.last_contacted_at
    ? Math.floor((Date.now() - new Date(contact.last_contacted_at).getTime()) / 86400000)
    : null;

  const sentimentBreakdown = (commsRes.data ?? []).reduce((acc: Record<string, number>, c) => {
    if (c.sentiment) acc[c.sentiment] = (acc[c.sentiment] ?? 0) + 1;
    return acc;
  }, {});

  const context = {
    contact: {
      name: contact.full_name,
      status: contact.status,
      type: contact.type,
      leadScore: contact.lead_score,
      sellerLikelihood: contact.seller_likelihood,
      daysSinceLastContact: daysSinceLast,
      notes: contact.notes,
    },
    communications: {
      total: (commsRes.data ?? []).length,
      sentimentBreakdown,
      recent: (commsRes.data ?? []).slice(0, 3).map((c) => ({
        type: c.type,
        subject: c.subject,
        sentiment: c.sentiment,
        date: c.sent_at,
      })),
    },
    appraisals: (appraisalsRes.data ?? []).map((a) => ({
      date: a.appraisal_date,
      status: a.status,
      valueLow: a.estimated_value_low,
      valueHigh: a.estimated_value_high,
    })),
    openTasks: (tasksRes.data ?? []).filter((t) => !t.completed).map((t) => ({
      title: t.title,
      dueDate: t.due_date,
    })),
  };

  const prompt = `You are an AI assistant for a real estate CRM. Analyse this contact's full engagement history and provide actionable insights for the agent.

Contact data:
${JSON.stringify(context, null, 2)}

Respond with a JSON object with exactly these fields:
{
  "summary": "2-3 sentence summary of the contact's engagement history and current situation",
  "recommendation": "The single most important action the agent should take next, and why",
  "followUp": "Specific follow-up message suggestion or talking point the agent could use",
  "engagementLevel": "low|medium|high"
}`;

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
