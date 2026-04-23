"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { KYCDocument, ComplianceAuditLog } from "@/types/database";

type ContactCompliance = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  type: string;
  kyc_status: "unverified" | "pending" | "verified";
  kyc_verified_at: string | null;
  aml_risk_level: "low" | "medium" | "high" | null;
  aml_assessed_at: string | null;
};

type AuditEntry = ComplianceAuditLog & { users: { full_name: string } | null };

type Props = {
  contacts: ContactCompliance[];
  documents: KYCDocument[];
  auditLog: AuditEntry[];
  currentUserRole: string;
};

const CARD_STYLE: React.CSSProperties = {
  backgroundColor: "white",
  border: "1px solid var(--color-slate-200)",
  borderRadius: "12px",
  padding: "20px",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
  const time = d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase();
  return `${date} at ${time}`;
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function docTypeLabel(t: KYCDocument["document_type"]): string {
  const map: Record<KYCDocument["document_type"], string> = {
    passport: "Passport",
    drivers_licence: "Driver's Licence",
    birth_certificate: "Birth Certificate",
    proof_of_address: "Proof of Address",
    other: "Other",
  };
  return map[t];
}

function KycBadge({ status }: { status: ContactCompliance["kyc_status"] }) {
  const styles: Record<ContactCompliance["kyc_status"], React.CSSProperties> = {
    unverified: { backgroundColor: "#fee2e2", color: "#b91c1c", padding: "2px 8px", borderRadius: "9999px", fontSize: "12px", fontWeight: 600 },
    pending: { backgroundColor: "#fef3c7", color: "#b45309", padding: "2px 8px", borderRadius: "9999px", fontSize: "12px", fontWeight: 600 },
    verified: { backgroundColor: "#dcfce7", color: "#15803d", padding: "2px 8px", borderRadius: "9999px", fontSize: "12px", fontWeight: 600 },
  };
  return <span style={styles[status]}>{capitalise(status)}</span>;
}

function AmlBadge({ level }: { level: "low" | "medium" | "high" | null }) {
  if (!level) return null;
  const styles: Record<"low" | "medium" | "high", React.CSSProperties> = {
    low: { backgroundColor: "#dcfce7", color: "#15803d", padding: "2px 8px", borderRadius: "9999px", fontSize: "12px", fontWeight: 600 },
    medium: { backgroundColor: "#fef3c7", color: "#b45309", padding: "2px 8px", borderRadius: "9999px", fontSize: "12px", fontWeight: 600 },
    high: { backgroundColor: "#fee2e2", color: "#b91c1c", padding: "2px 8px", borderRadius: "9999px", fontSize: "12px", fontWeight: 600 },
  };
  return <span style={styles[level]}>AML: {capitalise(level)}</span>;
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span style={{
      backgroundColor: "var(--color-slate-100)",
      color: "var(--color-slate-600)",
      padding: "2px 8px",
      borderRadius: "9999px",
      fontSize: "12px",
      fontWeight: 500,
      textTransform: "capitalize",
    }}>
      {type}
    </span>
  );
}

function ActionBadge({ action }: { action: ComplianceAuditLog["action_type"] }) {
  const map: Record<ComplianceAuditLog["action_type"], { label: string; style: React.CSSProperties }> = {
    kyc_document_uploaded: {
      label: "Document Uploaded",
      style: { backgroundColor: "#dbeafe", color: "#1d4ed8" },
    },
    kyc_document_deleted: {
      label: "Document Deleted",
      style: { backgroundColor: "#fee2e2", color: "#b91c1c" },
    },
    kyc_status_changed: {
      label: "KYC Status Changed",
      style: { backgroundColor: "#dcfce7", color: "#15803d" },
    },
    aml_risk_updated: {
      label: "AML Risk Updated",
      style: { backgroundColor: "#fef3c7", color: "#b45309" },
    },
  };
  const { label, style } = map[action];
  return (
    <span style={{
      ...style,
      padding: "2px 8px",
      borderRadius: "9999px",
      fontSize: "12px",
      fontWeight: 600,
    }}>
      {label}
    </span>
  );
}

