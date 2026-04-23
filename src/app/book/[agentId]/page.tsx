import { createClient } from "@/lib/supabase/server";
import type { BookingAvailability } from "@/types/database";
import BookingWidget from "./BookingWidget";

type PageProps = {
  params: Promise<{ agentId: string }>;
  searchParams: Promise<{ proposalId?: string }>;
};

type Slot = {
  datetime: string;
  display: string;
};

function generateSlots(
  availability: BookingAvailability[],
  bookedDatetimes: string[]
): Slot[] {
  const bookedSet = new Set(
    bookedDatetimes.map((d) => new Date(d).toISOString())
  );

  const now = new Date();
  const slots: Slot[] = [];

  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    const date = new Date(now);
    date.setDate(now.getDate() + dayOffset);
    const dayOfWeek = date.getDay();

    const matchingRules = availability.filter(
      (a) => a.day_of_week === dayOfWeek
    );

    for (const rule of matchingRules) {
      const [startHour, startMin] = rule.start_time.split(":").map(Number);
      const [endHour, endMin] = rule.end_time.split(":").map(Number);

      if (startHour === undefined || startMin === undefined || endHour === undefined || endMin === undefined) {
        continue;
      }

      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      const duration = rule.slot_duration_minutes ?? 30;

      for (let m = startMinutes; m + duration <= endMinutes; m += duration) {
        const slotDate = new Date(date);
        slotDate.setHours(Math.floor(m / 60), m % 60, 0, 0);

        if (slotDate <= now) continue;

        const isoStr = slotDate.toISOString();
        if (bookedSet.has(isoStr)) continue;

        const display = slotDate.toLocaleTimeString("en-AU", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });

        slots.push({ datetime: isoStr, display });
      }
    }
  }

  slots.sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
  return slots;
}

export default async function BookingPage({ params, searchParams }: PageProps) {
  const { agentId } = await params;
  const { proposalId } = await searchParams;

  const supabase = await createClient();

  const [agentRes, availRes, apptRes] = await Promise.all([
    supabase
      .from("users")
      .select("id, full_name, email, avatar_url")
      .eq("id", agentId)
      .single(),
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
  ]);

  if (!agentRes.data) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          background: "#f0f2f5",
        }}
      >
        <div style={{ textAlign: "center", padding: "40px" }}>
          <div style={{ fontSize: "48px", color: "#0F2942", fontWeight: 800, marginBottom: "8px" }}>
            Estate<span style={{ color: "#F5A623" }}>IQ</span>
          </div>
          <p style={{ color: "#555", fontSize: "18px" }}>This booking page is not available.</p>
        </div>
      </div>
    );
  }

  const agent = agentRes.data;
  const availability = availRes.data ?? [];
  const bookedDatetimes = (apptRes.data ?? []).map((a) => a.scheduled_at);
  const slots = generateSlots(availability, bookedDatetimes);

  return (
    <BookingWidget
      agent={{
        id: agent.id,
        full_name: agent.full_name,
        email: agent.email,
        avatar_url: agent.avatar_url,
      }}
      slots={slots}
      proposalId={proposalId}
    />
  );
}
