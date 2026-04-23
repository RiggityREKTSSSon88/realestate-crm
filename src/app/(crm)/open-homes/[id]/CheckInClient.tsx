"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { OpenHome, Json } from "@/types/database";

type Attendee = {
  name: string;
  phone: string;
  email: string;
  registered_at: string;
};

type OpenHomeWithRelations = OpenHome & {
  listings: {
    id: string;
    list_price: number | null;
    list_date: string;
    properties: { address: string; suburb: string; state: string } | null;
  } | null;
};

type Props = { openHome: OpenHomeWithRelations };

function toAttendees(raw: Json): Attendee[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is Attendee =>
      item !== null &&
      typeof item === "object" &&
      !Array.isArray(item) &&
      typeof (item as Record<string, unknown>).name === "string"
  );
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  fontSize: "14px",
  border: "1px solid var(--color-slate-200)",
  borderRadius: "8px",
  outline: "none",
  backgroundColor: "var(--color-slate-50)",
  color: "var(--color-slate-800)",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 600,
  color: "var(--color-slate-500)",
  marginBottom: "6px",
  display: "block",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

export default function CheckInClient({ openHome }: Props) {
  const [attendees, setAttendees] = useState<Attendee[]>(
    toAttendees(openHome.attendees)
  );
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prop = openHome.listings?.properties;
  const address = prop ? `${prop.address}, ${prop.suburb} ${prop.state}` : "Open Home";

  async function handleCheckIn(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setError(null);
    setSubmitting(true);

    const newAttendee: Attendee = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      registered_at: new Date().toISOString(),
    };

    const optimistic = [newAttendee, ...attendees];
    setAttendees(optimistic);
    setName("");
    setPhone("");
    setEmail("");

    const supabase = createClient();
    const { data: current } = await supabase
      .from("open_homes")
      .select("attendees")
      .eq("id", openHome.id)
      .single();

    const existing = toAttendees((current?.attendees ?? []) as Json);
    const updated = [...existing, newAttendee];

    const { error: updateErr } = await supabase
      .from("open_homes")
      .update({ attendees: updated as unknown as Json })
      .eq("id", openHome.id);

    if (updateErr) {
      setError("Failed to save check-in. Please try again.");
      setAttendees(attendees);
    }

    setSubmitting(false);
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div
        className="rounded-xl p-6 mb-6"
        style={{ backgroundColor: "white", border: "1px solid var(--color-slate-200)" }}
      >
        <h1
          style={{
            fontSize: "22px",
            fontWeight: 700,
            color: "var(--color-navy-800)",
            marginBottom: "4px",
          }}
        >
          {address}
        </h1>
        <p style={{ fontSize: "14px", color: "var(--color-slate-500)" }}>
          Open Home &mdash; {fmtDateTime(openHome.scheduled_at)}
        </p>

        <div
          className="flex items-center gap-6 mt-4 pt-4"
          style={{ borderTop: "1px solid var(--color-slate-100)" }}
        >
          <div>
            <span
              style={{
                fontSize: "28px",
                fontWeight: 700,
                color: "var(--color-navy-800)",
                lineHeight: 1,
                display: "block",
              }}
            >
              {attendees.length}
            </span>
            <span style={{ fontSize: "12px", color: "var(--color-slate-400)" }}>
              {attendees.length === 1 ? "attendee" : "attendees"}
            </span>
          </div>
          <div
            style={{ width: 1, height: 36, backgroundColor: "var(--color-slate-100)" }}
          />
          <div>
            <span
              style={{
                fontSize: "14px",
                fontWeight: 500,
                color: "var(--color-slate-700)",
                display: "block",
              }}
            >
              {new Date(openHome.scheduled_at).toLocaleTimeString("en-AU", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              })}
            </span>
            <span style={{ fontSize: "12px", color: "var(--color-slate-400)" }}>
              scheduled time
            </span>
          </div>
        </div>
      </div>

      <div
        className="rounded-xl p-6 mb-6"
        style={{ backgroundColor: "white", border: "1px solid var(--color-slate-200)" }}
      >
        <h2
          style={{
            fontSize: "15px",
            fontWeight: 600,
            color: "var(--color-navy-800)",
            marginBottom: "20px",
          }}
        >
          Check In
        </h2>

        <form onSubmit={handleCheckIn} className="flex flex-col gap-4">
          {error && (
            <div
              className="rounded-lg px-4 py-3"
              style={{ backgroundColor: "#fee2e2", color: "#b91c1c", fontSize: "13px" }}
            >
              {error}
            </div>
          )}

          <div>
            <label style={labelStyle}>Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              style={inputStyle}
              onFocus={(e) =>
                ((e.currentTarget as HTMLElement).style.borderColor = "var(--color-navy-800)")
              }
              onBlur={(e) =>
                ((e.currentTarget as HTMLElement).style.borderColor = "var(--color-slate-200)")
              }
            />
          </div>

          <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div>
              <label style={labelStyle}>Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="04XX XXX XXX"
                style={inputStyle}
                onFocus={(e) =>
                  ((e.currentTarget as HTMLElement).style.borderColor = "var(--color-navy-800)")
                }
                onBlur={(e) =>
                  ((e.currentTarget as HTMLElement).style.borderColor = "var(--color-slate-200)")
                }
              />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                style={inputStyle}
                onFocus={(e) =>
                  ((e.currentTarget as HTMLElement).style.borderColor = "var(--color-navy-800)")
                }
                onBlur={(e) =>
                  ((e.currentTarget as HTMLElement).style.borderColor = "var(--color-slate-200)")
                }
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: "100%",
              padding: "11px 0",
              fontSize: "14px",
              fontWeight: 600,
              backgroundColor: "var(--color-navy-800)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: submitting ? "not-allowed" : "pointer",
              opacity: submitting ? 0.7 : 1,
              marginTop: "4px",
            }}
          >
            {submitting ? "Checking in…" : "Check In"}
          </button>
        </form>
      </div>

      <div
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: "white", border: "1px solid var(--color-slate-200)" }}
      >
        <div
          className="flex items-center gap-2 px-5 py-4"
          style={{ borderBottom: "1px solid var(--color-slate-200)" }}
        >
          <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-navy-800)" }}>
            Attendees
          </span>
          <span
            className="ml-auto rounded-full px-2 py-0.5"
            style={{
              fontSize: "11px",
              backgroundColor: "var(--color-slate-100)",
              color: "var(--color-slate-500)",
            }}
          >
            {attendees.length}
          </span>
        </div>

        {attendees.length === 0 ? (
          <p
            style={{
              fontSize: "13px",
              color: "var(--color-slate-400)",
              textAlign: "center",
              padding: "32px 0",
            }}
          >
            No attendees yet &mdash; be the first to check in
          </p>
        ) : (
          <div>
            {attendees.map((a, idx) => (
              <div
                key={`${a.registered_at}-${idx}`}
                className="flex items-center gap-4 px-5 py-4"
                style={{
                  borderBottom:
                    idx < attendees.length - 1
                      ? "1px solid var(--color-slate-100)"
                      : "none",
                }}
              >
                <div
                  className="flex items-center justify-center rounded-full shrink-0"
                  style={{
                    width: 36,
                    height: 36,
                    backgroundColor: "var(--color-navy-100)",
                    color: "var(--color-navy-800)",
                    fontSize: "13px",
                    fontWeight: 700,
                  }}
                >
                  {a.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "var(--color-slate-800)",
                    }}
                  >
                    {a.name}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {a.phone && (
                      <span style={{ fontSize: "12px", color: "var(--color-slate-400)" }}>
                        {a.phone}
                      </span>
                    )}
                    {a.email && (
                      <span style={{ fontSize: "12px", color: "var(--color-slate-400)" }}>
                        {a.email}
                      </span>
                    )}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: "12px",
                    color: "var(--color-slate-400)",
                    flexShrink: 0,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {fmtTime(a.registered_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
