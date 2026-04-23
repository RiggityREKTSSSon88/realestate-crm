"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Phone, Mail, Star, TrendingUp, Building2, MessageSquare,
  CheckSquare, Calendar, ChevronDown, ChevronUp, Loader2, KanbanSquare, ExternalLink,
  FileText, Eye, Clock, Send, CheckCircle2, Plus, ShieldCheck, AlertTriangle, Download, Trash2, Upload, ChevronRight
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Contact, Appraisal, Communication, Task, Listing, ComparableSale, Proposal, DocumentEvent, KYCDocument, ComplianceAuditLog } from "@/types/database";
import AIInsightsPanel from "@/components/AIInsightsPanel";

type AppraisalWithProperty = Appraisal & {
  properties: { id: string; address: string; suburb: string; state: string; postcode: string; property_type: string } | null;
};

type ListingWithProperty = Listing & {
  properties: { id: string; address: string; suburb: string; state: string; property_type: string } | null;
};

type ProposalWithEvents = Proposal & {
  document_events?: DocumentEvent[];
};

type Props = {
  contact: Contact;
  appraisals: AppraisalWithProperty[];
  communications: Communication[];
  tasks: Task[];
  listings: ListingWithProperty[];
  proposals: ProposalWithEvents[];
  kycDocuments: KYCDocument[];
  auditLog: ComplianceAuditLog[];
  currentUserRole: string;
};

const STATUS_COLORS = {
  hot: { bg: "#fee2e2", text: "#b91c1c" },
  warm: { bg: "#fef3c7", text: "#b45309" },
  cold: { bg: "#dbeafe", text: "#1d4ed8" },
};

const COMM_ICONS: Record<Communication["type"], React.ReactNode> = {
  email: <Mail size={14} />,
  sms: <MessageSquare size={14} />,
  call: <Phone size={14} />,
  note: <MessageSquare size={14} />,
};

function computeLeadScore(contact: Contact, appraisals: AppraisalWithProperty[]): number {
  const base = contact.status === "hot" ? 30 : contact.status === "warm" ? 20 : 10;
  const now = Date.now();
  const recency = appraisals.reduce((acc, a) => {
    const age = (now - new Date(a.appraisal_date).getTime()) / (1000 * 60 * 60 * 24);
    if (age <= 30) return acc + 20;
    if (age <= 90) return acc + 10;
    return acc + 3;
  }, 0);
  const appraisalStatusBonus = appraisals.reduce((acc, a) => {
    if (a.status === "hot") return acc + 15;
    if (a.status === "warm") return acc + 8;
    return acc;
  }, 0);
  return Math.min(100, base + recency + appraisalStatusBonus);
}

function ScoreRing({ score }: { score: number }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 70 ? "#b91c1c" : score >= 40 ? "#b45309" : "#1d4ed8";

  return (
    <div className="relative flex items-center justify-center" style={{ width: 120, height: 120 }}>
      <svg width="120" height="120" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--color-slate-100)" strokeWidth="10" />
        <circle
          cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${fill} ${circ - fill}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span style={{ fontSize: "28px", fontWeight: 700, color, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: "11px", color: "var(--color-slate-400)", marginTop: "2px" }}>/ 100</span>
      </div>
    </div>
  );
}

type CommSentiment = "positive" | "neutral" | "negative" | "urgent" | null;

const SENTIMENT_CONFIG: Record<
  NonNullable<CommSentiment>,
  { bg: string; text: string; label: string }
> = {
  positive: { bg: "#dcfce7", text: "#166534", label: "Positive" },
  neutral:  { bg: "var(--color-slate-100)", text: "var(--color-slate-500)", label: "Neutral" },
  negative: { bg: "#fee2e2", text: "#b91c1c", label: "Negative" },
  urgent:   { bg: "#fff7ed", text: "#c2410c", label: "Urgent" },
};

const SELLER_LIKELIHOOD_CONFIG: Record<
  "high" | "medium" | "low",
  { bg: string; text: string; label: string }
> = {
  high:   { bg: "#dcfce7", text: "#166534", label: "High Seller Likelihood" },
  medium: { bg: "#fef9c3", text: "#854d0e", label: "Medium Seller Likelihood" },
  low:    { bg: "var(--color-slate-100)", text: "var(--color-slate-500)", label: "Low Seller Likelihood" },
};

const LISTING_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active:      { bg: "#d1fae5", text: "#065f46" },
  under_offer: { bg: "#fef3c7", text: "#b45309" },
  sold:        { bg: "#fee2e2", text: "#b91c1c" },
  withdrawn:   { bg: "#f1f5f9", text: "#64748b" },
  leased:      { bg: "#ede9fe", text: "#6d28d9" },
};

const PROPOSAL_STATUS_BADGE: Record<Proposal["status"], { bg: string; color: string; label: string }> = {
  draft:    { bg: "var(--color-slate-100)", color: "var(--color-slate-600)", label: "Draft" },
  sent:     { bg: "#dbeafe", color: "#1d4ed8", label: "Sent" },
  opened:   { bg: "#fef9c3", color: "#b45309", label: "Opened" },
  signed:   { bg: "#dcfce7", color: "#166534", label: "Signed" },
  declined: { bg: "#fee2e2", color: "#b91c1c", label: "Declined" },
};

const KYC_STATUS_CONFIG = {
  unverified: { bg: "var(--color-slate-100)", text: "var(--color-slate-600)", label: "Unverified" },
  pending:    { bg: "#fef9c3", text: "#b45309", label: "Pending" },
  verified:   { bg: "#dcfce7", text: "#166534", label: "Verified" },
};

const AML_RISK_CONFIG = {
  low:    { bg: "#dcfce7", text: "#166534", label: "Low" },
  medium: { bg: "#fef9c3", text: "#b45309", label: "Medium" },
  high:   { bg: "#fee2e2", text: "#b91c1c", label: "High" },
};

const AUDIT_ACTION_CONFIG: Record<ComplianceAuditLog["action_type"], { bg: string; text: string; label: string }> = {
  kyc_document_uploaded: { bg: "#dbeafe", text: "#1d4ed8", label: "Doc Uploaded" },
  kyc_document_deleted:  { bg: "#fee2e2", text: "#b91c1c", label: "Doc Deleted" },
  kyc_status_changed:    { bg: "#fef9c3", text: "#b45309", label: "KYC Status" },
  aml_risk_updated:      { bg: "#f3e8ff", text: "#7e22ce", label: "AML Risk" },
};