function getExpiryStyle(expiryDate: string | null): React.CSSProperties {
  if (!expiryDate) return {};
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { backgroundColor: "#fee2e2", color: "#b91c1c" };
  if (diffDays <= 30) return { backgroundColor: "#fef9c3", color: "#b45309" };
  if (diffDays <= 60) return { backgroundColor: "#fff7ed", color: "#c2410c" };
  return {};
}

function jsonValueToString(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  return JSON.stringify(val);
}

export default function ComplianceClient({ contacts, documents, auditLog, currentUserRole }: Props) {
  const [activeTab, setActiveTab] = useState<"overview" | "audit">("overview");

  const docsByContact = useMemo(() => {
    const map = new Map<string, KYCDocument[]>();
    for (const doc of documents) {
      const existing = map.get(doc.contact_id) ?? [];
      map.set(doc.contact_id, [...existing, doc]);
    }
    return map;
  }, [documents]);

  const contactById = useMemo(() => {
    const map = new Map<string, ContactCompliance>();
    for (const c of contacts) map.set(c.id, c);
    return map;
  }, [contacts]);

  const unverified = contacts.filter((c) => c.kyc_status === "unverified");
  const pending = contacts.filter((c) => c.kyc_status === "pending");
  const verified = contacts.filter((c) => c.kyc_status === "verified");
  const highRisk = contacts.filter((c) => c.aml_risk_level === "high");
  const mediumRisk = contacts.filter((c) => c.aml_risk_level === "medium");
  const lowRisk = contacts.filter((c) => c.aml_risk_level === "low");

  const now = new Date();

  const expiringDocuments = useMemo(() => {
    return documents.filter((doc) => {
      if (!doc.expiry_date || doc.status !== "active") return false;
      const expiry = new Date(doc.expiry_date);
      const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 60;
    });
  }, [documents]);

  const expiredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      if (!doc.expiry_date) return false;
      const expiry = new Date(doc.expiry_date);
      return expiry.getTime() < now.getTime() && doc.status === "active";
    });
  }, [documents]);

  const tabs: { id: "overview" | "audit"; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "audit", label: "Audit Trail" },
  ];

  return (
    <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700, color: "var(--color-navy-800)", margin: 0 }}>
          Compliance
        </h1>
        <p style={{ fontSize: "14px", color: "var(--color-slate-500)", marginTop: "4px" }}>
          AML/KYC compliance management for all contacts
        </p>
      </div>

      <div style={{
        display: "flex",
        gap: "6px",
        padding: "6px",
        backgroundColor: "white",
        border: "1px solid var(--color-slate-200)",
        borderRadius: "12px",
        marginBottom: "24px",
        width: "fit-content",
      }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "8px 20px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: 500,
                backgroundColor: isActive ? "var(--color-navy-800)" : "transparent",
                color: isActive ? "white" : "var(--color-slate-600)",
                transition: "all 0.15s",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "overview" && (
        <OverviewTab
          contacts={contacts}
          unverified={unverified}
          pending={pending}
          verified={verified}
          highRisk={highRisk}
          mediumRisk={mediumRisk}
          lowRisk={lowRisk}
          docsByContact={docsByContact}
          expiringDocuments={expiringDocuments}
          expiredDocuments={expiredDocuments}
          contactById={contactById}
          currentUserRole={currentUserRole}
        />
      )}

      {activeTab === "audit" && (
        <AuditTrailTab auditLog={auditLog} contactById={contactById} />
      )}
    </div>
  );
}

type OverviewTabProps = {
  contacts: ContactCompliance[];
  unverified: ContactCompliance[];
  pending: ContactCompliance[];
  verified: ContactCompliance[];
  highRisk: ContactCompliance[];
  mediumRisk: ContactCompliance[];
  lowRisk: ContactCompliance[];
  docsByContact: Map<string, KYCDocument[]>;
  expiringDocuments: KYCDocument[];
  expiredDocuments: KYCDocument[];
  contactById: Map<string, ContactCompliance>;
  currentUserRole: string;
};

