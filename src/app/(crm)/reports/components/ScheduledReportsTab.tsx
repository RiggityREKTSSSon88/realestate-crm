"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, X, Loader2, Send, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ReportData } from "@/app/(crm)/reports/types";
import type { ScheduledReport } from "@/types/database";

type Props = {
  data: ReportData;
};

const REPORT_TYPE_LABELS: Record<ScheduledReport["report_type"], string> = {
  agent_performance: "Agent Performance",
  kpi: "KPI Dashboard",
  stocklist: "Stocklist",
  geo_breakdown: "Geo Breakdown",
  staff_comparison: "Staff Comparison",
};

const FREQUENCY_STYLES: Record<ScheduledReport["frequency"], { bg: string; text: string }> = {
  weekly:  { bg: "#ede9fe", text: "#6d28d9" },
  monthly: { bg: "#dbeafe", text: "#1d4ed8" },
};

const inp: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  fontSize: "14px",
  border: "1px solid var(--color-slate-200)",
  borderRadius: "8px",
  outline: "none",
  backgroundColor: "var(--color-slate-50)",
  boxSizing: "border-box",
};

const lbl: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 500,
  color: "var(--color-slate-700)",
  marginBottom: "6px",
  display: "block",
};

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function computeNextRunAt(frequency: ScheduledReport["frequency"]): string {
  const now = new Date();
  if (frequency === "weekly") {
    const day = now.getDay();
    const daysUntilMonday = day === 0 ? 1 : 8 - day;
    const next = new Date(now);
    next.setDate(now.getDate() + daysUntilMonday);
    next.setHours(8, 0, 0, 0);
    return next.toISOString();
  }
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1, 8, 0, 0, 0);
  return next.toISOString();
}

