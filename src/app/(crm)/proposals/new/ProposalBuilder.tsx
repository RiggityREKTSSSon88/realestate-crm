"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Plus,
  Send,
  Save,
  ExternalLink,
  Lock,
  Star,
  Copy,
  Check,
  AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Proposal, ProposalSection, AgentReview } from "@/types/database";

type ComparableSaleRow = {
  address: string;
  sale_price: number | null;
  sale_date: string;
};

type Props = {
  proposal?: Proposal;
  contacts: { id: string; full_name: string; email: string }[];
  properties: { id: string; address: string; suburb: string; state: string }[];
  appraisals: {
    id: string;
    property_id: string;
    comparable_sales: unknown[];
    estimated_value_low: number | null;
    estimated_value_high: number | null;
  }[];
  reviews: AgentReview[];
  currentUser: {
    id: string;
    full_name: string;
    email: string;
    role: string;
    avatar_url: string | null;
  };
};

const SECTION_TYPE_LABELS: Record<ProposalSection["type"], string> = {
  cover: "Cover",
  agent_bio: "Agent Bio",
  comparable_sales: "Comparable Sales",
  pricing: "Pricing Strategy",
  marketing: "Marketing Plan",
  social_proof: "Social Proof",
  booking: "Booking Link",
  custom: "Custom Text",
};

const STATUS_BADGE: Record<
  Proposal["status"],
  { bg: string; color: string; label: string }
> = {
  draft: { bg: "var(--color-slate-100)", color: "var(--color-slate-600)", label: "Draft" },
  sent: { bg: "#dbeafe", color: "#1d4ed8", label: "Sent" },
  opened: { bg: "#fef9c3", color: "#b45309", label: "Opened" },
  signed: { bg: "#dcfce7", color: "#166534", label: "Signed" },
  declined: { bg: "#fee2e2", color: "#b91c1c", label: "Declined" },
};

function makeDefaultSections(): ProposalSection[] {
  return [
    { id: crypto.randomUUID(), type: "cover", title: "Cover", body: "", visible: true, order: 0, adminOnly: false, data: {} },
    { id: crypto.randomUUID(), type: "agent_bio", title: "About Your Agent", body: "", visible: true, order: 1, adminOnly: false, data: {} },
    { id: crypto.randomUUID(), type: "comparable_sales", title: "Recent Sales", body: "", visible: true, order: 2, adminOnly: false, data: {} },
    { id: crypto.randomUUID(), type: "pricing", title: "Pricing Strategy", body: "", visible: true, order: 3, adminOnly: true, data: {} },
    { id: crypto.randomUUID(), type: "marketing", title: "Marketing Plan", body: "", visible: true, order: 4, adminOnly: false, data: {} },
    { id: crypto.randomUUID(), type: "social_proof", title: "Client Reviews", body: "", visible: true, order: 5, adminOnly: false, data: {} },
    { id: crypto.randomUUID(), type: "booking", title: "Book a Meeting", body: "", visible: true, order: 6, adminOnly: false, data: {} },
  ];
}

