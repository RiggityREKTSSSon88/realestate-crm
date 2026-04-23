"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Filter, ChevronUp, ChevronDown, ChevronsUpDown, ExternalLink, X, Loader2, Mail, MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Contact } from "@/types/database";
import ContactModal from "./ContactModal";

function leadScore(status: Contact["status"]): number {
  return status === "hot" ? 30 : status === "warm" ? 20 : 10;
}

type SortField = "full_name" | "type" | "status" | "created_at";
type SortDir = "asc" | "desc";
type LastContactedFilter = "all" | "7" | "14" | "30" | "never";
type Template = { id: string; name: string; type: "email" | "sms"; subject: string | null; body: string; };

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  hot:  { bg: "#fee2e2", text: "#b91c1c" },
  warm: { bg: "#fef3c7", text: "#b45309" },
  cold: { bg: "#dbeafe", text: "#1d4ed8" },
};

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  buyer:    { bg: "#ede9fe", text: "#6d28d9" },
  vendor:   { bg: "#d1fae5", text: "#065f46" },
  tenant:   { bg: "#fce7f3", text: "#9d174d" },
  landlord: { bg: "#e0f2fe", text: "#0369a1" },
};

const SELLER_COLORS: Record<string, { bg: string; text: string }> = {
  high:   { bg: "#dcfce7", text: "#15803d" },
  medium: { bg: "#fef3c7", text: "#b45309" },
  low:    { bg: "#f1f5f9", text: "#475569" },
};

const SELLER_LABELS: Record<string, string> = {
  high: "High",
  medium: "Med",
  low: "Low",
};

const pillStyle: React.CSSProperties = {
  fontSize: "11px",
  padding: "2px 8px",
  borderRadius: "999px",
  fontWeight: 500,
  display: "inline-block",
};

type BulkEmailModalProps = {
  selectedIds: Set<string>;
  onClose: () => void;
};