export default function ScheduledReportsTab({ data }: Props) {
  const [localScheduledReports, setLocalScheduledReports] = useState<ScheduledReport[]>(
    data.scheduledReports
  );
  const [showModal, setShowModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [sentFlash, setSentFlash] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const sorted = useMemo(
    () =>
      [...localScheduledReports].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [localScheduledReports]
  );

  const activeCount = sorted.filter((r) => r.active).length;

  async function handleDelete(id: string) {
    setDeletingId(id);
    const supabase = createClient();
    await supabase.from("scheduled_reports").delete().eq("id", id);
    setLocalScheduledReports((prev) => prev.filter((r) => r.id !== id));
    setDeletingId(null);
    setConfirmDeleteId(null);
  }

  async function handleSendNow(id: string) {
    setSendingId(id);
    try {
      await fetch("/api/scheduled-reports/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: id }),
      });
      setSentFlash(id);
      setTimeout(() => setSentFlash(null), 2500);
    } finally {
      setSendingId(null);
    }
  }

  function handleSaved(created: ScheduledReport) {
    setLocalScheduledReports((prev) => [created, ...prev]);
    setShowModal(false);
  }

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            backgroundColor: "white",
            border: "1px solid var(--color-slate-200)",
            borderRadius: "12px",
            padding: "20px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--color-slate-500)",
              marginBottom: "8px",
            }}
          >
            Total Scheduled
          </div>
          <div style={{ fontSize: "32px", fontWeight: 700, color: "var(--color-navy-800)" }}>
            {sorted.length}
          </div>
        </div>
        <div
          style={{
            backgroundColor: "white",
            border: "1px solid var(--color-slate-200)",
            borderRadius: "12px",
            padding: "20px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--color-slate-500)",
              marginBottom: "8px",
            }}
          >
            Active
          </div>
          <div style={{ fontSize: "32px", fontWeight: 700, color: "#15803d" }}>
            {activeCount}
          </div>
        </div>
        <div
          style={{
            backgroundColor: "white",
            border: "1px solid var(--color-slate-200)",
            borderRadius: "12px",
            padding: "20px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--color-slate-500)",
              marginBottom: "8px",
            }}
          >
            Inactive
          </div>
          <div style={{ fontSize: "32px", fontWeight: 700, color: "var(--color-slate-500)" }}>
            {sorted.length - activeCount}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          marginBottom: "16px",
        }}
      >
        <button
          onClick={() => setShowModal(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 16px",
            borderRadius: "8px",
            border: "none",
            backgroundColor: "var(--color-navy-800)",
            color: "white",
            fontSize: "13px",
            fontWeight: 500,
            cursor: "pointer",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-navy-700)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-navy-800)")
          }
        >
          <Plus size={15} />
          New Schedule
        </button>
      </div>

      <div
        style={{
          backgroundColor: "white",
          border: "1px solid var(--color-slate-200)",
          borderRadius: "12px",
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
          <thead>
            <tr
              style={{
                backgroundColor: "var(--color-slate-50)",
                borderBottom: "1px solid var(--color-slate-200)",
              }}
            >
              <th
                style={{
                  textAlign: "left",
                  padding: "12px 16px",
                  fontWeight: 600,
                  color: "var(--color-slate-700)",
                }}
              >
                Report Type
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: "12px 16px",
                  fontWeight: 600,
                  color: "var(--color-slate-700)",
                }}
              >
                Frequency
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: "12px 16px",
                  fontWeight: 600,
                  color: "var(--color-slate-700)",
                }}
              >
                Recipients
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: "12px 16px",
                  fontWeight: 600,
                  color: "var(--color-slate-700)",
                }}
              >
                Status
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: "12px 16px",
                  fontWeight: 600,
                  color: "var(--color-slate-700)",
                }}
              >
                Next Run
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: "12px 16px",
                  fontWeight: 600,
                  color: "var(--color-slate-700)",
                }}
              >
                Last Run
              </th>
              <th style={{ padding: "12px 16px", width: "140px" }} />
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    textAlign: "center",
                    padding: "48px 16px",
                    color: "var(--color-slate-400)",
                  }}
                >
                  No scheduled reports configured.
                </td>
              </tr>
            ) : (
              sorted.map((report) => {
                const freqStyle = FREQUENCY_STYLES[report.frequency];
                const recipients = Array.isArray(report.recipients)
                  ? (report.recipients as string[]).join(", ")
                  : typeof report.recipients === "string"
                  ? report.recipients
                  : String(report.recipients ?? "");

                const isConfirmingDelete = confirmDeleteId === report.id;
                const isDeleting = deletingId === report.id;
                const isSending = sendingId === report.id;
                const isSent = sentFlash === report.id;

                return (
                  <tr
                    key={report.id}
                    style={{ borderBottom: "1px solid var(--color-slate-100)" }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLElement).style.backgroundColor =
                        "var(--color-slate-50)")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLElement).style.backgroundColor = "transparent")
                    }
                  >
                    <td
                      style={{
                        padding: "14px 16px",
                        fontWeight: 500,
                        color: "var(--color-slate-900)",
                      }}
                    >
                      {REPORT_TYPE_LABELS[report.report_type]}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 8px",
                          borderRadius: "999px",
                          fontSize: "12px",
                          fontWeight: 500,
                          backgroundColor: freqStyle.bg,
                          color: freqStyle.text,
                          textTransform: "capitalize",
                        }}
                      >
                        {report.frequency}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "14px 16px",
                        color: "var(--color-slate-600)",
                        fontSize: "13px",
                        maxWidth: "220px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {recipients || (
                        <span style={{ color: "var(--color-slate-300)" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "13px",
                          fontWeight: 500,
                          color: report.active ? "#15803d" : "var(--color-slate-400)",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-block",
                            width: "7px",
                            height: "7px",
                            borderRadius: "50%",
                            backgroundColor: report.active ? "#22c55e" : "var(--color-slate-300)",
                          }}
                        />
                        {report.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "14px 16px",
                        color: "var(--color-slate-500)",
                        fontSize: "13px",
                      }}
                    >
                      {fmtDate(report.next_run_at)}
                    </td>
                    <td
                      style={{
                        padding: "14px 16px",
                        color: "var(--color-slate-400)",
                        fontSize: "13px",
                      }}
                    >
                      {fmtDate(report.last_run_at)}
                    </td>
                    <td
                      style={{ padding: "14px 16px", textAlign: "right" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isConfirmingDelete ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "flex-end" }}>
                          <span style={{ fontSize: "12px", color: "#b91c1c", whiteSpace: "nowrap" }}>
                            Delete?
                          </span>
                          <button
                            onClick={() => handleDelete(report.id)}
                            disabled={isDeleting}
                            style={{
                              padding: "4px 8px",
                              borderRadius: "6px",
                              border: "none",
                              backgroundColor: "#b91c1c",
                              color: "white",
                              fontSize: "12px",
                              fontWeight: 500,
                              cursor: "pointer",
                            }}
                          >
                            {isDeleting ? <Loader2 size={12} style={{ display: "inline" }} /> : "Yes"}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            style={{
                              padding: "4px 8px",
                              borderRadius: "6px",
                              border: "1px solid var(--color-slate-200)",
                              background: "none",
                              fontSize: "12px",
                              cursor: "pointer",
                            }}
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "flex-end" }}>
                          {isSent ? (
                            <span
                              style={{
                                fontSize: "12px",
                                fontWeight: 500,
                                color: "#15803d",
                                padding: "4px 8px",
                                backgroundColor: "#d1fae5",
                                borderRadius: "6px",
                              }}
                            >
                              Sent!
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSendNow(report.id)}
                              disabled={isSending}
                              title="Send Now"
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "5px 10px",
                                borderRadius: "6px",
                                border: "1px solid var(--color-slate-200)",
                                background: "none",
                                fontSize: "12px",
                                fontWeight: 500,
                                color: "var(--color-slate-600)",
                                cursor: isSending ? "not-allowed" : "pointer",
                                opacity: isSending ? 0.6 : 1,
                              }}
                              onMouseEnter={(e) => {
                                if (!isSending) {
                                  (e.currentTarget as HTMLElement).style.borderColor = "var(--color-navy-800)";
                                  (e.currentTarget as HTMLElement).style.color = "var(--color-navy-800)";
                                }
                              }}
                              onMouseLeave={(e) => {
                                (e.currentTarget as HTMLElement).style.borderColor = "var(--color-slate-200)";
                                (e.currentTarget as HTMLElement).style.color = "var(--color-slate-600)";
                              }}
                            >
                              {isSending ? (
                                <Loader2 size={12} />
                              ) : (
                                <Send size={12} />
                              )}
                              Send Now
                            </button>
                          )}
                          <button
                            onClick={() => setConfirmDeleteId(report.id)}
                            title="Delete"
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: "4px",
                              color: "var(--color-slate-400)",
                              borderRadius: "4px",
                            }}
                            onMouseEnter={(e) =>
                              ((e.currentTarget as HTMLElement).style.color = "#b91c1c")
                            }
                            onMouseLeave={(e) =>
                              ((e.currentTarget as HTMLElement).style.color = "var(--color-slate-400)")
                            }
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <ScheduleModal
          onSaved={handleSaved}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