function formatCurrency(n: number | null | undefined): string {
  if (n == null) return "";
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function isComparableSaleRow(v: unknown): v is ComparableSaleRow {
  if (typeof v !== "object" || v === null) return false;
  const obj = v as Record<string, unknown>;
  return typeof obj["address"] === "string" && typeof obj["sale_date"] === "string";
}

export default function ProposalBuilder({
  proposal: initialProposal,
  contacts,
  properties,
  appraisals,
  reviews,
  currentUser,
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const isAgent = currentUser.role === "agent";

  const [savedProposal, setSavedProposal] = useState<Proposal | undefined>(initialProposal);
  const [title, setTitle] = useState(initialProposal?.title ?? "New Proposal");
  const [contactId, setContactId] = useState(initialProposal?.contact_id ?? "");
  const [propertyId, setPropertyId] = useState(initialProposal?.property_id ?? "");
  const [status, setStatus] = useState<Proposal["status"]>(initialProposal?.status ?? "draft");
  const [sections, setSections] = useState<ProposalSection[]>(
    initialProposal?.sections?.length ? initialProposal.sections : makeDefaultSections()
  );
  const [selectedSectionId, setSelectedSectionId] = useState<string>(
    sections[0]?.id ?? ""
  );
  const [isDirty, setIsDirty] = useState(!initialProposal);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [copiedBooking, setCopiedBooking] = useState(false);

  const selectedSection = sections.find((s) => s.id === selectedSectionId) ?? sections[0];

  const markDirty = useCallback(() => setIsDirty(true), []);

  useEffect(() => {
    if (propertyId) {
      const appraisal = appraisals.find((a) => a.property_id === propertyId);
      if (appraisal) {
        setSections((prev) =>
          prev.map((s) => {
            if (s.type !== "comparable_sales") return s;
            return {
              ...s,
              data: {
                ...s.data,
                comparable_sales: appraisal.comparable_sales,
                estimated_value_low: appraisal.estimated_value_low,
                estimated_value_high: appraisal.estimated_value_high,
              },
            };
          })
        );
        markDirty();
      }
    }
  }, [propertyId, appraisals, markDirty]);

  const updateSection = useCallback(
    (id: string, patch: Partial<ProposalSection>) => {
      setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
      markDirty();
    },
    [markDirty]
  );

  const updateSectionData = useCallback(
    (id: string, dataKey: string, value: unknown) => {
      setSections((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, data: { ...s.data, [dataKey]: value } } : s
        )
      );
      markDirty();
    },
    [markDirty]
  );

  const moveSection = useCallback((id: string, direction: "up" | "down") => {
    setSections((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (direction === "up" && idx === 0) return prev;
      if (direction === "down" && idx === prev.length - 1) return prev;
      const next = [...prev];
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next.map((s, i) => ({ ...s, order: i }));
    });
    markDirty();
  }, [markDirty]);

  const addSection = useCallback(
    (type: ProposalSection["type"]) => {
      const adminOnly = type === "pricing";
      const newSection: ProposalSection = {
        id: crypto.randomUUID(),
        type,
        title: SECTION_TYPE_LABELS[type],
        body: "",
        visible: true,
        order: sections.length,
        adminOnly,
        data: {},
      };
      setSections((prev) => [...prev, newSection]);
      setSelectedSectionId(newSection.id);
      setAddSectionOpen(false);
      markDirty();
    },
    [sections.length, markDirty]
  );

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const payload = {
        title,
        contact_id: contactId || null,
        property_id: propertyId || null,
        status,
        sections,
      };

      if (!savedProposal?.id) {
        const { data: authData } = await supabase.auth.getUser();
        const { data: userProfile } = await supabase
          .from("users")
          .select("agency_id")
          .eq("id", currentUser.id)
          .single();

        const { data, error } = await supabase
          .from("proposals")
          .insert({
            ...payload,
            agency_id: userProfile?.agency_id ?? "",
            created_by: authData.user?.id ?? null,
            docuseal_submission_id: null,
            docuseal_signing_url: null,
            sent_at: null,
            first_opened_at: null,
            signed_at: null,
          })
          .select("*")
          .single();

        if (error) throw error;
        const saved = data as Proposal;
        setSavedProposal(saved);
        setStatus(saved.status);
        setIsDirty(false);
        router.push(`/proposals/${saved.id}`);
      } else {
        const { data, error } = await supabase
          .from("proposals")
          .update(payload)
          .eq("id", savedProposal.id)
          .select("*")
          .single();

        if (error) throw error;
        const saved = data as Proposal;
        setSavedProposal(saved);
        setStatus(saved.status);
        setIsDirty(false);
      }
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setIsSaving(false);
    }
  }, [title, contactId, propertyId, status, sections, savedProposal, supabase, currentUser.id, router]);

  const handleSend = useCallback(async () => {
    if (isDirty) await handleSave();
    if (!savedProposal?.id) return;
    setIsSending(true);
    try {
      const res = await fetch("/api/proposals/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId: savedProposal.id }),
      });
      const json = await res.json() as { signingUrl?: string; error?: string };
      if (json.signingUrl) {
        window.open(json.signingUrl, "_blank");
        setStatus("sent");
      }
    } catch (err) {
      console.error("Send failed:", err);
    } finally {
      setIsSending(false);
    }
  }, [isDirty, handleSave, savedProposal]);

  const sortedSections = [...sections].sort((a, b) => a.order - b.order);

  const SECTION_TYPES_TO_ADD: ProposalSection["type"][] = [
    "cover",
    "agent_bio",
    "comparable_sales",
    "pricing",
    "marketing",
    "social_proof",
    "booking",
    "custom",
  ];

  return (
    <div
      style={{
        display: "flex",
        height: "calc(100vh - 64px)",
        overflow: "hidden",
        backgroundColor: "var(--color-slate-50)",
      }}
    >
      {/* Left panel */}
      <div
        style={{
          width: "320px",
          flexShrink: 0,
          backgroundColor: "white",
          borderRight: "1px solid var(--color-slate-200)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "16px",
            borderBottom: "1px solid var(--color-slate-100)",
            flexShrink: 0,
          }}
        >
          <h2
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: "var(--color-slate-500)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              margin: 0,
            }}
          >
            Sections
          </h2>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
          {sortedSections.map((section) => {
            const isSelected = section.id === selectedSectionId;
            const locked = section.adminOnly && isAgent;
            return (
              <div
                key={section.id}
                onClick={() => setSelectedSectionId(section.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  marginBottom: "4px",
                  cursor: "pointer",
                  backgroundColor: isSelected ? "var(--color-navy-800)" : "transparent",
                  border: isSelected
                    ? "1px solid var(--color-navy-800)"
                    : "1px solid transparent",
                  transition: "all 0.1s",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: isSelected ? "white" : "var(--color-navy-800)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {section.title}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: isSelected ? "rgba(255,255,255,0.65)" : "var(--color-slate-400)",
                      marginTop: "2px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    {SECTION_TYPE_LABELS[section.type]}
                    {section.adminOnly && (
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "1px 5px",
                          borderRadius: "4px",
                          backgroundColor: isSelected ? "rgba(255,255,255,0.2)" : "#fef3c7",
                          color: isSelected ? "white" : "#92400e",
                        }}
                      >
                        ADMIN
                      </span>
                    )}
                  </div>
                </div>

                <div
                  style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {locked && (
                    <Lock
                      size={13}
                      color={isSelected ? "rgba(255,255,255,0.6)" : "var(--color-slate-400)"}
                    />
                  )}
                  <button
                    onClick={() => updateSection(section.id, { visible: !section.visible })}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "2px",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {section.visible ? (
                      <Eye size={14} color={isSelected ? "rgba(255,255,255,0.7)" : "var(--color-slate-400)"} />
                    ) : (
                      <EyeOff size={14} color={isSelected ? "rgba(255,255,255,0.5)" : "var(--color-slate-300)"} />
                    )}
                  </button>
                  <button
                    onClick={() => moveSection(section.id, "up")}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "2px",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <ChevronUp size={14} color={isSelected ? "rgba(255,255,255,0.7)" : "var(--color-slate-400)"} />
                  </button>
                  <button
                    onClick={() => moveSection(section.id, "down")}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "2px",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <ChevronDown size={14} color={isSelected ? "rgba(255,255,255,0.7)" : "var(--color-slate-400)"} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            padding: "12px",
            borderTop: "1px solid var(--color-slate-100)",
            flexShrink: 0,
            position: "relative",
          }}
        >
          <button
            onClick={() => setAddSectionOpen((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              width: "100%",
              padding: "9px",
              borderRadius: "8px",
              backgroundColor: "var(--color-slate-50)",
              border: "1px dashed var(--color-slate-300)",
              color: "var(--color-slate-600)",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Plus size={15} />
            Add Section
          </button>

          {addSectionOpen && (
            <div
              style={{
                position: "absolute",
                bottom: "56px",
                left: "12px",
                right: "12px",
                backgroundColor: "white",
                border: "1px solid var(--color-slate-200)",
                borderRadius: "10px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                overflow: "hidden",
                zIndex: 50,
              }}
            >
              {SECTION_TYPES_TO_ADD.map((type) => (
                <button
                  key={type}
                  onClick={() => addSection(type)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                    padding: "10px 14px",
                    border: "none",
                    backgroundColor: "transparent",
                    fontSize: "13px",
                    color: "var(--color-navy-800)",
                    fontWeight: 500,
                    cursor: "pointer",
                    textAlign: "left",
                    borderBottom: "1px solid var(--color-slate-50)",
                  }}
                >
                  {SECTION_TYPE_LABELS[type]}
                  {type === "pricing" && (
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        padding: "1px 5px",
                        borderRadius: "4px",
                        backgroundColor: "#fef3c7",
                        color: "#92400e",
                      }}
                    >
                      ADMIN
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top toolbar */}
        <div
          style={{
            backgroundColor: "white",
            borderBottom: "1px solid var(--color-slate-200)",
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flexShrink: 0,
            flexWrap: "wrap",
          }}
        >
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              markDirty();
            }}
            style={{
              fontSize: "16px",
              fontWeight: 700,
              color: "var(--color-navy-800)",
              border: "none",
              outline: "none",
              flex: "1 1 180px",
              minWidth: "120px",
              backgroundColor: "transparent",
              padding: "4px 0",
              borderBottom: "2px solid transparent",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderBottomColor = "var(--color-navy-800)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderBottomColor = "transparent";
            }}
            placeholder="Proposal title"
          />

          <select
            value={contactId}
            onChange={(e) => {
              setContactId(e.target.value);
              markDirty();
            }}
            style={{
              padding: "7px 10px",
              borderRadius: "7px",
              border: "1px solid var(--color-slate-200)",
              fontSize: "13px",
              color: "var(--color-navy-800)",
              backgroundColor: "white",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <option value="">Select contact</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name}
              </option>
            ))}
          </select>

          <select
            value={propertyId}
            onChange={(e) => {
              setPropertyId(e.target.value);
              markDirty();
            }}
            style={{
              padding: "7px 10px",
              borderRadius: "7px",
              border: "1px solid var(--color-slate-200)",
              fontSize: "13px",
              color: "var(--color-navy-800)",
              backgroundColor: "white",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <option value="">Select property</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.address}, {p.suburb}
              </option>
            ))}
          </select>

          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "4px 10px",
              borderRadius: "9999px",
              fontSize: "12px",
              fontWeight: 600,
              backgroundColor: STATUS_BADGE[status].bg,
              color: STATUS_BADGE[status].color,
              flexShrink: 0,
            }}
          >
            {STATUS_BADGE[status].label}
          </span>

          <div style={{ display: "flex", gap: "8px", marginLeft: "auto", flexShrink: 0 }}>
            {savedProposal?.id && (
              <button
                onClick={() => window.open(`/p/${savedProposal.id}`, "_blank")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 14px",
                  borderRadius: "7px",
                  fontSize: "13px",
                  fontWeight: 600,
                  border: "1px solid var(--color-slate-200)",
                  backgroundColor: "white",
                  color: "var(--color-slate-600)",
                  cursor: "pointer",
                }}
              >
                <ExternalLink size={14} />
                Preview
              </button>
            )}

            <button
              onClick={handleSave}
              disabled={isSaving || !isDirty}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "7px",
                fontSize: "13px",
                fontWeight: 600,
                border: "1px solid var(--color-slate-200)",
                backgroundColor: isDirty ? "var(--color-navy-800)" : "var(--color-slate-100)",
                color: isDirty ? "white" : "var(--color-slate-400)",
                cursor: isDirty ? "pointer" : "default",
                transition: "all 0.15s",
              }}
            >
              <Save size={14} />
              {isSaving ? "Saving…" : "Save Draft"}
            </button>

            <button
              onClick={handleSend}
              disabled={isSending}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                borderRadius: "7px",
                fontSize: "13px",
                fontWeight: 600,
                border: "none",
                backgroundColor: "var(--color-gold-500)",
                color: "white",
                cursor: isSending ? "default" : "pointer",
                opacity: isSending ? 0.7 : 1,
              }}
            >
              <Send size={14} />
              {isSending ? "Sending…" : "Send for Signing"}
            </button>
          </div>
        </div>

        {/* Section editor */}
        <div style={{ flex: 1, overflowY: "auto", padding: "28px" }}>
          {selectedSection && (
            <SectionEditor
              section={selectedSection}
              contacts={contacts}
              contactId={contactId}
              properties={properties}
              propertyId={propertyId}
              reviews={reviews}
              currentUser={currentUser}
              isAgent={isAgent}
              copiedBooking={copiedBooking}
              setCopiedBooking={setCopiedBooking}
              onUpdate={(patch) => updateSection(selectedSection.id, patch)}
              onUpdateData={(key, value) => updateSectionData(selectedSection.id, key, value)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

type SectionEditorProps = {
  section: ProposalSection;
  contacts: { id: string; full_name: string; email: string }[];
  contactId: string;
  properties: { id: string; address: string; suburb: string; state: string }[];
  propertyId: string;
  reviews: AgentReview[];
  currentUser: {
    id: string;
    full_name: string;
    email: string;
    role: string;
    avatar_url: string | null;
  };
  isAgent: boolean;
  copiedBooking: boolean;
  setCopiedBooking: (v: boolean) => void;
  onUpdate: (patch: Partial<ProposalSection>) => void;
  onUpdateData: (key: string, value: unknown) => void;
};

function SectionEditor({
  section,
  contacts,
  contactId,
  properties,
  propertyId,
  reviews,
  currentUser,
  isAgent,
  copiedBooking,
  setCopiedBooking,
  onUpdate,
  onUpdateData,
}: SectionEditorProps) {
  const selectedContact = contacts.find((c) => c.id === contactId);
  const selectedProperty = properties.find((p) => p.id === propertyId);

  const cardStyle: React.CSSProperties = {
    backgroundColor: "white",
    borderRadius: "12px",
    border: "1px solid var(--color-slate-200)",
    padding: "28px",
    maxWidth: "760px",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "12px",
    fontWeight: 700,
    color: "var(--color-slate-500)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: "6px",
    display: "block",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    borderRadius: "7px",
    border: "1px solid var(--color-slate-200)",
    fontSize: "14px",
    color: "var(--color-navy-800)",
    backgroundColor: "white",
    outline: "none",
    boxSizing: "border-box",
  };

  const readonlyStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    borderRadius: "7px",
    border: "1px solid var(--color-slate-100)",
    fontSize: "14px",
    color: "var(--color-slate-500)",
    backgroundColor: "var(--color-slate-50)",
    boxSizing: "border-box",
  };

  const fieldGroup: React.CSSProperties = { marginBottom: "18px" };

  const sectionHeader = (
    <div style={{ marginBottom: "24px" }}>
      <div style={{ marginBottom: "16px" }}>
        <label style={labelStyle}>Section Title</label>
        <input
          style={inputStyle}
          value={section.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
        />
      </div>
      <hr style={{ border: "none", borderTop: "1px solid var(--color-slate-100)", margin: "0 0 20px" }} />
    </div>
  );

  if (section.type === "cover") {
    const subtitle = typeof section.data["subtitle"] === "string" ? section.data["subtitle"] : "";
    return (
      <div style={cardStyle}>
        {sectionHeader}
        <div style={fieldGroup}>
          <label style={labelStyle}>Proposal Subtitle</label>
          <input
            style={inputStyle}
            value={subtitle}
            onChange={(e) => onUpdateData("subtitle", e.target.value)}
            placeholder="e.g. Pre-Listing Proposal"
          />
        </div>
        <div style={fieldGroup}>
          <label style={labelStyle}>Contact (auto-filled)</label>
          <div style={readonlyStyle}>
            {selectedContact ? selectedContact.full_name : "No contact selected"}
          </div>
        </div>
        <div style={fieldGroup}>
          <label style={labelStyle}>Property (auto-filled)</label>
          <div style={readonlyStyle}>
            {selectedProperty
              ? `${selectedProperty.address}, ${selectedProperty.suburb} ${selectedProperty.state}`
              : "No property selected"}
          </div>
        </div>
      </div>
    );
  }

  if (section.type === "agent_bio") {
    const bio = typeof section.data["bio"] === "string" ? section.data["bio"] : section.body;
    const yearsExp =
      typeof section.data["years_experience"] === "number"
        ? section.data["years_experience"]
        : "";
    const salesYear =
      typeof section.data["sales_this_year"] === "number"
        ? section.data["sales_this_year"]
        : "";
    return (
      <div style={cardStyle}>
        {sectionHeader}
        <div style={fieldGroup}>
          <label style={labelStyle}>Agent Name (auto-filled)</label>
          <div style={readonlyStyle}>{currentUser.full_name}</div>
        </div>
        <div style={fieldGroup}>
          <label style={labelStyle}>Email (auto-filled)</label>
          <div style={readonlyStyle}>{currentUser.email}</div>
        </div>
        <div style={fieldGroup}>
          <label style={labelStyle}>Bio</label>
          <textarea
            style={{ ...inputStyle, minHeight: "100px", resize: "vertical" }}
            value={bio}
            onChange={(e) => onUpdateData("bio", e.target.value)}
            placeholder="Tell clients about your experience and approach..."
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div>
            <label style={labelStyle}>Years Experience</label>
            <input
              type="number"
              style={inputStyle}
              value={yearsExp}
              min={0}
              onChange={(e) =>
                onUpdateData("years_experience", e.target.valueAsNumber)
              }
              placeholder="0"
            />
          </div>
          <div>
            <label style={labelStyle}>Sales This Year</label>
            <input
              type="number"
              style={inputStyle}
              value={salesYear}
              min={0}
              onChange={(e) =>
                onUpdateData("sales_this_year", e.target.valueAsNumber)
              }
              placeholder="0"
            />
          </div>
        </div>
      </div>
    );
  }

  if (section.type === "comparable_sales") {
    const rawComps = Array.isArray(section.data["comparable_sales"])
      ? section.data["comparable_sales"]
      : [];
    const comps: ComparableSaleRow[] = rawComps.filter(isComparableSaleRow).slice(0, 5);
    return (
      <div style={cardStyle}>
        {sectionHeader}
        {comps.length === 0 ? (
          <div
            style={{
              padding: "32px",
              textAlign: "center",
              backgroundColor: "var(--color-slate-50)",
              borderRadius: "8px",
              border: "1px dashed var(--color-slate-200)",
            }}
          >
            <p style={{ fontSize: "14px", color: "var(--color-slate-500)", margin: 0 }}>
              Select a property with an appraisal to auto-fill comparable sales.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
              <thead>
                <tr>
                  {["Address", "Sale Price", "Sale Date"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 14px",
                        textAlign: "left",
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "var(--color-slate-500)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        borderBottom: "2px solid var(--color-slate-100)",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comps.map((comp, i) => (
                  <tr
                    key={i}
                    style={{
                      borderBottom: "1px solid var(--color-slate-100)",
                    }}
                  >
                    <td
                      style={{
                        padding: "11px 14px",
                        color: "var(--color-navy-800)",
                        fontWeight: 500,
                      }}
                    >
                      {isAgent ? (
                        comp.address
                      ) : (
                        <input
                          style={{ ...inputStyle, padding: "5px 8px" }}
                          value={comp.address}
                          onChange={(e) => {
                            const updated = [...comps];
                            updated[i] = { ...updated[i], address: e.target.value };
                            onUpdateData("comparable_sales", updated);
                          }}
                        />
                      )}
                    </td>
                    <td style={{ padding: "11px 14px", color: "var(--color-slate-600)" }}>
                      {isAgent ? (
                        formatCurrency(comp.sale_price)
                      ) : (
                        <input
                          type="number"
                          style={{ ...inputStyle, padding: "5px 8px" }}
                          value={comp.sale_price ?? ""}
                          onChange={(e) => {
                            const updated = [...comps];
                            updated[i] = {
                              ...updated[i],
                              sale_price: e.target.valueAsNumber || null,
                            };
                            onUpdateData("comparable_sales", updated);
                          }}
                        />
                      )}
                    </td>
                    <td style={{ padding: "11px 14px", color: "var(--color-slate-500)" }}>
                      {isAgent ? (
                        formatDate(comp.sale_date)
                      ) : (
                        <input
                          type="date"
                          style={{ ...inputStyle, padding: "5px 8px" }}
                          value={comp.sale_date}
                          onChange={(e) => {
                            const updated = [...comps];
                            updated[i] = { ...updated[i], sale_date: e.target.value };
                            onUpdateData("comparable_sales", updated);
                          }}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  if (section.type === "pricing") {
    const valueLow =
      typeof section.data["estimated_value_low"] === "number"
        ? section.data["estimated_value_low"]
        : null;
    const valueHigh =
      typeof section.data["estimated_value_high"] === "number"
        ? section.data["estimated_value_high"]
        : null;
    const commissionRate =
      typeof section.data["commission_rate"] === "number"
        ? section.data["commission_rate"]
        : "";
    const marketingBudget =
      typeof section.data["marketing_budget"] === "number"
        ? section.data["marketing_budget"]
        : "";

    return (
      <div style={cardStyle}>
        {sectionHeader}

        {isAgent && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              padding: "12px 16px",
              backgroundColor: "#fef3c7",
              border: "1px solid #fcd34d",
              borderRadius: "8px",
              marginBottom: "24px",
            }}
          >
            <AlertCircle size={16} color="#92400e" style={{ flexShrink: 0, marginTop: "1px" }} />
            <p style={{ fontSize: "13px", color: "#78350f", margin: 0, lineHeight: 1.5 }}>
              Financial figures are set by your principal and cannot be edited.
            </p>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "18px" }}>
          <div>
            <label style={labelStyle}>Estimated Value — Low ($)</label>
            {isAgent ? (
              <div style={readonlyStyle}>{formatCurrency(valueLow) || "—"}</div>
            ) : (
              <input
                type="number"
                style={inputStyle}
                value={valueLow ?? ""}
                min={0}
                onChange={(e) => onUpdateData("estimated_value_low", e.target.valueAsNumber || null)}
                placeholder="0"
              />
            )}
          </div>
          <div>
            <label style={labelStyle}>Estimated Value — High ($)</label>
            {isAgent ? (
              <div style={readonlyStyle}>{formatCurrency(valueHigh) || "—"}</div>
            ) : (
              <input
                type="number"
                style={inputStyle}
                value={valueHigh ?? ""}
                min={0}
                onChange={(e) => onUpdateData("estimated_value_high", e.target.valueAsNumber || null)}
                placeholder="0"
              />
            )}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div>
            <label style={labelStyle}>Commission Rate (%)</label>
            {isAgent ? (
              <div style={readonlyStyle}>
                {commissionRate !== "" ? `${commissionRate}%` : "—"}
              </div>
            ) : (
              <input
                type="number"
                style={inputStyle}
                value={commissionRate}
                min={0}
                step={0.1}
                onChange={(e) => onUpdateData("commission_rate", e.target.valueAsNumber)}
                placeholder="e.g. 2.5"
              />
            )}
          </div>
          <div>
            <label style={labelStyle}>Marketing Budget ($)</label>
            {isAgent ? (
              <div style={readonlyStyle}>
                {marketingBudget !== "" ? formatCurrency(marketingBudget as number) : "—"}
              </div>
            ) : (
              <input
                type="number"
                style={inputStyle}
                value={marketingBudget}
                min={0}
                onChange={(e) => onUpdateData("marketing_budget", e.target.valueAsNumber)}
                placeholder="0"
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  if (section.type === "marketing") {
    return (
      <div style={cardStyle}>
        {sectionHeader}
        <div style={fieldGroup}>
          <label style={labelStyle}>Marketing Plan</label>
          <textarea
            style={{ ...inputStyle, minHeight: "180px", resize: "vertical" }}
            value={section.body}
            onChange={(e) => onUpdate({ body: e.target.value })}
            placeholder="Describe your marketing strategy for this property..."
          />
        </div>
      </div>
    );
  }

  if (section.type === "social_proof") {
    return (
      <div style={cardStyle}>
        {sectionHeader}
        {reviews.length === 0 ? (
          <div
            style={{
              padding: "32px",
              textAlign: "center",
              backgroundColor: "var(--color-slate-50)",
              borderRadius: "8px",
              border: "1px dashed var(--color-slate-200)",
            }}
          >
            <p style={{ fontSize: "14px", color: "var(--color-slate-500)", margin: 0 }}>
              No reviews found. Reviews are pulled automatically from your profile.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: "16px",
            }}
          >
            {reviews.map((review) => {
              const SOURCE_LABEL: Record<AgentReview["source"], string> = {
                ratemyagent: "RateMyAgent",
                google: "Google",
                other: "Other",
              };
              return (
                <div
                  key={review.id}
                  style={{
                    backgroundColor: "var(--color-slate-50)",
                    borderRadius: "10px",
                    border: "1px solid var(--color-slate-200)",
                    padding: "16px",
                  }}
                >
                  <div style={{ display: "flex", gap: "2px", marginBottom: "8px" }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        fill={i < review.rating ? "var(--color-gold-500)" : "none"}
                        color={i < review.rating ? "var(--color-gold-500)" : "var(--color-slate-300)"}
                      />
                    ))}
                  </div>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "var(--color-slate-700)",
                      margin: "0 0 10px",
                      lineHeight: 1.5,
                      display: "-webkit-box",
                      WebkitLineClamp: 4,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    &ldquo;{review.review_text}&rdquo;
                  </p>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          color: "var(--color-navy-800)",
                        }}
                      >
                        {review.reviewer_name}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--color-slate-400)" }}>
                        {formatDate(review.review_date)}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        padding: "2px 7px",
                        borderRadius: "4px",
                        backgroundColor:
                          review.source === "google"
                            ? "#dbeafe"
                            : review.source === "ratemyagent"
                            ? "#dcfce7"
                            : "var(--color-slate-100)",
                        color:
                          review.source === "google"
                            ? "#1d4ed8"
                            : review.source === "ratemyagent"
                            ? "#166534"
                            : "var(--color-slate-600)",
                      }}
                    >
                      {SOURCE_LABEL[review.source]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (section.type === "booking") {
    const bookingUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/book/${currentUser.id}`
        : `/book/${currentUser.id}`;

    const handleCopy = () => {
      void navigator.clipboard.writeText(bookingUrl).then(() => {
        setCopiedBooking(true);
        setTimeout(() => setCopiedBooking(false), 2000);
      });
    };

    return (
      <div style={cardStyle}>
        {sectionHeader}
        <div style={fieldGroup}>
          <label style={labelStyle}>Booking Link</label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 14px",
              borderRadius: "8px",
              border: "1px solid var(--color-slate-200)",
              backgroundColor: "var(--color-slate-50)",
            }}
          >
            <span
              style={{
                flex: 1,
                fontSize: "13px",
                color: "var(--color-navy-800)",
                wordBreak: "break-all",
              }}
            >
              {bookingUrl}
            </span>
            <button
              onClick={handleCopy}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                border: "1px solid var(--color-slate-200)",
                backgroundColor: "white",
                color: copiedBooking ? "#166534" : "var(--color-navy-800)",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              {copiedBooking ? <Check size={13} /> : <Copy size={13} />}
              {copiedBooking ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (section.type === "custom") {
    return (
      <div style={cardStyle}>
        {sectionHeader}
        <div style={fieldGroup}>
          <label style={labelStyle}>Content</label>
          <textarea
            style={{ ...inputStyle, minHeight: "200px", resize: "vertical", fontFamily: "inherit" }}
            value={section.body}
            onChange={(e) => onUpdate({ body: e.target.value })}
            placeholder="Enter custom content for this section..."
          />
        </div>
      </div>
    );
  }

  return null;
}