function BulkEmailModal({ selectedIds, onClose }: BulkEmailModalProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  useMemo(() => {
    const supabase = createClient();
    supabase
      .from("templates")
      .select("id, name, type, subject, body")
      .eq("type", "email")
      .then(({ data }) => {
        setTemplates((data as Template[]) ?? []);
        setLoadingTemplates(false);
      });
  }, []);

  function onTemplateChange(id: string) {
    setSelectedTemplate(id);
    const tpl = templates.find((t) => t.id === id);
    if (tpl) {
      setSubject(tpl.subject ?? "");
      setHtmlBody(tpl.body);
    }
  }

  async function handleSend() {
    if (!subject.trim() || !htmlBody.trim()) return;
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactIds: [...selectedIds], subject, htmlBody }),
      });
      if (res.ok) {
        setResult({ ok: true, message: "Emails sent successfully." });
      } else {
        const err = await res.json().catch(() => ({}));
        setResult({ ok: false, message: (err as { message?: string }).message ?? "Failed to send emails." });
      }
    } catch {
      setResult({ ok: false, message: "Network error. Please try again." });
    }
    setSending(false);
  }

  const inp: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    fontSize: "14px",
    border: "1px solid var(--color-slate-200)",
    borderRadius: "8px",
    outline: "none",
    backgroundColor: "var(--color-slate-50)",
  };

  const lbl: React.CSSProperties = {
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
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="h-full overflow-y-auto flex flex-col"
        style={{ width: "480px", backgroundColor: "white", boxShadow: "-4px 0 24px rgba(0,0,0,0.12)" }}
      >
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--color-slate-200)" }}
        >
          <div className="flex items-center gap-2">
            <Mail size={18} style={{ color: "var(--color-navy-800)" }} />
            <h2 style={{ fontSize: "18px", fontWeight: 600, color: "var(--color-navy-800)" }}>
              Send Email
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 transition-colors"
            style={{ color: "var(--color-slate-400)" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--color-slate-700)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--color-slate-400)")}
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 px-6 py-6 flex flex-col gap-5">
          <p style={{ fontSize: "13px", color: "var(--color-slate-500)" }}>
            Sending to <strong>{selectedIds.size}</strong> contact{selectedIds.size !== 1 ? "s" : ""}.
          </p>

          <div>
            <label style={lbl}>Select template</label>
            {loadingTemplates ? (
              <div className="flex items-center gap-2" style={{ color: "var(--color-slate-400)", fontSize: "13px" }}>
                <Loader2 size={14} className="animate-spin" /> Loading templates…
              </div>
            ) : (
              <select
                value={selectedTemplate}
                onChange={(e) => onTemplateChange(e.target.value)}
                style={inp}
                className="cursor-pointer outline-none"
              >
                <option value="">— Select template —</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label style={lbl}>Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject…"
              style={inp}
            />
          </div>

          <div>
            <label style={lbl}>Body</label>
            <textarea
              value={htmlBody}
              onChange={(e) => setHtmlBody(e.target.value)}
              placeholder="Write your email here…"
              rows={10}
              style={{ ...inp, resize: "vertical" }}
            />
          </div>

          {result && (
            <div
              className="rounded-lg px-4 py-3"
              style={{
                backgroundColor: result.ok ? "#dcfce7" : "#fee2e2",
                color: result.ok ? "#15803d" : "#b91c1c",
                fontSize: "13px",
              }}
            >
              {result.message}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="rounded-lg font-medium transition-colors"
              style={{
                padding: "9px 18px",
                fontSize: "14px",
                border: "1px solid var(--color-slate-200)",
                backgroundColor: "white",
                color: "var(--color-slate-700)",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !subject.trim() || !htmlBody.trim()}
              className="flex items-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50"
              style={{
                padding: "9px 18px",
                fontSize: "14px",
                backgroundColor: "#2563eb",
                color: "white",
              }}
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type BulkSMSModalProps = {
  selectedIds: Set<string>;
  onClose: () => void;
};

function BulkSMSModal({ selectedIds, onClose }: BulkSMSModalProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  useMemo(() => {
    const supabase = createClient();
    supabase
      .from("templates")
      .select("id, name, type, subject, body")
      .eq("type", "sms")
      .then(({ data }) => {
        setTemplates((data as Template[]) ?? []);
        setLoadingTemplates(false);
      });
  }, []);

  function onTemplateChange(id: string) {
    setSelectedTemplate(id);
    const tpl = templates.find((t) => t.id === id);
    if (tpl) {
      setMessage(tpl.body);
    }
  }

  async function handleSend() {
    if (!message.trim()) return;
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactIds: [...selectedIds], message }),
      });
      if (res.ok) {
        setResult({ ok: true, message: "SMS sent successfully." });
      } else {
        const err = await res.json().catch(() => ({}));
        setResult({ ok: false, message: (err as { message?: string }).message ?? "Failed to send SMS." });
      }
    } catch {
      setResult({ ok: false, message: "Network error. Please try again." });
    }
    setSending(false);
  }

  const inp: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    fontSize: "14px",
    border: "1px solid var(--color-slate-200)",
    borderRadius: "8px",
    outline: "none",
    backgroundColor: "var(--color-slate-50)",
  };

  const lbl: React.CSSProperties = {
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
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="h-full overflow-y-auto flex flex-col"
        style={{ width: "480px", backgroundColor: "white", boxShadow: "-4px 0 24px rgba(0,0,0,0.12)" }}
      >
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--color-slate-200)" }}
        >
          <div className="flex items-center gap-2">
            <MessageSquare size={18} style={{ color: "var(--color-navy-800)" }} />
            <h2 style={{ fontSize: "18px", fontWeight: 600, color: "var(--color-navy-800)" }}>
              Send SMS
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 transition-colors"
            style={{ color: "var(--color-slate-400)" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--color-slate-700)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--color-slate-400)")}
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 px-6 py-6 flex flex-col gap-5">
          <p style={{ fontSize: "13px", color: "var(--color-slate-500)" }}>
            Sending to <strong>{selectedIds.size}</strong> contact{selectedIds.size !== 1 ? "s" : ""}.
          </p>

          <div>
            <label style={lbl}>Select template</label>
            {loadingTemplates ? (
              <div className="flex items-center gap-2" style={{ color: "var(--color-slate-400)", fontSize: "13px" }}>
                <Loader2 size={14} className="animate-spin" /> Loading templates…
              </div>
            ) : (
              <select
                value={selectedTemplate}
                onChange={(e) => onTemplateChange(e.target.value)}
                style={inp}
                className="cursor-pointer outline-none"
              >
                <option value="">— Select template —</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label style={lbl}>Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your SMS message here…"
              rows={6}
              style={{ ...inp, resize: "vertical" }}
            />
          </div>

          {result && (
            <div
              className="rounded-lg px-4 py-3"
              style={{
                backgroundColor: result.ok ? "#dcfce7" : "#fee2e2",
                color: result.ok ? "#15803d" : "#b91c1c",
                fontSize: "13px",
              }}
            >
              {result.message}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="rounded-lg font-medium transition-colors"
              style={{
                padding: "9px 18px",
                fontSize: "14px",
                border: "1px solid var(--color-slate-200)",
                backgroundColor: "white",
                color: "var(--color-slate-700)",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !message.trim()}
              className="flex items-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50"
              style={{
                padding: "9px 18px",
                fontSize: "14px",
                backgroundColor: "#16a34a",
                color: "white",
              }}
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <MessageSquare size={14} />}
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ContactsClient({ initialContacts }: { initialContacts: Contact[] }) {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [lastContactedFilter, setLastContactedFilter] = useState<LastContactedFilter>("all");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showSMSModal, setShowSMSModal] = useState(false);

  const PAGE_SIZE = 20;

  const filtered = useMemo(() => {
    let result = contacts;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.full_name.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.phone?.includes(q)
      );
    }

    if (typeFilter !== "all") result = result.filter((c) => c.type === typeFilter);
    if (statusFilter !== "all") result = result.filter((c) => c.status === statusFilter);

    if (lastContactedFilter !== "all") {
      const now = Date.now();
      if (lastContactedFilter === "never") {
        result = result.filter((c) => c.last_contacted_at === null);
      } else {
        const days = Number(lastContactedFilter);
        const cutoff = now - days * 24 * 60 * 60 * 1000;
        result = result.filter(
          (c) => c.last_contacted_at === null || new Date(c.last_contacted_at).getTime() < cutoff
        );
      }
    }

    result = [...result].sort((a, b) => {
      const av = a[sortField] ?? "";
      const bv = b[sortField] ?? "";
      const cmp = String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [contacts, search, typeFilter, statusFilter, lastContactedFilter, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((c) => selectedIds.has(c.id));

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
    setPage(1);
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ChevronsUpDown size={14} className="opacity-40" />;
    return sortDir === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  }

  function onSaved(contact: Contact, isNew: boolean) {
    if (isNew) {
      setContacts((prev) => [contact, ...prev]);
    } else {
      setContacts((prev) => prev.map((c) => (c.id === contact.id ? contact : c)));
    }
    setShowModal(false);
    setEditContact(null);
  }

  function onDeleted(id: string) {
    setContacts((prev) => prev.filter((c) => c.id !== id));
    setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    setShowModal(false);
    setEditContact(null);
  }

  function openEdit(contact: Contact) {
    setEditContact(contact);
    setShowModal(true);
  }

  function openNew() {
    setEditContact(null);
    setShowModal(true);
  }

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((c) => c.id)));
    }
  }

  function toggleSelectOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-bold" style={{ fontSize: "24px", color: "var(--color-navy-800)" }}>
            Contacts
          </h1>
          <p style={{ fontSize: "14px", color: "var(--color-slate-500)", marginTop: "2px" }}>
            {filtered.length} contact{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 rounded-lg font-medium transition-colors"
          style={{
            padding: "10px 18px",
            backgroundColor: "var(--color-navy-800)",
            color: "white",
            fontSize: "14px",
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-navy-700)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-navy-800)")}
        >
          <Plus size={16} />
          Add Contact
        </button>
      </div>

      <div
        className="flex items-center gap-3 mb-4 rounded-xl p-3"
        style={{ backgroundColor: "white", border: "1px solid var(--color-slate-200)" }}
      >
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--color-slate-400)" }}
          />
          <input
            type="text"
            placeholder="Search by name, email or phone…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-lg pl-9 pr-3 outline-none"
            style={{
              padding: "8px 12px 8px 36px",
              fontSize: "14px",
              border: "1px solid var(--color-slate-200)",
              backgroundColor: "var(--color-slate-50)",
            }}
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={14} style={{ color: "var(--color-slate-400)" }} />
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="rounded-lg outline-none cursor-pointer"
            style={{
              padding: "8px 12px",
              fontSize: "14px",
              border: "1px solid var(--color-slate-200)",
              backgroundColor: "var(--color-slate-50)",
            }}
          >
            <option value="all">All types</option>
            <option value="buyer">Buyer</option>
            <option value="vendor">Vendor</option>
            <option value="tenant">Tenant</option>
            <option value="landlord">Landlord</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-lg outline-none cursor-pointer"
            style={{
              padding: "8px 12px",
              fontSize: "14px",
              border: "1px solid var(--color-slate-200)",
              backgroundColor: "var(--color-slate-50)",
            }}
          >
            <option value="all">All statuses</option>
            <option value="hot">Hot</option>
            <option value="warm">Warm</option>
            <option value="cold">Cold</option>
          </select>

          <select
            value={lastContactedFilter}
            onChange={(e) => { setLastContactedFilter(e.target.value as LastContactedFilter); setPage(1); }}
            className="rounded-lg outline-none cursor-pointer"
            style={{
              padding: "8px 12px",
              fontSize: "14px",
              border: "1px solid var(--color-slate-200)",
              backgroundColor: "var(--color-slate-50)",
            }}
          >
            <option value="all">Last Contacted</option>
            <option value="7">7+ days</option>
            <option value="14">14+ days</option>
            <option value="30">30+ days</option>
            <option value="never">Never</option>
          </select>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div
          className="flex items-center gap-3 mb-4 rounded-xl px-4 py-3"
          style={{
            backgroundColor: "var(--color-navy-800)",
            color: "white",
          }}
        >
          <span style={{ fontSize: "14px", fontWeight: 500 }}>
            {selectedIds.size} selected
          </span>
          <div className="flex items-center gap-2 ml-2">
            <button
              onClick={() => setShowEmailModal(true)}
              className="flex items-center gap-1.5 rounded-lg font-medium transition-opacity hover:opacity-80"
              style={{
                padding: "6px 14px",
                fontSize: "13px",
                backgroundColor: "#2563eb",
                color: "white",
              }}
            >
              <Mail size={14} />
              Send Email
            </button>
            <button
              onClick={() => setShowSMSModal(true)}
              className="flex items-center gap-1.5 rounded-lg font-medium transition-opacity hover:opacity-80"
              style={{
                padding: "6px 14px",
                fontSize: "13px",
                backgroundColor: "#16a34a",
                color: "white",
              }}
            >
              <MessageSquare size={14} />
              Send SMS
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="flex items-center gap-1.5 rounded-lg font-medium transition-opacity hover:opacity-80"
              style={{
                padding: "6px 14px",
                fontSize: "13px",
                backgroundColor: "rgba(255,255,255,0.15)",
                color: "white",
              }}
            >
              <X size={14} />
              Clear
            </button>
          </div>
        </div>
      )}

      <div
        className="rounded-xl overflow-hidden"
        style={{ border: "1px solid var(--color-slate-200)", backgroundColor: "white" }}
      >
        <table className="w-full" style={{ fontSize: "14px", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "var(--color-slate-50)", borderBottom: "1px solid var(--color-slate-200)" }}>
              <th style={{ padding: "12px 16px", width: "40px" }}>
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={toggleSelectAll}
                  className="cursor-pointer"
                  style={{ width: "15px", height: "15px", accentColor: "var(--color-navy-800)" }}
                />
              </th>
              {(
                [
                  { label: "Name", field: "full_name" },
                  { label: "Type", field: "type" },
                  { label: "Status", field: "status" },
                ] as { label: string; field: SortField }[]
              ).map(({ label, field }) => (
                <th
                  key={field}
                  className="text-left cursor-pointer select-none"
                  style={{ padding: "12px 16px", fontWeight: 600, color: "var(--color-slate-700)" }}
                  onClick={() => toggleSort(field)}
                >
                  <span className="flex items-center gap-1">
                    {label}
                    <SortIcon field={field} />
                  </span>
                </th>
              ))}
              <th
                className="text-left"
                style={{ padding: "12px 16px", fontWeight: 600, color: "var(--color-slate-700)" }}
              >
                Seller
              </th>
              <th
                className="text-left"
                style={{ padding: "12px 16px", fontWeight: 600, color: "var(--color-slate-700)" }}
              >
                Email
              </th>
              <th
                className="text-left"
                style={{ padding: "12px 16px", fontWeight: 600, color: "var(--color-slate-700)" }}
              >
                Phone
              </th>
              <th
                className="text-left cursor-pointer select-none"
                style={{ padding: "12px 16px", fontWeight: 600, color: "var(--color-slate-700)" }}
                onClick={() => toggleSort("created_at")}
              >
                <span className="flex items-center gap-1">
                  Added
                  <SortIcon field="created_at" />
                </span>
              </th>
              <th className="text-left" style={{ padding: "12px 16px", fontWeight: 600, color: "var(--color-slate-700)" }}>
                Score
              </th>
              <th style={{ padding: "12px 16px", width: "48px" }} />
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="text-center"
                  style={{ padding: "48px 16px", color: "var(--color-slate-400)" }}
                >
                  {search || typeFilter !== "all" || statusFilter !== "all" || lastContactedFilter !== "all"
                    ? "No contacts match your filters."
                    : "No contacts yet. Add your first contact."}
                </td>
              </tr>
            ) : (
              paginated.map((contact) => (
                <tr
                  key={contact.id}
                  className="cursor-pointer transition-colors"
                  style={{ borderBottom: "1px solid var(--color-slate-100)" }}
                  onClick={() => openEdit(contact)}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-slate-50)")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.backgroundColor = "transparent")
                  }
                >
                  <td style={{ padding: "14px 16px" }} onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(contact.id)}
                      onChange={() => toggleSelectOne(contact.id)}
                      className="cursor-pointer"
                      style={{ width: "15px", height: "15px", accentColor: "var(--color-navy-800)" }}
                    />
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <div className="flex items-center gap-3">
                      <div
                        className="flex items-center justify-center rounded-full font-semibold shrink-0"
                        style={{
                          width: "36px",
                          height: "36px",
                          backgroundColor: "var(--color-navy-100)",
                          color: "var(--color-navy-800)",
                          fontSize: "13px",
                        }}
                      >
                        {contact.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 500, color: "var(--color-slate-900)" }}>
                        {contact.full_name}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span
                      className="rounded-full px-2 py-1 font-medium capitalize"
                      style={{
                        fontSize: "12px",
                        backgroundColor: TYPE_COLORS[contact.type]?.bg,
                        color: TYPE_COLORS[contact.type]?.text,
                      }}
                    >
                      {contact.type}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span
                      className="rounded-full px-2 py-1 font-medium capitalize"
                      style={{
                        fontSize: "12px",
                        backgroundColor: STATUS_COLORS[contact.status]?.bg,
                        color: STATUS_COLORS[contact.status]?.text,
                      }}
                    >
                      {contact.status}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    {contact.seller_likelihood ? (
                      <span
                        style={{
                          ...pillStyle,
                          backgroundColor: SELLER_COLORS[contact.seller_likelihood]?.bg,
                          color: SELLER_COLORS[contact.seller_likelihood]?.text,
                        }}
                      >
                        {SELLER_LABELS[contact.seller_likelihood]}
                      </span>
                    ) : (
                      <span style={{ color: "var(--color-slate-300)" }}>–</span>
                    )}
                  </td>
                  <td style={{ padding: "14px 16px", color: "var(--color-slate-600)" }}>
                    {contact.email ?? <span style={{ color: "var(--color-slate-300)" }}>—</span>}
                  </td>
                  <td style={{ padding: "14px 16px", color: "var(--color-slate-600)" }}>
                    {contact.phone ?? <span style={{ color: "var(--color-slate-300)" }}>—</span>}
                  </td>
                  <td style={{ padding: "14px 16px", color: "var(--color-slate-400)", fontSize: "12px" }}>
                    {new Date(contact.created_at).toLocaleDateString("en-AU", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span className="rounded-full px-2 py-1 font-semibold"
                      style={{
                        fontSize: "12px",
                        backgroundColor: STATUS_COLORS[contact.status]?.bg,
                        color: STATUS_COLORS[contact.status]?.text,
                      }}>
                      {leadScore(contact.status)}
                    </span>
                  </td>
                  <td style={{ padding: "14px 8px" }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); router.push(`/contacts/${contact.id}`); }}
                      className="flex items-center justify-center rounded-lg transition-colors"
                      style={{ width: 32, height: 32, color: "var(--color-slate-400)" }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--color-navy-800)")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--color-slate-400)")}
                      title="View profile"
                    >
                      <ExternalLink size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span style={{ fontSize: "13px", color: "var(--color-slate-500)" }}>
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="rounded-lg px-3 py-1.5 transition-colors disabled:opacity-40"
              style={{
                fontSize: "13px",
                border: "1px solid var(--color-slate-200)",
                backgroundColor: "white",
              }}
            >
              Previous
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className="rounded-lg w-8 h-8 transition-colors"
                style={{
                  fontSize: "13px",
                  fontWeight: p === page ? 600 : 400,
                  border: p === page ? "none" : "1px solid var(--color-slate-200)",
                  backgroundColor: p === page ? "var(--color-navy-800)" : "white",
                  color: p === page ? "white" : "var(--color-slate-700)",
                }}
              >
                {p}
              </button>
            ))}
            <button
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              className="rounded-lg px-3 py-1.5 transition-colors disabled:opacity-40"
              style={{
                fontSize: "13px",
                border: "1px solid var(--color-slate-200)",
                backgroundColor: "white",
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {showModal && (
        <ContactModal
          contact={editContact}
          onSaved={onSaved}
          onDeleted={onDeleted}
          onClose={() => { setShowModal(false); setEditContact(null); }}
        />
      )}

      {showEmailModal && (
        <BulkEmailModal
          selectedIds={selectedIds}
          onClose={() => setShowEmailModal(false)}
        />
      )}

      {showSMSModal && (
        <BulkSMSModal
          selectedIds={selectedIds}
          onClose={() => setShowSMSModal(false)}
        />
      )}
    </div>
  );
}