type ScheduleModalProps = {
  onSaved: (r: ScheduledReport) => void;
  onClose: () => void;
};

function ScheduleModal({ onSaved, onClose }: ScheduleModalProps) {
  const [reportType, setReportType] = useState<ScheduledReport["report_type"]>("agent_performance");
  const [frequency, setFrequency] = useState<ScheduledReport["frequency"]>("weekly");
  const [active, setActive] = useState(true);
  const [recipientInput, setRecipientInput] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleRecipientKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      const val = recipientInput.trim().toLowerCase();
      if (val && !recipients.includes(val)) {
        setRecipients((prev) => [...prev, val]);
      }
      setRecipientInput("");
    }
  }

  function removeRecipient(email: string) {
    setRecipients((prev) => prev.filter((r) => r !== email));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data: authData } = await supabase.auth.getUser();

    if (!authData.user) {
      setError("Not authenticated.");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("users")
      .select("agency_id")
      .eq("id", authData.user.id)
      .single();

    if (!profile?.agency_id) {
      setError("Agency not found.");
      setLoading(false);
      return;
    }

    const next_run_at = computeNextRunAt(frequency);

    const { data: created, error: insertErr } = await supabase
      .from("scheduled_reports")
      .insert({
        agency_id: profile.agency_id,
        created_by: authData.user.id,
        report_type: reportType,
        frequency,
        recipients,
        active,
        next_run_at,
        last_run_at: null,
      })
      .select("*")
      .single();

    if (insertErr || !created) {
      setError("Failed to create schedule. Please try again.");
      setLoading(false);
      return;
    }

    onSaved(created as ScheduledReport);
    setLoading(false);
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        zIndex: 50,
        backgroundColor: "rgba(0,0,0,0.4)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "480px",
          height: "100%",
          backgroundColor: "white",
          boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 24px",
            borderBottom: "1px solid var(--color-slate-200)",
            flexShrink: 0,
          }}
        >
          <h2 style={{ fontSize: "18px", fontWeight: 600, color: "var(--color-navy-800)" }}>
            New Scheduled Report
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "6px",
              borderRadius: "8px",
              color: "var(--color-slate-400)",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.color = "var(--color-slate-700)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.color = "var(--color-slate-400)")
            }
          >
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            flex: 1,
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {error && (
            <div
              style={{
                backgroundColor: "#fee2e2",
                color: "#b91c1c",
                fontSize: "13px",
                borderRadius: "8px",
                padding: "12px 16px",
              }}
            >
              {error}
            </div>
          )}

          <div>
            <label style={lbl}>Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ScheduledReport["report_type"])}
              style={inp}
              autoFocus
            >
              <option value="agent_performance">Agent Performance</option>
              <option value="kpi">KPI Dashboard</option>
              <option value="stocklist">Stocklist</option>
              <option value="geo_breakdown">Geo Breakdown</option>
              <option value="staff_comparison">Staff Comparison</option>
            </select>
          </div>

          <div>
            <label style={lbl}>Frequency</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as ScheduledReport["frequency"])}
              style={inp}
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div>
            <label style={lbl}>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Mail size={13} />
                Recipients
              </span>
            </label>
            {recipients.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "6px",
                  marginBottom: "8px",
                }}
              >
                {recipients.map((email) => (
                  <span
                    key={email}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "4px 10px",
                      borderRadius: "999px",
                      backgroundColor: "var(--color-slate-100)",
                      color: "var(--color-slate-700)",
                      fontSize: "13px",
                    }}
                  >
                    {email}
                    <button
                      type="button"
                      onClick={() => removeRecipient(email)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "0",
                        display: "flex",
                        alignItems: "center",
                        color: "var(--color-slate-400)",
                        lineHeight: 1,
                      }}
                      onMouseEnter={(e) =>
                        ((e.currentTarget as HTMLElement).style.color = "#b91c1c")
                      }
                      onMouseLeave={(e) =>
                        ((e.currentTarget as HTMLElement).style.color = "var(--color-slate-400)")
                      }
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <input
              type="email"
              placeholder="Press Enter to add"
              value={recipientInput}
              onChange={(e) => setRecipientInput(e.target.value)}
              onKeyDown={handleRecipientKeyDown}
              style={inp}
            />
          </div>

          <div>
            <label style={lbl}>Status</label>
            <select
              value={active ? "active" : "inactive"}
              onChange={(e) => setActive(e.target.value === "active")}
              style={inp}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginTop: "auto",
              paddingTop: "16px",
              borderTop: "1px solid var(--color-slate-100)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginLeft: "auto" }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "1px solid var(--color-slate-200)",
                  background: "none",
                  fontSize: "14px",
                  color: "var(--color-slate-700)",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 20px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: "var(--color-navy-800)",
                  color: "white",
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!loading)
                    (e.currentTarget as HTMLElement).style.backgroundColor =
                      "var(--color-navy-700)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    "var(--color-navy-800)";
                }}
              >
                {loading && <Loader2 size={14} />}
                Save Schedule
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