const DOC_TYPE_LABELS: Record<KYCDocument["document_type"], string> = {
  passport:          "Passport",
  drivers_licence:   "Driver's Licence",
  birth_certificate: "Birth Certificate",
  proof_of_address:  "Proof of Address",
  other:             "Other",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function expiryBadge(expiry: string | null): React.ReactNode {
  if (!expiry) return null;
  const now = Date.now();
  const exp = new Date(expiry).getTime();
  const daysLeft = Math.ceil((exp - now) / 86400000);
  if (daysLeft < 0) {
    return (
      <span style={{ fontSize: "11px", padding: "2px 7px", borderRadius: "9999px", fontWeight: 600, backgroundColor: "#fee2e2", color: "#b91c1c" }}>
        Expired
      </span>
    );
  }
  if (daysLeft <= 30) {
    return (
      <span style={{ fontSize: "11px", padding: "2px 7px", borderRadius: "9999px", fontWeight: 600, backgroundColor: "#fef9c3", color: "#b45309" }}>
        Expiring soon
      </span>
    );
  }
  return (
    <span style={{ fontSize: "11px", padding: "2px 7px", borderRadius: "9999px", fontWeight: 500, backgroundColor: "var(--color-slate-100)", color: "var(--color-slate-500)" }}>
      Exp {fmtDate(expiry)}
    </span>
  );
}

export default function GoldenProfileClient({ contact, appraisals, communications, tasks, listings, proposals, kycDocuments, auditLog, currentUserRole }: Props) {
  const router = useRouter();
  const [expandedAppraisal, setExpandedAppraisal] = useState<string | null>(null);
  const [taskUpdating, setTaskUpdating] = useState<string | null>(null);
  const [localTasks, setLocalTasks] = useState(tasks);

  const isAdmin = currentUserRole === "admin" || currentUserRole === "super_admin";

  const [localDocs, setLocalDocs] = useState<KYCDocument[]>(kycDocuments.filter((d) => d.status === "active"));
  const [localAudit, setLocalAudit] = useState<ComplianceAuditLog[]>(auditLog);
  const [localContact, setLocalContact] = useState<Contact>(contact);

  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);

  const [uploadDocType, setUploadDocType] = useState<KYCDocument["document_type"]>("passport");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadExpiry, setUploadExpiry] = useState("");
  const [uploadNotes, setUploadNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [kycStatusChanging, setKycStatusChanging] = useState(false);

  const [amlEditOpen, setAmlEditOpen] = useState(false);
  const [amlRiskDraft, setAmlRiskDraft] = useState<"low" | "medium" | "high">(localContact.aml_risk_level ?? "low");
  const [amlNotesDraft, setAmlNotesDraft] = useState(localContact.aml_notes ?? "");
  const [amlSaving, setAmlSaving] = useState(false);

  const score = useMemo(() => computeLeadScore(contact, appraisals), [contact, appraisals]);

  const scoreLabel = score >= 70 ? "High Priority" : score >= 40 ? "Medium Priority" : "Low Priority";
  const scoreLabelColor = score >= 70 ? "#b91c1c" : score >= 40 ? "#b45309" : "#1d4ed8";

  const fmt = (val: number | null) => val ? `$${val.toLocaleString("en-AU")}` : "—";

  async function toggleTask(task: Task) {
    setTaskUpdating(task.id);
    const supabase = createClient();
    const completed = !task.completed;
    await supabase
      .from("tasks")
      .update({ completed, completed_at: completed ? new Date().toISOString() : null })
      .eq("id", task.id);
    setLocalTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, completed, completed_at: completed ? new Date().toISOString() : null } : t));
    setTaskUpdating(null);
  }

  async function handleDownload(doc: KYCDocument) {
    setDownloadingDocId(doc.id);
    const supabase = createClient();
    const { data, error } = await supabase.storage.from("kyc-documents").createSignedUrl(doc.file_path, 3600);
    setDownloadingDocId(null);
    if (error || !data?.signedUrl) return;
    window.open(data.signedUrl, "_blank");
  }

  async function handleDelete(doc: KYCDocument) {
    setDeletingDocId(doc.id);
    const supabase = createClient();
    await supabase.from("kyc_documents").delete().eq("id", doc.id);
    const now = new Date().toISOString();
    await supabase.from("compliance_audit_log").insert({
      agency_id: doc.agency_id,
      contact_id: doc.contact_id,
      performed_by: null,
      action_type: "kyc_document_deleted",
      previous_value: { document_id: doc.id, file_name: doc.file_name },
      new_value: null,
      notes: null,
    });
    const newEntry: ComplianceAuditLog = {
      id: crypto.randomUUID(),
      agency_id: doc.agency_id,
      contact_id: doc.contact_id,
      performed_by: null,
      action_type: "kyc_document_deleted",
      previous_value: { document_id: doc.id, file_name: doc.file_name },
      new_value: null,
      notes: null,
      created_at: now,
    };
    setLocalDocs((prev) => prev.filter((d) => d.id !== doc.id));
    setLocalAudit((prev) => [newEntry, ...prev]);
    setDeletingDocId(null);
    setDeleteConfirmId(null);
  }

  async function handleUpload() {
    if (!uploadFile) return;
    setUploading(true);
    setUploadError(null);
    const supabase = createClient();
    const uuid = crypto.randomUUID();
    const safeName = uploadFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `${localContact.agency_id}/${localContact.id}/${uuid}-${safeName}`;
    const { error: storageError } = await supabase.storage.from("kyc-documents").upload(filePath, uploadFile);
    if (storageError) {
      setUploadError(storageError.message);
      setUploading(false);
      return;
    }
    const now = new Date().toISOString();
    const { data: inserted, error: dbError } = await supabase.from("kyc_documents").insert({
      agency_id: localContact.agency_id,
      contact_id: localContact.id,
      document_type: uploadDocType,
      file_name: uploadFile.name,
      file_path: filePath,
      uploaded_by: null,
      expiry_date: uploadExpiry || null,
      status: "active",
      notes: uploadNotes || null,
    }).select().single();
    if (dbError || !inserted) {
      setUploadError(dbError?.message ?? "Upload failed");
      setUploading(false);
      return;
    }
    if (localContact.kyc_status === "unverified") {
      await supabase.from("contacts").update({ kyc_status: "pending" }).eq("id", localContact.id);
      setLocalContact((prev) => ({ ...prev, kyc_status: "pending" }));
    }
    await supabase.from("compliance_audit_log").insert({
      agency_id: localContact.agency_id,
      contact_id: localContact.id,
      performed_by: null,
      action_type: "kyc_document_uploaded",
      previous_value: null,
      new_value: { document_id: inserted.id, file_name: uploadFile.name, document_type: uploadDocType },
      notes: uploadNotes || null,
    });
    const auditEntry: ComplianceAuditLog = {
      id: crypto.randomUUID(),
      agency_id: localContact.agency_id,
      contact_id: localContact.id,
      performed_by: null,
      action_type: "kyc_document_uploaded",
      previous_value: null,
      new_value: { document_id: inserted.id, file_name: uploadFile.name, document_type: uploadDocType },
      notes: uploadNotes || null,
      created_at: now,
    };
    setLocalDocs((prev) => [inserted as KYCDocument, ...prev]);
    setLocalAudit((prev) => [auditEntry, ...prev]);
    setUploadFile(null);
    setUploadExpiry("");
    setUploadNotes("");
    setUploadDocType("passport");
    setUploading(false);
  }

  async function handleKycStatusChange(newStatus: Contact["kyc_status"]) {
    setKycStatusChanging(true);
    const supabase = createClient();
    const oldStatus = localContact.kyc_status;
    const now = new Date().toISOString();
    await supabase.from("contacts").update({
      kyc_status: newStatus,
      kyc_verified_at: newStatus === "verified" ? now : null,
    }).eq("id", localContact.id);
    await supabase.from("compliance_audit_log").insert({
      agency_id: localContact.agency_id,
      contact_id: localContact.id,
      performed_by: null,
      action_type: "kyc_status_changed",
      previous_value: { kyc_status: oldStatus },
      new_value: { kyc_status: newStatus },
      notes: null,
    });
    const auditEntry: ComplianceAuditLog = {
      id: crypto.randomUUID(),
      agency_id: localContact.agency_id,
      contact_id: localContact.id,
      performed_by: null,
      action_type: "kyc_status_changed",
      previous_value: { kyc_status: oldStatus },
      new_value: { kyc_status: newStatus },
      notes: null,
      created_at: now,
    };
    setLocalContact((prev) => ({ ...prev, kyc_status: newStatus, kyc_verified_at: newStatus === "verified" ? now : null }));
    setLocalAudit((prev) => [auditEntry, ...prev]);
    setKycStatusChanging(false);
  }

  async function handleAmlSave() {
    setAmlSaving(true);
    const supabase = createClient();
    const now = new Date().toISOString();
    const oldRisk = localContact.aml_risk_level;
    const oldNotes = localContact.aml_notes;
    await supabase.from("contacts").update({
      aml_risk_level: amlRiskDraft,
      aml_notes: amlNotesDraft || null,
      aml_assessed_at: now,
      aml_assessed_by: null,
    }).eq("id", localContact.id);
    await supabase.from("compliance_audit_log").insert({
      agency_id: localContact.agency_id,
      contact_id: localContact.id,
      performed_by: null,
      action_type: "aml_risk_updated",
      previous_value: { aml_risk_level: oldRisk, aml_notes: oldNotes },
      new_value: { aml_risk_level: amlRiskDraft, aml_notes: amlNotesDraft || null },
      notes: null,
    });
    const auditEntry: ComplianceAuditLog = {
      id: crypto.randomUUID(),
      agency_id: localContact.agency_id,
      contact_id: localContact.id,
      performed_by: null,
      action_type: "aml_risk_updated",
      previous_value: { aml_risk_level: oldRisk, aml_notes: oldNotes },
      new_value: { aml_risk_level: amlRiskDraft, aml_notes: amlNotesDraft || null },
      notes: null,
      created_at: now,
    };
    setLocalContact((prev) => ({ ...prev, aml_risk_level: amlRiskDraft, aml_notes: amlNotesDraft || null, aml_assessed_at: now }));
    setLocalAudit((prev) => [auditEntry, ...prev]);
    setAmlEditOpen(false);
    setAmlSaving(false);
  }

  const initials = contact.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const kycCfg = KYC_STATUS_CONFIG[localContact.kyc_status];

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <button
        onClick={() => router.push("/contacts")}
        className="flex items-center gap-2 mb-6 transition-colors"
        style={{ fontSize: "14px", color: "var(--color-slate-500)" }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--color-navy-800)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--color-slate-500)")}
      >
        <ArrowLeft size={16} /> Back to Contacts
      </button>

      <div className="grid gap-6" style={{ gridTemplateColumns: "340px 1fr" }}>
        {/* Left column — identity + score */}
        <div className="flex flex-col gap-4">
          {/* Identity card */}
          <div className="rounded-xl p-6 flex flex-col items-center text-center gap-3"
            style={{ backgroundColor: "white", border: "1px solid var(--color-slate-200)" }}>
            <div className="flex items-center justify-center rounded-full"
              style={{ width: 72, height: 72, backgroundColor: "var(--color-navy-100)", color: "var(--color-navy-800)", fontSize: "24px", fontWeight: 700 }}>
              {initials}
            </div>
            <div>
              <h1 style={{ fontSize: "20px", fontWeight: 700, color: "var(--color-navy-800)" }}>{contact.full_name}</h1>
              <div className="flex items-center justify-center gap-2 mt-1 flex-wrap">
                <span className="rounded-full px-2 py-0.5 font-medium capitalize"
                  style={{ fontSize: "11px", backgroundColor: STATUS_COLORS[contact.status].bg, color: STATUS_COLORS[contact.status].text }}>
                  {contact.status}
                </span>
                <span style={{ fontSize: "13px", color: "var(--color-slate-400)", textTransform: "capitalize" }}>{contact.type}</span>
                {(contact as Contact & { seller_likelihood: "low" | "medium" | "high" | null }).seller_likelihood && (() => {
                  const sl = (contact as Contact & { seller_likelihood: "low" | "medium" | "high" | null }).seller_likelihood!;
                  const slCfg = SELLER_LIKELIHOOD_CONFIG[sl];
                  return (
                    <span className="rounded-full px-2 py-0.5 font-medium"
                      style={{ fontSize: "11px", backgroundColor: slCfg.bg, color: slCfg.text }}>
                      {slCfg.label}
                    </span>
                  );
                })()}
              </div>
            </div>
            <div className="w-full pt-3 flex flex-col gap-2" style={{ borderTop: "1px solid var(--color-slate-100)" }}>
              {contact.phone && (
                <a href={`tel:${contact.phone}`} className="flex items-center gap-2 transition-colors"
                  style={{ fontSize: "14px", color: "var(--color-slate-600)" }}>
                  <Phone size={14} style={{ color: "var(--color-slate-400)" }} /> {contact.phone}
                </a>
              )}
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="flex items-center gap-2 transition-colors"
                  style={{ fontSize: "14px", color: "var(--color-slate-600)" }}>
                  <Mail size={14} style={{ color: "var(--color-slate-400)" }} /> {contact.email}
                </a>
              )}
            </div>
            {(() => {
              const lc = (contact as Contact & { last_contacted_at: string | null }).last_contacted_at;
              const lastContactedText = lc
                ? (() => {
                    const days = Math.floor((Date.now() - new Date(lc).getTime()) / 86400000);
                    return days === 0 ? "Today" : days === 1 ? "1 day ago" : `${days} days ago`;
                  })()
                : "Never contacted";
              return (
                <div className="w-full flex items-center gap-2 pt-2">
                  <Calendar size={13} style={{ color: "var(--color-slate-400)", flexShrink: 0 }} />
                  <span style={{ fontSize: "13px", color: "var(--color-slate-500)" }}>
                    Last contacted: <span style={{ color: lc ? "var(--color-slate-700)" : "var(--color-slate-400)" }}>{lastContactedText}</span>
                  </span>
                </div>
              );
            })()}
            {contact.notes && (
              <div className="w-full text-left pt-3" style={{ borderTop: "1px solid var(--color-slate-100)" }}>
                <p style={{ fontSize: "13px", color: "var(--color-slate-500)", lineHeight: 1.5 }}>{contact.notes}</p>
              </div>
            )}
          </div>

          {/* Lead score */}
          <div className="rounded-xl p-6 flex flex-col items-center gap-3"
            style={{ backgroundColor: "white", border: "1px solid var(--color-slate-200)" }}>
            <div className="flex items-center gap-2 self-start">
              <Star size={16} style={{ color: "var(--color-gold-500)" }} />
              <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-navy-800)" }}>Lead Score</span>
            </div>
            <ScoreRing score={score} />
            <div>
              <p style={{ fontSize: "14px", fontWeight: 600, color: scoreLabelColor, textAlign: "center" }}>{scoreLabel}</p>
              <p style={{ fontSize: "12px", color: "var(--color-slate-400)", textAlign: "center", marginTop: "2px" }}>
                Based on status & appraisal activity
              </p>
            </div>
            <div className="w-full flex flex-col gap-1.5 pt-3" style={{ borderTop: "1px solid var(--color-slate-100)" }}>
              <ScoreRow label="Contact status" value={contact.status === "hot" ? 30 : contact.status === "warm" ? 20 : 10} />
              <ScoreRow label={`${appraisals.length} appraisal${appraisals.length !== 1 ? "s" : ""}`} value={Math.min(score - (contact.status === "hot" ? 30 : contact.status === "warm" ? 20 : 10), 70)} />
            </div>
          </div>

          {/* AI Insights */}
          <AIInsightsPanel contactId={contact.id} />

          {/* Tasks */}
          <div className="rounded-xl p-5" style={{ backgroundColor: "white", border: "1px solid var(--color-slate-200)" }}>
            <div className="flex items-center gap-2 mb-4">
              <CheckSquare size={16} style={{ color: "var(--color-slate-400)" }} />
              <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-navy-800)" }}>Tasks</span>
              <span className="ml-auto rounded-full px-2 py-0.5" style={{ fontSize: "11px", backgroundColor: "var(--color-slate-100)", color: "var(--color-slate-500)" }}>
                {localTasks.filter((t) => !t.completed).length} open
              </span>
            </div>
            {localTasks.length === 0 ? (
              <p style={{ fontSize: "13px", color: "var(--color-slate-400)", textAlign: "center", padding: "12px 0" }}>No tasks</p>
            ) : (
              <div className="flex flex-col gap-2">
                {localTasks.map((task) => (
                  <div key={task.id} className="flex items-start gap-3">
                    <button
                      onClick={() => toggleTask(task)}
                      disabled={taskUpdating === task.id}
                      className="mt-0.5 shrink-0 flex items-center justify-center rounded transition-colors"
                      style={{
                        width: 18, height: 18,
                        border: `2px solid ${task.completed ? "var(--color-navy-800)" : "var(--color-slate-300)"}`,
                        backgroundColor: task.completed ? "var(--color-navy-800)" : "transparent",
                        color: "white",
                      }}
                    >
                      {taskUpdating === task.id ? <Loader2 size={10} className="animate-spin" /> : task.completed ? "✓" : null}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: "13px", color: task.completed ? "var(--color-slate-400)" : "var(--color-slate-700)", textDecoration: task.completed ? "line-through" : "none" }}>
                        {task.title}
                      </p>
                      {task.due_date && (
                        <p style={{ fontSize: "11px", color: "var(--color-slate-400)", marginTop: "1px" }}>
                          <Calendar size={10} style={{ display: "inline", marginRight: "3px" }} />
                          {new Date(task.due_date).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          {/* Appraisal history */}
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "white", border: "1px solid var(--color-slate-200)" }}>
            <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: "1px solid var(--color-slate-200)" }}>
              <Building2 size={16} style={{ color: "var(--color-slate-400)" }} />
              <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-navy-800)" }}>Appraisal History</span>
              <span className="ml-auto rounded-full px-2 py-0.5" style={{ fontSize: "11px", backgroundColor: "var(--color-slate-100)", color: "var(--color-slate-500)" }}>
                {appraisals.length}
              </span>
            </div>
            {appraisals.length === 0 ? (
              <p style={{ fontSize: "13px", color: "var(--color-slate-400)", textAlign: "center", padding: "32px 0" }}>No appraisals yet</p>
            ) : (
              <div>
                {appraisals.map((a) => {
                  const isOpen = expandedAppraisal === a.id;
                  const validComps = (a.comparable_sales as ComparableSale[]).filter((c) => c.address);
                  return (
                    <div key={a.id} style={{ borderBottom: "1px solid var(--color-slate-100)" }}>
                      <button
                        className="w-full flex items-start gap-4 px-5 py-4 text-left transition-colors"
                        onClick={() => setExpandedAppraisal(isOpen ? null : a.id)}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-slate-50)")}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "transparent")}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--color-slate-800)" }}>
                              {a.properties?.address ?? "Unknown property"}
                            </span>
                            <span className="rounded-full px-2 py-0.5 font-medium capitalize"
                              style={{ fontSize: "11px", backgroundColor: STATUS_COLORS[a.status].bg, color: STATUS_COLORS[a.status].text }}>
                              {a.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span style={{ fontSize: "13px", color: "var(--color-slate-400)" }}>
                              {new Date(a.appraisal_date).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                            {(a.estimated_value_low || a.estimated_value_high) && (
                              <span style={{ fontSize: "13px", color: "var(--color-slate-600)", fontWeight: 500 }}>
                                {fmt(a.estimated_value_low)} – {fmt(a.estimated_value_high)}
                              </span>
                            )}
                            {validComps.length > 0 && (
                              <span style={{ fontSize: "12px", color: "var(--color-slate-400)" }}>
                                {validComps.length} comp{validComps.length !== 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ color: "var(--color-slate-400)", marginTop: "2px" }}>
                          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </button>

                      {isOpen && (
                        <div className="px-5 pb-5" style={{ backgroundColor: "var(--color-slate-50)" }}>
                          {a.notes && (
                            <div className="mb-4">
                              <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-slate-400)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Notes</p>
                              <p style={{ fontSize: "13px", color: "var(--color-slate-600)", lineHeight: 1.5 }}>{a.notes}</p>
                            </div>
                          )}
                          {validComps.length > 0 && (
                            <div>
                              <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-slate-400)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Comparable Sales</p>
                              <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--color-slate-200)" }}>
                                <table className="w-full" style={{ fontSize: "13px", borderCollapse: "collapse" }}>
                                  <thead>
                                    <tr style={{ backgroundColor: "white", borderBottom: "1px solid var(--color-slate-200)" }}>
                                      <th className="text-left" style={{ padding: "8px 12px", fontWeight: 600, color: "var(--color-slate-600)" }}>Address</th>
                                      <th className="text-right" style={{ padding: "8px 12px", fontWeight: 600, color: "var(--color-slate-600)" }}>Sale Price</th>
                                      <th className="text-right" style={{ padding: "8px 12px", fontWeight: 600, color: "var(--color-slate-600)" }}>Date</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {validComps.map((comp, idx) => (
                                      <tr key={idx} style={{ borderBottom: idx < validComps.length - 1 ? "1px solid var(--color-slate-100)" : "none", backgroundColor: "white" }}>
                                        <td style={{ padding: "8px 12px", color: "var(--color-slate-700)" }}>{comp.address}</td>
                                        <td className="text-right" style={{ padding: "8px 12px", color: "var(--color-slate-700)", fontWeight: 500 }}>
                                          {comp.sale_price ? `$${comp.sale_price.toLocaleString("en-AU")}` : "—"}
                                        </td>
                                        <td className="text-right" style={{ padding: "8px 12px", color: "var(--color-slate-500)" }}>
                                          {comp.sale_date ? new Date(comp.sale_date).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pipeline — active listings */}
          {listings.length > 0 && (
            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "white", border: "1px solid var(--color-slate-200)" }}>
              <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: "1px solid var(--color-slate-200)" }}>
                <KanbanSquare size={16} style={{ color: "var(--color-slate-400)" }} />
                <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-navy-800)" }}>Pipeline</span>
                <span className="ml-auto rounded-full px-2 py-0.5" style={{ fontSize: "11px", backgroundColor: "var(--color-slate-100)", color: "var(--color-slate-500)" }}>
                  {listings.length} listing{listings.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div>
                {listings.map((l, idx) => {
                  const dom = Math.floor((Date.now() - new Date(l.list_date).getTime()) / 86400000);
                  const statusCol = LISTING_STATUS_COLORS[l.status] ?? LISTING_STATUS_COLORS.active;
                  const fmtStatus = (s: string) => s === "under_offer" ? "Under Offer" : s.charAt(0).toUpperCase() + s.slice(1);
                  return (
                    <div key={l.id} className="flex items-center gap-4 px-5 py-4"
                      style={{ borderBottom: idx < listings.length - 1 ? "1px solid var(--color-slate-100)" : "none" }}>
                      <div className="flex-1 min-w-0">
                        <div style={{ fontSize: "14px", fontWeight: 500, color: "var(--color-slate-800)" }}>
                          {l.properties?.address ?? "Unknown property"}
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--color-slate-400)", marginTop: "2px" }}>
                          {l.properties?.suburb}, {l.properties?.state}
                        </div>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="rounded-full px-2 py-0.5 font-medium"
                            style={{ fontSize: "11px", backgroundColor: statusCol.bg, color: statusCol.text }}>
                            {fmtStatus(l.status)}
                          </span>
                          {l.list_price && (
                            <span style={{ fontSize: "12px", color: "var(--color-slate-600)", fontWeight: 500 }}>
                              ${l.list_price.toLocaleString("en-AU")}
                            </span>
                          )}
                          <span style={{ fontSize: "12px", color: dom > 60 ? "#b91c1c" : dom > 30 ? "#b45309" : "var(--color-slate-500)" }}>
                            {dom} day{dom !== 1 ? "s" : ""} on market
                          </span>
                        </div>
                        {(l.enquiries_count > 0 || l.offers_received > 0 || l.contracts_out > 0) && (
                          <div className="flex items-center gap-3 mt-2">
                            {l.enquiries_count > 0 && <span style={{ fontSize: "11px", color: "var(--color-slate-500)" }}>{l.enquiries_count} enquiries</span>}
                            {l.offers_received > 0 && <span style={{ fontSize: "11px", color: "var(--color-slate-500)" }}>{l.offers_received} offers</span>}
                            {l.contracts_out > 0 && <span style={{ fontSize: "11px", color: "var(--color-slate-500)" }}>{l.contracts_out} contracts</span>}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => router.push(`/listings/${l.id}`)}
                        className="flex items-center gap-1 rounded-lg px-3 py-1.5 shrink-0 transition-colors"
                        style={{ fontSize: "12px", border: "1px solid var(--color-slate-200)", color: "var(--color-slate-600)" }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-slate-50)")}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "transparent")}
                      >
                        <ExternalLink size={12} /> Report
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Proposals */}
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "white", border: "1px solid var(--color-slate-200)" }}>
            <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: "1px solid var(--color-slate-200)" }}>
              <FileText size={16} style={{ color: "var(--color-slate-400)" }} />
              <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-navy-800)" }}>Proposals</span>
              <span className="ml-auto rounded-full px-2 py-0.5" style={{ fontSize: "11px", backgroundColor: "var(--color-slate-100)", color: "var(--color-slate-500)" }}>
                {proposals.length}
              </span>
              <button
                onClick={() => router.push(`/proposals/new?contactId=${contact.id}`)}
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 transition-colors"
                style={{ fontSize: "12px", fontWeight: 600, backgroundColor: "var(--color-navy-800)", color: "white", border: "none", cursor: "pointer" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-navy-700)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-navy-800)")}
              >
                <Plus size={12} /> New Proposal
              </button>
            </div>
            {proposals.length === 0 ? (
              <p style={{ fontSize: "13px", color: "var(--color-slate-400)", textAlign: "center", padding: "32px 0" }}>No proposals sent yet</p>
            ) : (
              <div>
                {proposals.map((p, idx) => {
                  const evts = p.document_events ?? [];
                  const openCount = evts.filter((e) => e.event_type === "opened").length;
                  const sectionsViewed = evts.filter((e) => e.event_type === "section_viewed").length;
                  const readMinutes = Math.round(p.total_view_seconds / 60);
                  const statusCfg = PROPOSAL_STATUS_BADGE[p.status];
                  return (
                    <div key={p.id} style={{ borderBottom: idx < proposals.length - 1 ? "1px solid var(--color-slate-100)" : "none", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "10px" }}>
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--color-slate-800)" }}>{p.title}</span>
                            <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "9999px", fontWeight: 600, backgroundColor: statusCfg.bg, color: statusCfg.color }}>
                              {statusCfg.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 flex-wrap">
                            {p.sent_at && (
                              <span style={{ fontSize: "12px", color: "var(--color-slate-500)", display: "flex", alignItems: "center", gap: "4px" }}>
                                <Send size={11} />
                                Sent {new Date(p.sent_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                              </span>
                            )}
                            {p.signed_at && (
                              <span style={{ fontSize: "12px", color: "#166534", display: "flex", alignItems: "center", gap: "4px" }}>
                                <CheckCircle2 size={11} />
                                Signed {new Date(p.signed_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => router.push(`/proposals/${p.id}`)}
                            className="flex items-center gap-1 rounded-lg px-3 py-1.5 transition-colors"
                            style={{ fontSize: "12px", fontWeight: 600, border: "1px solid var(--color-slate-200)", color: "var(--color-navy-800)", backgroundColor: "white", cursor: "pointer" }}
                            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-slate-50)")}
                            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "white")}
                          >
                            <Eye size={12} /> View
                          </button>
                          <button
                            onClick={() => window.open(`/p/${p.id}`, "_blank")}
                            className="flex items-center gap-1 rounded-lg px-3 py-1.5 transition-colors"
                            style={{ fontSize: "12px", fontWeight: 600, border: "1px solid var(--color-slate-200)", color: "var(--color-slate-600)", backgroundColor: "white", cursor: "pointer" }}
                            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-slate-50)")}
                            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "white")}
                          >
                            <ExternalLink size={12} /> Preview
                          </button>
                        </div>
                      </div>
                      {(openCount > 0 || p.total_view_seconds > 0 || sectionsViewed > 0) && (
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px 12px", backgroundColor: "var(--color-slate-50)", borderRadius: "8px", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "12px", color: "var(--color-slate-600)", display: "flex", alignItems: "center", gap: "4px" }}>
                            <Eye size={12} />
                            Opened {openCount} {openCount === 1 ? "time" : "times"}
                          </span>
                          <span style={{ fontSize: "12px", color: "var(--color-slate-400)" }}>&middot;</span>
                          <span style={{ fontSize: "12px", color: "var(--color-slate-600)", display: "flex", alignItems: "center", gap: "4px" }}>
                            <Clock size={12} />
                            {readMinutes} min total read
                          </span>
                          <span style={{ fontSize: "12px", color: "var(--color-slate-400)" }}>&middot;</span>
                          <span style={{ fontSize: "12px", color: "var(--color-slate-600)", display: "flex", alignItems: "center", gap: "4px" }}>
                            <FileText size={12} />
                            {sectionsViewed} {sectionsViewed === 1 ? "section" : "sections"} viewed
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Compliance */}
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "white", border: "1px solid var(--color-slate-200)" }}>
            <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: "1px solid var(--color-slate-200)" }}>
              <ShieldCheck size={16} style={{ color: "var(--color-slate-400)" }} />
              <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-navy-800)" }}>Compliance</span>
            </div>

            {/* KYC Verification */}
            <div className="px-5 py-5" style={{ borderBottom: "1px solid var(--color-slate-100)" }}>
              <div className="flex items-center gap-3 mb-3">
                <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-navy-800)" }}>KYC Verification</span>
                <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "9999px", fontWeight: 600, backgroundColor: kycCfg.bg, color: kycCfg.text }}>
                  {kycCfg.label}
                </span>
                {localContact.kyc_status === "verified" && localContact.kyc_verified_at && (
                  <span style={{ fontSize: "12px", color: "var(--color-slate-400)" }}>
                    Verified on {fmtDate(localContact.kyc_verified_at)}
                  </span>
                )}
              </div>

              {localDocs.length === 0 ? (
                <p style={{ fontSize: "13px", color: "var(--color-slate-400)", marginBottom: "16px" }}>No documents uploaded</p>
              ) : (
                <div className="flex flex-col gap-3 mb-4">
                  {localDocs.map((doc) => (
                    <div key={doc.id} className="rounded-lg p-3 flex items-start gap-3"
                      style={{ border: "1px solid var(--color-slate-200)", backgroundColor: "var(--color-slate-50)" }}>
                      <FileText size={16} style={{ color: "var(--color-slate-400)", marginTop: "1px", flexShrink: 0 }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-slate-800)" }}>
                            {DOC_TYPE_LABELS[doc.document_type]}
                          </span>
                          {expiryBadge(doc.expiry_date)}
                        </div>
                        <p style={{ fontSize: "12px", color: "var(--color-slate-500)", marginBottom: "2px" }}>{doc.file_name}</p>
                        <p style={{ fontSize: "11px", color: "var(--color-slate-400)" }}>
                          Uploaded {fmtDate(doc.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleDownload(doc)}
                          disabled={downloadingDocId === doc.id}
                          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 transition-colors"
                          style={{ fontSize: "12px", border: "1px solid var(--color-slate-200)", color: "var(--color-slate-600)", backgroundColor: "white", cursor: "pointer" }}
                          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-slate-50)")}
                          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "white")}
                        >
                          {downloadingDocId === doc.id ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                        </button>
                        {isAdmin && (
                          deleteConfirmId === doc.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDelete(doc)}
                                disabled={deletingDocId === doc.id}
                                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5"
                                style={{ fontSize: "11px", fontWeight: 600, backgroundColor: "#fee2e2", color: "#b91c1c", border: "1px solid #fca5a5", cursor: "pointer" }}
                              >
                                {deletingDocId === doc.id ? <Loader2 size={10} className="animate-spin" /> : "Confirm"}
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5"
                                style={{ fontSize: "11px", color: "var(--color-slate-500)", border: "1px solid var(--color-slate-200)", backgroundColor: "white", cursor: "pointer" }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(doc.id)}
                              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 transition-colors"
                              style={{ fontSize: "12px", border: "1px solid var(--color-slate-200)", color: "#b91c1c", backgroundColor: "white", cursor: "pointer" }}
                              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "#fee2e2")}
                              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "white")}
                            >
                              <Trash2 size={12} />
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {isAdmin && (
                <>
                  <div className="rounded-lg p-4 mb-4" style={{ border: "1px solid var(--color-slate-200)", backgroundColor: "var(--color-slate-50)" }}>
                    <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-slate-500)", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Upload Document
                    </p>
                    <div className="flex flex-col gap-3">
                      <div className="flex gap-3">
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: "12px", color: "var(--color-slate-500)", display: "block", marginBottom: "4px" }}>Document Type</label>
                          <select
                            value={uploadDocType}
                            onChange={(e) => setUploadDocType(e.target.value as KYCDocument["document_type"])}
                            style={{ width: "100%", padding: "7px 10px", fontSize: "13px", borderRadius: "7px", border: "1px solid var(--color-slate-200)", backgroundColor: "white", color: "var(--color-slate-700)", outline: "none" }}
                          >
                            <option value="passport">Passport</option>
                            <option value="drivers_licence">Driver&apos;s Licence</option>
                            <option value="birth_certificate">Birth Certificate</option>
                            <option value="proof_of_address">Proof of Address</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: "12px", color: "var(--color-slate-500)", display: "block", marginBottom: "4px" }}>Expiry Date</label>
                          <input
                            type="date"
                            value={uploadExpiry}
                            onChange={(e) => setUploadExpiry(e.target.value)}
                            style={{ width: "100%", padding: "7px 10px", fontSize: "13px", borderRadius: "7px", border: "1px solid var(--color-slate-200)", backgroundColor: "white", color: "var(--color-slate-700)", outline: "none" }}
                          />
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: "12px", color: "var(--color-slate-500)", display: "block", marginBottom: "4px" }}>File (PDF, JPG, PNG)</label>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                          style={{ width: "100%", fontSize: "13px", color: "var(--color-slate-700)" }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: "12px", color: "var(--color-slate-500)", display: "block", marginBottom: "4px" }}>Notes (optional)</label>
                        <textarea
                          value={uploadNotes}
                          onChange={(e) => setUploadNotes(e.target.value)}
                          rows={2}
                          style={{ width: "100%", padding: "7px 10px", fontSize: "13px", borderRadius: "7px", border: "1px solid var(--color-slate-200)", backgroundColor: "white", color: "var(--color-slate-700)", outline: "none", resize: "vertical" }}
                        />
                      </div>
                      {uploadError && (
                        <p style={{ fontSize: "12px", color: "#b91c1c" }}>{uploadError}</p>
                      )}
                      <button
                        onClick={handleUpload}
                        disabled={!uploadFile || uploading}
                        className="flex items-center gap-2 rounded-lg px-4 py-2 transition-colors"
                        style={{ fontSize: "13px", fontWeight: 600, backgroundColor: uploadFile && !uploading ? "var(--color-navy-800)" : "var(--color-slate-200)", color: uploadFile && !uploading ? "white" : "var(--color-slate-400)", border: "none", cursor: uploadFile && !uploading ? "pointer" : "not-allowed", alignSelf: "flex-start" }}
                        onMouseEnter={(e) => { if (uploadFile && !uploading) (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-navy-700)"; }}
                        onMouseLeave={(e) => { if (uploadFile && !uploading) (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-navy-800)"; }}
                      >
                        {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                        Upload Document
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: "12px", color: "var(--color-slate-500)" }}>Change KYC Status:</span>
                    <select
                      value={localContact.kyc_status}
                      onChange={(e) => handleKycStatusChange(e.target.value as Contact["kyc_status"])}
                      disabled={kycStatusChanging}
                      style={{ padding: "5px 10px", fontSize: "13px", borderRadius: "7px", border: "1px solid var(--color-slate-200)", backgroundColor: "white", color: "var(--color-slate-700)", outline: "none", cursor: "pointer" }}
                    >
                      <option value="unverified">Unverified</option>
                      <option value="pending">Pending</option>
                      <option value="verified">Verified</option>
                    </select>
                    {kycStatusChanging && <Loader2 size={14} className="animate-spin" style={{ color: "var(--color-slate-400)" }} />}
                  </div>
                </>
              )}
            </div>

            {/* AML Risk Assessment */}
            <div className="px-5 py-5" style={{ borderBottom: "1px solid var(--color-slate-100)" }}>
              <div className="flex items-center gap-3 mb-3">
                <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-navy-800)" }}>AML Risk Assessment</span>
                {localContact.aml_risk_level ? (
                  <>
                    <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "9999px", fontWeight: 600, backgroundColor: AML_RISK_CONFIG[localContact.aml_risk_level].bg, color: AML_RISK_CONFIG[localContact.aml_risk_level].text }}>
                      {AML_RISK_CONFIG[localContact.aml_risk_level].label}
                    </span>
                    {localContact.aml_assessed_at && (
                      <span style={{ fontSize: "12px", color: "var(--color-slate-400)" }}>
                        Assessed {fmtDate(localContact.aml_assessed_at)}
                      </span>
                    )}
                  </>
                ) : (
                  <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "9999px", fontWeight: 500, backgroundColor: "var(--color-slate-100)", color: "var(--color-slate-500)" }}>
                    Not assessed
                  </span>
                )}
                {isAdmin && (
                  <button
                    onClick={() => { setAmlEditOpen((v) => !v); setAmlRiskDraft(localContact.aml_risk_level ?? "low"); setAmlNotesDraft(localContact.aml_notes ?? ""); }}
                    className="ml-auto flex items-center gap-1 rounded-lg px-3 py-1.5 transition-colors"
                    style={{ fontSize: "12px", border: "1px solid var(--color-slate-200)", color: "var(--color-slate-600)", backgroundColor: "white", cursor: "pointer" }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-slate-50)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "white")}
                  >
                    {amlEditOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    {amlEditOpen ? "Close" : "Edit"}
                  </button>
                )}
              </div>

              {localContact.aml_notes && !amlEditOpen && (
                <div className="rounded-lg p-3 mb-3" style={{ backgroundColor: "var(--color-slate-50)", border: "1px solid var(--color-slate-200)" }}>
                  <p style={{ fontSize: "13px", color: "var(--color-slate-600)", lineHeight: 1.5 }}>{localContact.aml_notes}</p>
                </div>
              )}

              {isAdmin && amlEditOpen && (
                <div className="rounded-lg p-4" style={{ border: "1px solid var(--color-slate-200)", backgroundColor: "var(--color-slate-50)" }}>
                  <div className="flex flex-col gap-3">
                    <div>
                      <label style={{ fontSize: "12px", color: "var(--color-slate-500)", display: "block", marginBottom: "4px" }}>Risk Level</label>
                      <select
                        value={amlRiskDraft}
                        onChange={(e) => setAmlRiskDraft(e.target.value as "low" | "medium" | "high")}
                        style={{ padding: "7px 10px", fontSize: "13px", borderRadius: "7px", border: "1px solid var(--color-slate-200)", backgroundColor: "white", color: "var(--color-slate-700)", outline: "none" }}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: "12px", color: "var(--color-slate-500)", display: "block", marginBottom: "4px" }}>Notes</label>
                      <textarea
                        value={amlNotesDraft}
                        onChange={(e) => setAmlNotesDraft(e.target.value)}
                        rows={3}
                        style={{ width: "100%", padding: "7px 10px", fontSize: "13px", borderRadius: "7px", border: "1px solid var(--color-slate-200)", backgroundColor: "white", color: "var(--color-slate-700)", outline: "none", resize: "vertical" }}
                      />
                    </div>
                    <button
                      onClick={handleAmlSave}
                      disabled={amlSaving}
                      className="flex items-center gap-2 rounded-lg px-4 py-2 transition-colors"
                      style={{ fontSize: "13px", fontWeight: 600, backgroundColor: amlSaving ? "var(--color-slate-200)" : "var(--color-navy-800)", color: amlSaving ? "var(--color-slate-400)" : "white", border: "none", cursor: amlSaving ? "not-allowed" : "pointer", alignSelf: "flex-start" }}
                      onMouseEnter={(e) => { if (!amlSaving) (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-navy-700)"; }}
                      onMouseLeave={(e) => { if (!amlSaving) (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-navy-800)"; }}
                    >
                      {amlSaving ? <Loader2 size={14} className="animate-spin" /> : null}
                      Save Assessment
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Compliance Audit Trail */}
            <div className="px-5 py-5">
              <div className="flex items-center gap-2 mb-3">
                <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-navy-800)" }}>Audit Trail</span>
                <a
                  href="/compliance"
                  className="ml-auto flex items-center gap-1 transition-colors"
                  style={{ fontSize: "12px", color: "var(--color-slate-400)" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--color-navy-800)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--color-slate-400)")}
                >
                  View all <ChevronRight size={12} />
                </a>
              </div>
              {localAudit.length === 0 ? (
                <p style={{ fontSize: "13px", color: "var(--color-slate-400)" }}>No audit entries</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {localAudit.slice(0, 10).map((entry) => {
                    const cfg = AUDIT_ACTION_CONFIG[entry.action_type];
                    const actionDesc: Record<ComplianceAuditLog["action_type"], string> = {
                      kyc_document_uploaded: "KYC document uploaded",
                      kyc_document_deleted:  "KYC document deleted",
                      kyc_status_changed:    "KYC status changed",
                      aml_risk_updated:      "AML risk updated",
                    };
                    return (
                      <div key={entry.id} className="flex items-start gap-3">
                        <div style={{ width: "6px", height: "6px", borderRadius: "9999px", backgroundColor: cfg.text, marginTop: "6px", flexShrink: 0 }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span style={{ fontSize: "11px", padding: "1px 7px", borderRadius: "9999px", fontWeight: 600, backgroundColor: cfg.bg, color: cfg.text }}>
                              {cfg.label}
                            </span>
                            <span style={{ fontSize: "12px", color: "var(--color-slate-600)" }}>{actionDesc[entry.action_type]}</span>
                            {entry.performed_by && (
                              <span style={{ fontSize: "12px", color: "var(--color-slate-400)" }}>by {entry.performed_by}</span>
                            )}
                            <span className="ml-auto" style={{ fontSize: "11px", color: "var(--color-slate-400)", whiteSpace: "nowrap" }}>
                              {fmtDateTime(entry.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Communications timeline */}
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "white", border: "1px solid var(--color-slate-200)" }}>
            <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: "1px solid var(--color-slate-200)" }}>
              <TrendingUp size={16} style={{ color: "var(--color-slate-400)" }} />
              <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-navy-800)" }}>Communication History</span>
            </div>
            {communications.length === 0 ? (
              <p style={{ fontSize: "13px", color: "var(--color-slate-400)", textAlign: "center", padding: "32px 0" }}>No communications logged</p>
            ) : (
              <div>
                {communications.map((c, idx) => (
                  <div key={c.id} className="flex gap-4 px-5 py-4"
                    style={{ borderBottom: idx < communications.length - 1 ? "1px solid var(--color-slate-100)" : "none" }}>
                    <div className="flex items-center justify-center rounded-full shrink-0"
                      style={{ width: 32, height: 32, backgroundColor: "var(--color-slate-100)", color: "var(--color-slate-500)" }}>
                      {COMM_ICONS[c.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-slate-700)", textTransform: "capitalize" }}>{c.type}</span>
                        {c.subject && <span style={{ fontSize: "13px", color: "var(--color-slate-500)" }}>— {c.subject}</span>}
                        {(() => {
                          const s = (c as Communication & { sentiment: CommSentiment }).sentiment ?? null;
                          if (!s) return null;
                          const sCfg = SENTIMENT_CONFIG[s];
                          return (
                            <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "999px", fontWeight: 500, backgroundColor: sCfg.bg, color: sCfg.text }}>
                              {sCfg.label}
                            </span>
                          );
                        })()}
                        <span className="ml-auto" style={{ fontSize: "12px", color: "var(--color-slate-400)" }}>
                          {new Date(c.sent_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>
                      {c.body && <p style={{ fontSize: "13px", color: "var(--color-slate-500)", lineHeight: 1.5 }}>{c.body}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoreRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ fontSize: "12px", color: "var(--color-slate-500)" }}>{label}</span>
      <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-navy-800)" }}>+{value}</span>
    </div>
  );
}
