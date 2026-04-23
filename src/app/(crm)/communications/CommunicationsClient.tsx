"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Mail,
  MessageSquare,
  Phone,
  FileText,
  Plus,
  Search,
  X,
  Loader2,
} from "lucide-react";
import type { Communication } from "@/types/database";

// ─── Types ────────────────────────────────────────────────────────────────────

type CommunicationWithRelations = Communication & {
  contacts: { id: string; full_name: string } | null;
  users: { id: string; full_name: string } | null;
};

type CommType = Communication["type"];

type CommSentiment = "positive" | "neutral" | "negative" | "urgent" | null;

type ContactOption = { id: string; full_name: string };

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  CommType,
  { bg: string; text: string; strip: string; label: string; Icon: React.ElementType }
> = {
  email: {
    bg: "#dbeafe",
    text: "#1d4ed8",
    strip: "#3b82f6",
    label: "Email",
    Icon: Mail,
  },
  sms: {
    bg: "#d1fae5",
    text: "#065f46",
    strip: "#10b981",
    label: "SMS",
    Icon: MessageSquare,
  },
  call: {
    bg: "#ede9fe",
    text: "#6d28d9",
    strip: "#8b5cf6",
    label: "Call",
    Icon: Phone,
  },
  note: {
    bg: "#fef3c7",
    text: "#b45309",
    strip: "#f59e0b",
    label: "Note",
    Icon: FileText,
  },
};

const SENTIMENT_CONFIG: Record<
  NonNullable<CommSentiment>,
  { bg: string; text: string; label: string }
> = {
  positive: { bg: "#dcfce7", text: "#166534", label: "Positive" },
  neutral:  { bg: "var(--color-slate-100)", text: "var(--color-slate-500)", label: "Neutral" },
  negative: { bg: "#fee2e2", text: "#b91c1c", label: "Negative" },
  urgent:   { bg: "#fff7ed", text: "#c2410c", label: "Urgent" },
};

const SENTIMENT_FILTERS: { value: "all" | NonNullable<CommSentiment>; label: string }[] = [
  { value: "all",      label: "All" },
  { value: "positive", label: "Positive" },
  { value: "neutral",  label: "Neutral" },
  { value: "negative", label: "Negative" },
  { value: "urgent",   label: "Urgent" },
];

