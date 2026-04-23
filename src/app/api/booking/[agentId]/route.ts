import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;
  const supabase = await createClient();

  const [availRes, apptRes, agentRes] = await Promise.all([
    supabase
      .from("booking_availability")
      .select("*")
      .eq("agent_id", agentId)
      .eq("active", true),
    supabase
      .from("booking_appointments")
      .select("scheduled_at")
      .eq("agent_id", agentId)
      .neq("status", "cancelled")
      .gte("scheduled_at", new Date().toISOString()),
    supabase
      .from("users")
      .select("id, full_name, email, avatar_url")
      .eq("id", agentId)
      .single(),
  ]);

  // Generate available slots for the next 14 days
  const availability = availRes.data ?? [];
  const booked = new Set((apptRes.data ?? []).map((a) => a.scheduled_at));

  const slots: { datetime: string; display: string }[] = [];
  const now = new Date();

  for (let dayOffset = 1; dayOffset <= 14; dayOffset++) {
    const date = new Date(now);
    date.setDate(date.getDate() + dayOffset);
    const dayOfWeek = date.getDay();

    const dayAvailability = availability.filter((a) => a.day_of_week === dayOfWeek);

    for (const avail of dayAvailability) {
      const [startH, startM] = avail.start_time.split(":").map(Number);
      const [endH, endM] = avail.end_time.split(":").map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      const slotDuration = avail.slot_duration_minutes;

      for (let minute = startMinutes; minute < endMinutes; minute += slotDuration) {
        const slotDate = new Date(date);
        slotDate.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
        const iso = slotDate.toISOString();
        if (!booked.has(iso)) {
          slots.push({
            datetime: iso,
            display: slotDate.toLocaleString("en-AU", {
              weekday: "short", day: "numeric", month: "short",
              hour: "numeric", minute: "2-digit", hour12: true,
            }),
          });
        }
      }
    }
  }

  return NextResponse.json({ agent: agentRes.data, slots });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;
  const supabase = await createClient();

  const body = await req.json() as {
    datetime: string;
    contactName: string;
    contactEmail?: string;
    contactPhone?: string;
    notes?: string;
    proposalId?: string;
  };

  if (!body.datetime || !body.contactName) {
    return NextResponse.json({ error: "datetime and contactName required" }, { status: 400 });
  }

  const { data: agent } = await supabase
    .from("users")
    .select("agency_id")
    .eq("id", agentId)
    .single();

  if (!agent?.agency_id) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const { data: appt, error } = await supabase
    .from("booking_appointments")
    .insert({
      agency_id: agent.agency_id,
      agent_id: agentId,
      proposal_id: body.proposalId ?? null,
      contact_name: body.contactName,
      contact_email: body.contactEmail ?? null,
      contact_phone: body.contactPhone ?? null,
      scheduled_at: body.datetime,
      notes: body.notes ?? null,
      status: "pending",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to book appointment" }, { status: 500 });

  // Track booking click on proposal if applicable
  if (body.proposalId) {
    await supabase.from("document_events").insert({
      proposal_id: body.proposalId,
      event_type: "booking_clicked",
      section_id: null,
      duration_seconds: null,
      metadata: { scheduled_at: body.datetime },
    });
  }

  return NextResponse.json({ success: true, appointment: appt });
}