function OverviewTab({
  unverified,
  pending,
  verified,
  highRisk,
  mediumRisk,
  lowRisk,
  docsByContact,
  expiringDocuments,
  expiredDocuments,
  contactById,
}: OverviewTabProps) {
  const statCards: { label: string; value: number; color: string; bg: string }[] = [
    { label: "Unverified", value: unverified.length, color: "#b91c1c", bg: "#fee2e2" },
    { label: "Pending Verification", value: pending.length, color: "#b45309", bg: "#fef3c7" },
    { label: "Verified", value: verified.length, color: "#15803d", bg: "#dcfce7" },
    { label: "High AML Risk", value: highRisk.length, color: "#b91c1c", bg: "#fee2e2" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
        {statCards.map((card) => (
          <div key={card.label} style={CARD_STYLE}>
            <div style={{ fontSize: "13px", color: "var(--color-slate-500)", marginBottom: "8px", fontWeight: 500 }}>
              {card.label}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{
                fontSize: "32px",
                fontWeight: 700,
                color: "var(--color-navy-800)",
                lineHeight: 1,
              }}>
                {card.value}
              </span>
              <span style={{
                backgroundColor: card.bg,
                color: card.color,
                padding: "4px 10px",
                borderRadius: "9999px",
                fontSize: "12px",
                fontWeight: 600,
              }}>
                {card.value === 1 ? "contact" : "contacts"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {(expiringDocuments.length > 0 || expiredDocuments.length > 0) && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {expiredDocuments.length > 0 && (
            <div style={{
              ...CARD_STYLE,
              backgroundColor: "#fee2e2",
              border: "1px solid #fca5a5",
            }}>
              <div style={{ fontWeight: 600, color: "#b91c1c", fontSize: "14px", marginBottom: "12px" }}>
                {expiredDocuments.length} document{expiredDocuments.length !== 1 ? "s" : ""} already expired
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {expiredDocuments.map((doc) => {
                  const contact = contactById.get(doc.contact_id);
                  return (
                    <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "13px" }}>
                      <span style={{ fontWeight: 600, color: "#991b1b" }}>{contact?.full_name ?? "Unknown"}</span>
                      <span style={{ color: "#b91c1c" }}>—</span>
                      <span style={{ color: "#b91c1c" }}>{docTypeLabel(doc.document_type)}</span>
                      <span style={{ color: "#b91c1c" }}>— expired {doc.expiry_date ? formatDate(doc.expiry_date) : "—"}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {expiringDocuments.length > 0 && (
            <div style={{
              ...CARD_STYLE,
              backgroundColor: "#fef3c7",
              border: "1px solid #fcd34d",
            }}>
              <div style={{ fontWeight: 600, color: "#b45309", fontSize: "14px", marginBottom: "12px" }}>
                {expiringDocuments.length} document{expiringDocuments.length !== 1 ? "s" : ""} expiring within 60 days
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {expiringDocuments.map((doc) => {
                  const contact = contactById.get(doc.contact_id);
                  const expiryStyle = getExpiryStyle(doc.expiry_date);
                  return (
                    <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "13px" }}>
                      <span style={{ fontWeight: 600, color: "#92400e" }}>{contact?.full_name ?? "Unknown"}</span>
                      <span style={{ color: "#b45309" }}>—</span>
                      <span style={{ color: "#b45309" }}>{docTypeLabel(doc.document_type)}</span>
                      <span style={{ ...expiryStyle, padding: "2px 8px", borderRadius: "9999px", fontWeight: 600 }}>
                        Expires {doc.expiry_date ? formatDate(doc.expiry_date) : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <div style={CARD_STYLE}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 700, color: "var(--color-navy-800)", margin: 0 }}>
            Needs Verification
          </h2>
          <span style={{
            backgroundColor: "#fee2e2",
            color: "#b91c1c",
            padding: "2px 10px",
            borderRadius: "9999px",
            fontSize: "12px",
            fontWeight: 700,
          }}>
            {unverified.length}
          </span>
        </div>
        {unverified.length === 0 ? (
          <p style={{ fontSize: "14px", color: "var(--color-slate-400)", margin: 0 }}>No contacts needing verification.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {unverified.map((contact) => (
              <Link
                key={contact.id}
                href={`/contacts/${contact.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  border: "1px solid var(--color-slate-200)",
                  backgroundColor: "var(--color-slate-50)",
                  textDecoration: "none",
                  transition: "border-color 0.15s",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-navy-800)" }}>
                      {contact.full_name}
                    </span>
                    <TypeBadge type={contact.type} />
                    {contact.aml_risk_level && <AmlBadge level={contact.aml_risk_level} />}
                  </div>
                  {contact.email && (
                    <div style={{ fontSize: "12px", color: "var(--color-slate-500)", marginTop: "2px" }}>
                      {contact.email}
                    </div>
                  )}
                </div>
                <span style={{
                  fontSize: "12px",
                  color: "var(--color-slate-400)",
                  backgroundColor: "var(--color-slate-100)",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  whiteSpace: "nowrap",
                }}>
                  No documents uploaded
                </span>
                <KycBadge status="unverified" />
              </Link>
            ))}
          </div>
        )}
      </div>

      <div style={CARD_STYLE}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 700, color: "var(--color-navy-800)", margin: 0 }}>
            Pending Review
          </h2>
          <span style={{
            backgroundColor: "#fef3c7",
            color: "#b45309",
            padding: "2px 10px",
            borderRadius: "9999px",
            fontSize: "12px",
            fontWeight: 700,
          }}>
            {pending.length}
          </span>
        </div>
        {pending.length === 0 ? (
          <p style={{ fontSize: "14px", color: "var(--color-slate-400)", margin: 0 }}>No contacts pending review.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {pending.map((contact) => {
              const docs = docsByContact.get(contact.id) ?? [];
              return (
                <Link
                  key={contact.id}
                  href={`/contacts/${contact.id}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    border: "1px solid var(--color-slate-200)",
                    backgroundColor: "var(--color-slate-50)",
                    textDecoration: "none",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-navy-800)" }}>
                        {contact.full_name}
                      </span>
                      <TypeBadge type={contact.type} />
                    </div>
                  </div>
                  <span style={{
                    fontSize: "12px",
                    color: "var(--color-slate-500)",
                    whiteSpace: "nowrap",
                  }}>
                    {docs.length} document{docs.length !== 1 ? "s" : ""} uploaded
                  </span>
                  <KycBadge status="pending" />
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div style={CARD_STYLE}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 700, color: "var(--color-navy-800)", margin: 0 }}>
            Verified
          </h2>
          <span style={{
            backgroundColor: "#dcfce7",
            color: "#15803d",
            padding: "2px 10px",
            borderRadius: "9999px",
            fontSize: "12px",
            fontWeight: 700,
          }}>
            {verified.length}
          </span>
        </div>
        {verified.length === 0 ? (
          <p style={{ fontSize: "14px", color: "var(--color-slate-400)", margin: 0 }}>No verified contacts yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {verified.map((contact) => {
              const docs = docsByContact.get(contact.id) ?? [];
              return (
                <Link
                  key={contact.id}
                  href={`/contacts/${contact.id}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    border: "1px solid var(--color-slate-200)",
                    backgroundColor: "var(--color-slate-50)",
                    textDecoration: "none",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-navy-800)" }}>
                        {contact.full_name}
                      </span>
                      <TypeBadge type={contact.type} />
                      {contact.aml_risk_level && <AmlBadge level={contact.aml_risk_level} />}
                    </div>
                    {contact.kyc_verified_at && (
                      <div style={{ fontSize: "12px", color: "var(--color-slate-500)", marginTop: "2px" }}>
                        Verified {formatDate(contact.kyc_verified_at)}
                      </div>
                    )}
                  </div>
                  <span style={{
                    fontSize: "12px",
                    color: "var(--color-slate-500)",
                    whiteSpace: "nowrap",
                  }}>
                    {docs.length} document{docs.length !== 1 ? "s" : ""}
                  </span>
                  <KycBadge status="verified" />
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {(highRisk.length > 0 || mediumRisk.length > 0 || lowRisk.length > 0) && (
        <div style={CARD_STYLE}>
          <h2 style={{ fontSize: "16px", fontWeight: 700, color: "var(--color-navy-800)", margin: 0, marginBottom: "20px" }}>
            AML Risk Assessment
          </h2>

          {highRisk.length > 0 && (
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#b91c1c", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                High Risk — {highRisk.length}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {highRisk.map((contact) => (
                  <AmlContactRow key={contact.id} contact={contact} />
                ))}
              </div>
            </div>
          )}

          {mediumRisk.length > 0 && (
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#b45309", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Medium Risk — {mediumRisk.length}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {mediumRisk.map((contact) => (
                  <AmlContactRow key={contact.id} contact={contact} />
                ))}
              </div>
            </div>
          )}

          {lowRisk.length > 0 && (
            <div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#15803d", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Low Risk — {lowRisk.length}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {lowRisk.map((contact) => (
                  <AmlContactRow key={contact.id} contact={contact} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AmlContactRow({ contact }: { contact: ContactCompliance }) {
  return (
    <Link
      href={`/contacts/${contact.id}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "10px 14px",
        borderRadius: "8px",
        border: "1px solid var(--color-slate-200)",
        backgroundColor: "var(--color-slate-50)",
        textDecoration: "none",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-navy-800)" }}>
            {contact.full_name}
          </span>
          <TypeBadge type={contact.type} />
        </div>
        {contact.aml_assessed_at && (
          <div style={{ fontSize: "12px", color: "var(--color-slate-500)", marginTop: "2px" }}>
            Assessed {formatDate(contact.aml_assessed_at)}
          </div>
        )}
      </div>
      {contact.aml_risk_level && <AmlBadge level={contact.aml_risk_level} />}
    </Link>
  );
}

type AuditTrailTabProps = {
  auditLog: AuditEntry[];
  contactById: Map<string, ContactCompliance>;
};

function AuditTrailTab({ auditLog, contactById }: AuditTrailTabProps) {
  return (
    <div style={CARD_STYLE}>
      <h2 style={{ fontSize: "16px", fontWeight: 700, color: "var(--color-navy-800)", margin: 0, marginBottom: "20px" }}>
        Compliance Audit Trail
      </h2>
      {auditLog.length === 0 ? (
        <p style={{ fontSize: "14px", color: "var(--color-slate-400)", margin: 0 }}>No audit events recorded yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {auditLog.map((entry, index) => {
            const contact = entry.contact_id ? contactById.get(entry.contact_id) : null;
            const prevStr = jsonValueToString(entry.previous_value);
            const newStr = jsonValueToString(entry.new_value);
            const isLast = index === auditLog.length - 1;
            return (
              <div
                key={entry.id}
                style={{
                  display: "flex",
                  gap: "16px",
                  paddingBottom: isLast ? "0" : "20px",
                  position: "relative",
                }}
              >
                {!isLast && (
                  <div style={{
                    position: "absolute",
                    left: "15px",
                    top: "30px",
                    bottom: "0",
                    width: "2px",
                    backgroundColor: "var(--color-slate-100)",
                  }} />
                )}
                <div style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "9999px",
                  backgroundColor: "var(--color-slate-100)",
                  border: "2px solid white",
                  flexShrink: 0,
                  zIndex: 1,
                }} />
                <div style={{ flex: 1, minWidth: 0, paddingTop: "4px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                    <ActionBadge action={entry.action_type} />
                    {contact && (
                      <Link
                        href={`/contacts/${contact.id}`}
                        style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-navy-800)", textDecoration: "none" }}
                      >
                        {contact.full_name}
                      </Link>
                    )}
                    {entry.users && (
                      <span style={{ fontSize: "13px", color: "var(--color-slate-500)" }}>
                        by {entry.users.full_name}
                      </span>
                    )}
                  </div>
                  {(prevStr !== "—" || newStr !== "—") && (
                    <div style={{ fontSize: "13px", color: "var(--color-slate-600)", marginBottom: "4px" }}>
                      <span style={{ color: "var(--color-slate-400)" }}>{prevStr}</span>
                      <span style={{ margin: "0 6px", color: "var(--color-slate-400)" }}>→</span>
                      <span style={{ fontWeight: 600, color: "var(--color-navy-800)" }}>{newStr}</span>
                    </div>
                  )}
                  {entry.notes && (
                    <div style={{ fontSize: "12px", color: "var(--color-slate-500)", marginBottom: "4px" }}>
                      {entry.notes}
                    </div>
                  )}
                  <div style={{ fontSize: "12px", color: "var(--color-slate-400)" }}>
                    {formatDateTime(entry.created_at)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