const TYPE_FILTERS: { value: "all" | CommType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
  { value: "call", label: "Call" },
  { value: "note", label: "Note" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function localNow(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 16);
}

// ─── Log Communication Modal ──────────────────────────────────────────────────

type ModalProps = {
  contacts: ContactOption[];
  onSaved: (comm: CommunicationWithRelations) => void;
  onClose: () => void;
};

function LogCommunicationModal({ contacts, onSaved, onClose }: ModalProps) {
  const [form, setForm] = useState<{
    contact_id: string;
    type: CommType;
    sentiment: NonNullable<CommSentiment>;
    subject: string;
    body: string;
    sent_at: string;
  }>({
    contact_id: contacts[0]?.id ?? "",
    type: "email",
    sentiment: "neutral",
    subject: "",
    body: "",
    sent_at: localNow(),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.contact_id) {
      setError("Please select a contact.");
      return;
    }
    if (form.type === "note" && !form.body.trim()) {
      setError("Body is required for notes.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      setError("You must be logged in to log a communication.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileErr } = await supabase
      .from("users")
      .select("agency_id")
      .eq("id", authData.user.id)
      .single();

    if (profileErr || !profile?.agency_id) {
      setError("Failed to retrieve agency. Please try again.");
      setLoading(false);
      return;
    }

    const payload = {
      contact_id: form.contact_id,
      type: form.type,
      sentiment: form.sentiment,
      subject: form.type === "email" && form.subject.trim() ? form.subject.trim() : null,
      body: form.body.trim() || null,
      sent_by: authData.user.id,
      sent_at: new Date(form.sent_at).toISOString(),
      agency_id: profile.agency_id,
    };

    const { data, error: insertErr } = await supabase
      .from("communications")
      .insert(payload)
      .select("*, contacts(id,full_name), users:sent_by(id,full_name)")
      .single();

    if (insertErr) {
      setError("Failed to log communication. Please try again.");
      setLoading(false);
      return;
    }

    onSaved(data as unknown as CommunicationWithRelations);
    setLoading(false);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    fontSize: "14px",
    border: "1px solid var(--color-slate-200)",
    borderRadius: "8px",
    outline: "none",
    backgroundColor: "var(--color-slate-50)",
    color: "var(--color-slate-900)",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "13px",
    fontWeight: 500,
    color: "var(--color-slate-700)",
    marginBottom: "6px",
    display: "block",
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-end z-50"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="h-full overflow-y-auto flex flex-col"
        style={{
          width: "480px",
          backgroundColor: "white",
          boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--color-slate-200)" }}
        >
          <h2
            style={{
              fontSize: "18px",
              fontWeight: 600,
              color: "var(--color-navy-800)",
            }}
          >
            Log Communication
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 transition-colors"
            style={{ color: "var(--color-slate-400)" }}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 px-6 py-6 flex flex-col gap-5">
          {error && (
            <div
              className="rounded-lg px-4 py-3"
              style={{
                backgroundColor: "#fee2e2",
                color: "#b91c1c",
                fontSize: "13px",
              }}
            >
              {error}
            </div>
          )}

          {/* Contact */}
          <div>
            <label style={labelStyle}>Contact *</label>
            <select
              value={form.contact_id}
              onChange={(e) => set("contact_id", e.target.value)}
              style={inputStyle}
            >
              {contacts.length === 0 && (
                <option value="" disabled>
                  No contacts available
                </option>
              )}
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Type — radio-style pill toggles */}
          <div>
            <label style={labelStyle}>Type *</label>
            <div className="flex items-center gap-2 flex-wrap">
              {(Object.entries(TYPE_CONFIG) as [CommType, (typeof TYPE_CONFIG)[CommType]][]).map(
                ([key, cfg]) => {
                  const active = form.type === key;
                  const { Icon } = cfg;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => set("type", key)}
                      className="flex items-center gap-1.5 rounded-full font-medium transition-colors"
                      style={{
                        padding: "6px 14px",
                        fontSize: "13px",
                        border: active ? "none" : "1px solid var(--color-slate-200)",
                        backgroundColor: active ? cfg.strip : "white",
                        color: active ? "white" : "var(--color-slate-600)",
                        cursor: "pointer",
                      }}
                    >
                      <Icon size={13} />
                      {cfg.label}
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {/* Sentiment */}
          <div>
            <label style={labelStyle}>Sentiment</label>
            <select
              value={form.sentiment}
              onChange={(e) => set("sentiment", e.target.value as NonNullable<CommSentiment>)}
              style={inputStyle}
            >
              <option value="neutral">Neutral</option>
              <option value="positive">Positive</option>
              <option value="negative">Negative</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {/* Subject — email only */}
          {form.type === "email" && (
            <div>
              <label style={labelStyle}>Subject</label>
              <input
                type="text"
                value={form.subject}
                onChange={(e) => set("subject", e.target.value)}
                placeholder="e.g. Follow-up on property visit"
                style={inputStyle}
              />
            </div>
          )}

          {/* Body */}
          <div>
            <label style={labelStyle}>
              Body{form.type === "note" ? " *" : ""}
            </label>
            <textarea
              value={form.body}
              onChange={(e) => set("body", e.target.value)}
              placeholder={
                form.type === "email"
                  ? "Email content…"
                  : form.type === "sms"
                  ? "SMS message…"
                  : form.type === "call"
                  ? "Call summary…"
                  : "Note…"
              }
              rows={5}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          {/* Date / Time */}
          <div>
            <label style={labelStyle}>Date &amp; Time</label>
            <input
              type="datetime-local"
              value={form.sent_at}
              onChange={(e) => set("sent_at", e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Actions */}
          <div
            className="flex items-center gap-3 mt-auto pt-4"
            style={{ borderTop: "1px solid var(--color-slate-100)" }}
          >
            <div className="flex items-center gap-3 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2.5 transition-colors"
                style={{
                  fontSize: "14px",
                  border: "1px solid var(--color-slate-200)",
                  color: "var(--color-slate-700)",
                  backgroundColor: "white",
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 rounded-lg px-5 py-2.5 font-medium transition-colors"
                style={{
                  fontSize: "14px",
                  backgroundColor: "var(--color-navy-800)",
                  color: "white",
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? "not-allowed" : "pointer",
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
                {loading && <Loader2 size={14} className="animate-spin" />}
                Log Communication
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Timeline Card ─────────────────────────────────────────────────────────────

function SentimentBadge({ sentiment }: { sentiment: CommSentiment }) {
  if (!sentiment) return <span style={{ fontSize: "11px", color: "var(--color-slate-400)" }}>–</span>;
  const cfg = SENTIMENT_CONFIG[sentiment];
  return (
    <span
      style={{
        fontSize: "11px",
        padding: "2px 8px",
        borderRadius: "999px",
        fontWeight: 500,
        backgroundColor: cfg.bg,
        color: cfg.text,
        flexShrink: 0,
      }}
    >
      {cfg.label}
    </span>
  );
}

function CommunicationCard({ comm }: { comm: CommunicationWithRelations }) {
  const cfg = TYPE_CONFIG[comm.type];
  const { Icon } = cfg;
  const sentiment = (comm as CommunicationWithRelations & { sentiment: CommSentiment }).sentiment ?? null;

  return (
    <div
      className="flex rounded-xl overflow-hidden"
      style={{
        backgroundColor: "white",
        border: "1px solid var(--color-slate-200)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      {/* Color strip */}
      <div style={{ width: "4px", backgroundColor: cfg.strip, flexShrink: 0 }} />

      {/* Content */}
      <div className="flex-1 px-5 py-4" style={{ minWidth: 0 }}>
        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap" style={{ minWidth: 0 }}>
            {/* Contact name */}
            <span
              style={{
                fontWeight: 600,
                fontSize: "15px",
                color: "var(--color-navy-800)",
              }}
            >
              {comm.contacts?.full_name ?? "Unknown Contact"}
            </span>

            {/* Type badge */}
            <span
              className="flex items-center gap-1 rounded-full font-medium"
              style={{
                padding: "2px 10px",
                fontSize: "12px",
                backgroundColor: cfg.bg,
                color: cfg.text,
                flexShrink: 0,
              }}
            >
              <Icon size={11} />
              {cfg.label}
            </span>

            {/* Sentiment badge */}
            <SentimentBadge sentiment={sentiment} />
          </div>

          {/* Date/time */}
          <span
            style={{
              fontSize: "12px",
              color: "var(--color-slate-400)",
              flexShrink: 0,
              whiteSpace: "nowrap",
            }}
          >
            {formatDateTime(comm.sent_at)}
          </span>
        </div>

        {/* Subject */}
        {comm.subject && (
          <p
            style={{
              marginTop: "6px",
              fontSize: "14px",
              fontWeight: 500,
              color: "var(--color-slate-800)",
            }}
          >
            {comm.subject}
          </p>
        )}

        {/* Body preview — 2-line clamp */}
        {comm.body && (
          <p
            style={{
              marginTop: comm.subject ? "4px" : "6px",
              fontSize: "13px",
              color: "var(--color-slate-500)",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              lineHeight: "1.5",
            }}
          >
            {comm.body}
          </p>
        )}

        {/* Footer — logged by */}
        {comm.users && (
          <p
            style={{
              marginTop: "8px",
              fontSize: "12px",
              color: "var(--color-slate-400)",
            }}
          >
            Logged by{" "}
            <span style={{ color: "var(--color-slate-600)", fontWeight: 500 }}>
              {comm.users.full_name}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Main Client Component ─────────────────────────────────────────────────────

type Props = {
  initialCommunications: CommunicationWithRelations[];
  contacts: ContactOption[];
};

export default function CommunicationsClient({
  initialCommunications,
  contacts,
}: Props) {
  const [communications, setCommunications] =
    useState<CommunicationWithRelations[]>(initialCommunications);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | CommType>("all");
  const [sentimentFilter, setSentimentFilter] = useState<"all" | NonNullable<CommSentiment>>("all");
  const [showModal, setShowModal] = useState(false);

  // ── Filtering ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = communications;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.contacts?.full_name.toLowerCase().includes(q) ||
          c.subject?.toLowerCase().includes(q)
      );
    }

    if (typeFilter !== "all") {
      result = result.filter((c) => c.type === typeFilter);
    }

    if (sentimentFilter !== "all") {
      result = result.filter((c) => (c as CommunicationWithRelations & { sentiment: CommSentiment }).sentiment === sentimentFilter);
    }

    return result;
  }, [communications, search, typeFilter, sentimentFilter]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  function onSaved(comm: CommunicationWithRelations) {
    setCommunications((prev) => [comm, ...prev]);
    setShowModal(false);
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-screen-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className="font-bold"
            style={{ fontSize: "24px", color: "var(--color-navy-800)" }}
          >
            Communications
          </h1>
          <p
            style={{
              fontSize: "14px",
              color: "var(--color-slate-500)",
              marginTop: "2px",
            }}
          >
            {filtered.length} record{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg font-medium transition-colors"
          style={{
            padding: "10px 18px",
            backgroundColor: "var(--color-navy-800)",
            color: "white",
            fontSize: "14px",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.backgroundColor =
              "var(--color-navy-700)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.backgroundColor =
              "var(--color-navy-800)")
          }
        >
          <Plus size={16} />
          Log Communication
        </button>
      </div>

      {/* Filters bar */}
      <div
        className="flex items-center gap-3 mb-6 rounded-xl p-3 flex-wrap"
        style={{
          backgroundColor: "white",
          border: "1px solid var(--color-slate-200)",
        }}
      >
        {/* Search */}
        <div className="relative" style={{ flex: "1 1 220px" }}>
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--color-slate-400)" }}
          />
          <input
            type="text"
            placeholder="Search by contact or subject…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg outline-none"
            style={{
              padding: "8px 12px 8px 36px",
              fontSize: "14px",
              border: "1px solid var(--color-slate-200)",
              backgroundColor: "var(--color-slate-50)",
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--color-slate-400)" }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Type pill filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {TYPE_FILTERS.map(({ value, label }) => {
            const active = typeFilter === value;
            const strip =
              value !== "all" ? TYPE_CONFIG[value as CommType].strip : undefined;
            return (
              <button
                key={value}
                onClick={() => setTypeFilter(value)}
                className="rounded-full font-medium transition-colors"
                style={{
                  padding: "6px 16px",
                  fontSize: "13px",
                  border: active ? "none" : "1px solid var(--color-slate-200)",
                  backgroundColor: active
                    ? strip ?? "var(--color-navy-800)"
                    : "white",
                  color: active ? "white" : "var(--color-slate-600)",
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Sentiment filter */}
        <select
          value={sentimentFilter}
          onChange={(e) => setSentimentFilter(e.target.value as "all" | NonNullable<CommSentiment>)}
          style={{
            padding: "6px 12px",
            fontSize: "13px",
            border: "1px solid var(--color-slate-200)",
            borderRadius: "999px",
            backgroundColor: "white",
            color: "var(--color-slate-600)",
            outline: "none",
            cursor: "pointer",
          }}
        >
          {SENTIMENT_FILTERS.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Timeline feed */}
      {filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-xl py-20"
          style={{
            backgroundColor: "white",
            border: "1px solid var(--color-slate-200)",
            color: "var(--color-slate-400)",
          }}
        >
          <FileText size={36} style={{ marginBottom: "12px", opacity: 0.4 }} />
          <p style={{ fontSize: "15px", fontWeight: 500 }}>
            {search || typeFilter !== "all" || sentimentFilter !== "all"
              ? "No communications match your filters."
              : "No communications yet. Log your first one."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((comm) => (
            <CommunicationCard key={comm.id} comm={comm} />
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <LogCommunicationModal
          contacts={contacts}
          onSaved={onSaved}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
