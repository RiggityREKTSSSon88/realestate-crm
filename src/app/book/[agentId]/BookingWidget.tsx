"use client";

import { useState } from "react";

type Slot = {
  datetime: string;
  display: string;
};

type AgentInfo = {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
};

type BookingWidgetProps = {
  agent: AgentInfo;
  slots: Slot[];
  proposalId?: string;
};

type Step = "pick" | "details" | "confirmed";

type GroupedSlots = {
  dateLabel: string;
  slots: Slot[];
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function groupSlotsByDate(slots: Slot[]): GroupedSlots[] {
  const map = new Map<string, Slot[]>();
  for (const slot of slots) {
    const d = new Date(slot.datetime);
    const key = d.toLocaleDateString("en-AU", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    const existing = map.get(key);
    if (existing) {
      existing.push(slot);
    } else {
      map.set(key, [slot]);
    }
  }
  return Array.from(map.entries()).map(([dateLabel, slotList]) => ({
    dateLabel,
    slots: slotList,
  }));
}

function formatConfirmedDatetime(datetime: string): string {
  const d = new Date(datetime);
  return d.toLocaleString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function BookingWidget({ agent, slots, proposalId }: BookingWidgetProps) {
  const [step, setStep] = useState<Step>("pick");
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grouped = groupSlotsByDate(slots);
  const initials = getInitials(agent.full_name);

  async function handleConfirm() {
    if (!selectedSlot) return;
    if (!contactName.trim()) {
      setError("Please enter your name.");
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch(`/api/booking/${agent.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          datetime: selectedSlot.datetime,
          contactName: contactName.trim(),
          contactEmail: contactEmail.trim() || null,
          contactPhone: contactPhone.trim() || null,
          notes: notes.trim() || null,
          proposalId: proposalId ?? null,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }

      setStep("confirmed");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f0f2f5",
        padding: "40px 16px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          maxWidth: "600px",
          width: "100%",
          background: "#ffffff",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 4px 32px rgba(0,0,0,0.10)",
        }}
      >
        <div
          style={{
            background: "#0F2942",
            padding: "32px 40px",
            display: "flex",
            alignItems: "center",
            gap: "20px",
          }}
        >
          {agent.avatar_url ? (
            <img
              src={agent.avatar_url}
              alt={agent.full_name}
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                objectFit: "cover",
                border: "3px solid #F5A623",
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "#1a3a5c",
                color: "#F5A623",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "22px",
                fontWeight: 700,
                border: "3px solid #F5A623",
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
          )}
          <div>
            <div
              style={{
                color: "rgba(255,255,255,0.6)",
                fontSize: "12px",
                textTransform: "uppercase",
                letterSpacing: "1px",
                marginBottom: "4px",
              }}
            >
              Book a consultation with
            </div>
            <div style={{ color: "#ffffff", fontSize: "22px", fontWeight: 700 }}>
              {agent.full_name}
            </div>
            <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "13px", marginTop: "2px" }}>
              {agent.email}
            </div>
          </div>
        </div>

        <div style={{ padding: "40px" }}>
          {step === "pick" && (
            <>
              <h2
                style={{
                  color: "#0F2942",
                  fontSize: "20px",
                  fontWeight: 700,
                  marginBottom: "24px",
                }}
              >
                Select a time
              </h2>
              {grouped.length === 0 ? (
                <p style={{ color: "#888", fontStyle: "italic" }}>
                  No available times in the next 14 days. Please contact the agent directly.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
                  {grouped.map((group) => (
                    <div key={group.dateLabel}>
                      <div
                        style={{
                          color: "#0F2942",
                          fontWeight: 600,
                          fontSize: "14px",
                          marginBottom: "10px",
                          paddingBottom: "8px",
                          borderBottom: "1px solid #e9ecef",
                        }}
                      >
                        {group.dateLabel}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        {group.slots.map((slot) => {
                          const isSelected = selectedSlot?.datetime === slot.datetime;
                          return (
                            <button
                              key={slot.datetime}
                              onClick={() => {
                                setSelectedSlot(slot);
                                setStep("details");
                              }}
                              style={{
                                background: isSelected ? "#0F2942" : "#f8f9fa",
                                color: isSelected ? "#F5A623" : "#333",
                                border: isSelected ? "2px solid #0F2942" : "2px solid #e9ecef",
                                borderRadius: "8px",
                                padding: "8px 16px",
                                fontSize: "14px",
                                fontWeight: isSelected ? 700 : 500,
                                cursor: "pointer",
                                transition: "all 0.15s",
                              }}
                            >
                              {slot.display}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {step === "details" && selectedSlot && (
            <>
              <button
                onClick={() => setStep("pick")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#0F2942",
                  cursor: "pointer",
                  fontSize: "14px",
                  padding: "0",
                  marginBottom: "20px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                ← Back
              </button>
              <div
                style={{
                  background: "#fff8ed",
                  border: "1px solid #F5A623",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  marginBottom: "28px",
                  fontSize: "14px",
                  color: "#0F2942",
                  fontWeight: 600,
                }}
              >
                {formatConfirmedDatetime(selectedSlot.datetime)}
              </div>
              <h2
                style={{
                  color: "#0F2942",
                  fontSize: "20px",
                  fontWeight: 700,
                  marginBottom: "24px",
                }}
              >
                Your details
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#555",
                      marginBottom: "6px",
                    }}
                  >
                    Full Name <span style={{ color: "#e74c3c" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Jane Smith"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      border: "1.5px solid #ddd",
                      borderRadius: "8px",
                      fontSize: "15px",
                      outline: "none",
                      boxSizing: "border-box",
                      fontFamily: "inherit",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#555",
                      marginBottom: "6px",
                    }}
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="jane@example.com"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      border: "1.5px solid #ddd",
                      borderRadius: "8px",
                      fontSize: "15px",
                      outline: "none",
                      boxSizing: "border-box",
                      fontFamily: "inherit",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#555",
                      marginBottom: "6px",
                    }}
                  >
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="0400 000 000"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      border: "1.5px solid #ddd",
                      borderRadius: "8px",
                      fontSize: "15px",
                      outline: "none",
                      boxSizing: "border-box",
                      fontFamily: "inherit",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#555",
                      marginBottom: "6px",
                    }}
                  >
                    Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Anything you'd like to discuss..."
                    rows={3}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      border: "1.5px solid #ddd",
                      borderRadius: "8px",
                      fontSize: "15px",
                      outline: "none",
                      boxSizing: "border-box",
                      resize: "vertical",
                      fontFamily: "inherit",
                    }}
                  />
                </div>
                {error && (
                  <div
                    style={{
                      background: "#fff5f5",
                      border: "1px solid #fca5a5",
                      borderRadius: "8px",
                      padding: "12px 16px",
                      color: "#b91c1c",
                      fontSize: "14px",
                    }}
                  >
                    {error}
                  </div>
                )}
                <button
                  onClick={handleConfirm}
                  disabled={submitting}
                  style={{
                    background: submitting ? "#ccc" : "#F5A623",
                    color: "#0F2942",
                    border: "none",
                    borderRadius: "8px",
                    padding: "14px 24px",
                    fontSize: "16px",
                    fontWeight: 700,
                    cursor: submitting ? "not-allowed" : "pointer",
                    width: "100%",
                    marginTop: "4px",
                  }}
                >
                  {submitting ? "Confirming..." : "Confirm Booking"}
                </button>
              </div>
            </>
          )}

          {step === "confirmed" && selectedSlot && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "#d1fae5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 20px",
                  fontSize: "28px",
                }}
              >
                ✓
              </div>
              <h2
                style={{
                  color: "#0F2942",
                  fontSize: "22px",
                  fontWeight: 800,
                  marginBottom: "12px",
                }}
              >
                Appointment Confirmed
              </h2>
              <p style={{ color: "#444", fontSize: "15px", lineHeight: 1.6, marginBottom: "8px" }}>
                Your appointment is confirmed for{" "}
                <strong>{formatConfirmedDatetime(selectedSlot.datetime)}</strong>.
              </p>
              <p style={{ color: "#666", fontSize: "14px", lineHeight: 1.6, marginBottom: "28px" }}>
                We'll be in touch soon. Looking forward to meeting with you.
              </p>
              <div
                style={{
                  background: "#f8f9fa",
                  border: "1px solid #e9ecef",
                  borderRadius: "10px",
                  padding: "16px 20px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                {agent.avatar_url ? (
                  <img
                    src={agent.avatar_url}
                    alt={agent.full_name}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background: "#0F2942",
                      color: "#F5A623",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "14px",
                      fontWeight: 700,
                    }}
                  >
                    {initials}
                  </div>
                )}
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontWeight: 700, color: "#0F2942", fontSize: "14px" }}>
                    {agent.full_name}
                  </div>
                  <div style={{ color: "#888", fontSize: "12px" }}>{agent.email}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            background: "#f8f9fa",
            borderTop: "1px solid #e9ecef",
            padding: "16px 40px",
            textAlign: "center",
          }}
        >
          <span style={{ color: "#0F2942", fontWeight: 700, fontSize: "13px" }}>
            Estate<span style={{ color: "#F5A623" }}>IQ</span>
          </span>
        </div>
      </div>
    </div>
  );
}
