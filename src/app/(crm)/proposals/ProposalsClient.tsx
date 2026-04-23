"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus, Eye, ExternalLink, CheckCircle2, Clock, Send } from "lucide-react";
import type { Proposal } from "@/types/database";

type ProposalWithRelations = Proposal & {
  contacts: { id: string; full_name: string; email: string } | null;
  properties: { id: string; address: string; suburb: string } | null;
};

type Props = {
  proposals: ProposalWithRelations[];
  events: { proposal_id: string; event_type: string }[];
};

type StatusFilter = "all" | "draft" | "sent" | "opened" | "signed" | "declined";

const STATUS_BADGE: Record<
  Proposal["status"],
  { bg: string; color: string; label: string }
> = {
  draft: { bg: "var(--color-slate-100, #f1f5f9)", color: "var(--color-slate-600, #475569)", label: "Draft" },
  sent: { bg: "#dbeafe", color: "#1d4ed8", label: "Sent" },
  opened: { bg: "#fef9c3", color: "#b45309", label: "Opened" },
  signed: { bg: "#dcfce7", color: "#166534", label: "Signed" },
  declined: { bg: "#fee2e2", color: "#b91c1c", label: "Declined" },
};

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: Proposal["status"] }) {
  const cfg = STATUS_BADGE[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 10px",
        borderRadius: "9999px",
        fontSize: "12px",
        fontWeight: 600,
        backgroundColor: cfg.bg,
        color: cfg.color,
      }}
    >
      {cfg.label}
    </span>
  );
}

export default function ProposalsClient({ proposals, events }: Props) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  const eventsByProposal = events.reduce<Record<string, string[]>>((acc, e) => {
    if (!acc[e.proposal_id]) acc[e.proposal_id] = [];
    acc[e.proposal_id].push(e.event_type);
    return acc;
  }, {});

  const filtered = proposals.filter((p) => {
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      p.title.toLowerCase().includes(q) ||
      (p.contacts?.full_name ?? "").toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const totalCount = proposals.length;
  const sentOpenedCount = proposals.filter((p) => p.status === "sent" || p.status === "opened").length;
  const signedCount = proposals.filter((p) => p.status === "signed").length;
  const draftCount = proposals.filter((p) => p.status === "draft").length;

  const filterTabs: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "draft", label: "Draft" },
    { key: "sent", label: "Sent" },
    { key: "opened", label: "Opened" },
    { key: "signed", label: "Signed" },
    { key: "declined", label: "Declined" },
  ];

  return (
    <div style={{ padding: "32px", maxWidth: "1100px", margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "28px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              backgroundColor: "var(--color-navy-800)",
            }}
          >
            <FileText size={20} color="white" />
          </div>
          <div>
            <h1
              style={{
                fontSize: "22px",
                fontWeight: 700,
                color: "var(--color-navy-800)",
                margin: 0,
              }}
            >
              Proposals
            </h1>
            <p
              style={{
                fontSize: "13px",
                color: "var(--color-slate-500, #64748b)",
                margin: 0,
              }}
            >
              Pre-listing kits and digital proposals
            </p>
          </div>
        </div>
        <button
          onClick={() => router.push("/proposals/new")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 18px",
            borderRadius: "8px",
            backgroundColor: "var(--color-navy-800)",
            color: "white",
            fontWeight: 600,
            fontSize: "14px",
            border: "none",
            cursor: "pointer",
          }}
        >
          <Plus size={16} />
          New Proposal
        </button>
      </div>

      {/* Stats bar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "16px",
          marginBottom: "28px",
        }}
      >
        {[
          {
            label: "Total Proposals",
            value: totalCount,
            icon: <FileText size={18} color="var(--color-navy-800)" />,
            accent: "var(--color-navy-800)",
          },
          {
            label: "Sent / Opened",
            value: sentOpenedCount,
            icon: <Send size={18} color="#1d4ed8" />,
            accent: "#1d4ed8",
          },
          {
            label: "Signed",
            value: signedCount,
            icon: <CheckCircle2 size={18} color="#166534" />,
            accent: "#166534",
          },
          {
            label: "Drafts",
            value: draftCount,
            icon: <Clock size={18} color="var(--color-slate-500, #64748b)" />,
            accent: "var(--color-slate-500, #64748b)",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              border: "1px solid var(--color-slate-200, #e2e8f0)",
              padding: "18px 20px",
              display: "flex",
              alignItems: "center",
              gap: "14px",
            }}
          >
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "8px",
                backgroundColor: "var(--color-slate-50, #f8fafc)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {stat.icon}
            </div>
            <div>
              <div
                style={{
                  fontSize: "22px",
                  fontWeight: 700,
                  color: stat.accent,
                  lineHeight: 1.1,
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "var(--color-slate-500, #64748b)",
                  marginTop: "2px",
                }}
              >
                {stat.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs + search */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: "4px" }}>
          {filterTabs.map((tab) => {
            const active = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                style={{
                  padding: "7px 16px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: active ? 600 : 500,
                  border: active
                    ? "1px solid var(--color-navy-800)"
                    : "1px solid transparent",
                  backgroundColor: active ? "var(--color-navy-800)" : "transparent",
                  color: active ? "white" : "var(--color-slate-600, #475569)",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <input
          type="text"
          placeholder="Search proposals or contacts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: "8px 14px",
            borderRadius: "8px",
            border: "1px solid var(--color-slate-200, #e2e8f0)",
            fontSize: "13px",
            color: "var(--color-navy-800)",
            outline: "none",
            width: "240px",
            backgroundColor: "white",
          }}
        />
      </div>

      {/* Proposal cards */}
      {filtered.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "80px 24px",
            backgroundColor: "white",
            borderRadius: "16px",
            border: "1px solid var(--color-slate-200, #e2e8f0)",
            gap: "16px",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "12px",
              backgroundColor: "var(--color-slate-100, #f1f5f9)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FileText size={28} color="var(--color-slate-400, #94a3b8)" />
          </div>
          <div style={{ textAlign: "center" }}>
            <p
              style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "var(--color-navy-800)",
                margin: "0 0 6px",
              }}
            >
              No proposals yet
            </p>
            <p
              style={{
                fontSize: "13px",
                color: "var(--color-slate-500, #64748b)",
                margin: 0,
              }}
            >
              No proposals yet — create your first pre-listing kit
            </p>
          </div>
          <button
            onClick={() => router.push("/proposals/new")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              borderRadius: "8px",
              backgroundColor: "var(--color-navy-800)",
              color: "white",
              fontWeight: 600,
              fontSize: "14px",
              border: "none",
              cursor: "pointer",
              marginTop: "4px",
            }}
          >
            <Plus size={16} />
            Create Proposal
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {filtered.map((proposal) => {
            const evts = eventsByProposal[proposal.id] ?? [];
            const openCount = evts.filter((e) => e === "opened").length;
            const sectionsViewed = evts.filter((e) => e === "section_viewed").length;
            const readMinutes = Math.round(proposal.total_view_seconds / 60);

            return (
              <div
                key={proposal.id}
                style={{
                  backgroundColor: "white",
                  borderRadius: "12px",
                  border: "1px solid var(--color-slate-200, #e2e8f0)",
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {/* Top row: title + badge */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "12px",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <a
                      href={`/proposals/${proposal.id}`}
                      style={{
                        fontSize: "15px",
                        fontWeight: 700,
                        color: "var(--color-navy-800)",
                        textDecoration: "none",
                        display: "block",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {proposal.title}
                    </a>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginTop: "4px",
                        flexWrap: "wrap",
                      }}
                    >
                      {proposal.contacts && (
                        <span
                          style={{
                            fontSize: "13px",
                            color: "var(--color-slate-600, #475569)",
                          }}
                        >
                          {proposal.contacts.full_name}
                        </span>
                      )}
                      {proposal.contacts && proposal.properties && (
                        <span
                          style={{
                            fontSize: "13px",
                            color: "var(--color-slate-400, #94a3b8)",
                          }}
                        >
                          &middot;
                        </span>
                      )}
                      {proposal.properties && (
                        <span
                          style={{
                            fontSize: "13px",
                            color: "var(--color-slate-500, #64748b)",
                          }}
                        >
                          {proposal.properties.address}, {proposal.properties.suburb}
                        </span>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={proposal.status} />
                </div>

                {/* Engagement metrics */}
                {(openCount > 0 || proposal.total_view_seconds > 0 || sectionsViewed > 0) && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "16px",
                      padding: "10px 14px",
                      backgroundColor: "var(--color-slate-50, #f8fafc)",
                      borderRadius: "8px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "12px",
                        color: "var(--color-slate-600, #475569)",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                    >
                      <Eye size={13} />
                      Opened {openCount} {openCount === 1 ? "time" : "times"}
                    </span>
                    <span
                      style={{
                        fontSize: "12px",
                        color: "var(--color-slate-400, #94a3b8)",
                      }}
                    >
                      &middot;
                    </span>
                    <span
                      style={{
                        fontSize: "12px",
                        color: "var(--color-slate-600, #475569)",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                    >
                      <Clock size={13} />
                      {readMinutes} min read
                    </span>
                    <span
                      style={{
                        fontSize: "12px",
                        color: "var(--color-slate-400, #94a3b8)",
                      }}
                    >
                      &middot;
                    </span>
                    <span
                      style={{
                        fontSize: "12px",
                        color: "var(--color-slate-600, #475569)",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                    >
                      <FileText size={13} />
                      {sectionsViewed} {sectionsViewed === 1 ? "section" : "sections"} viewed
                    </span>
                  </div>
                )}

                {/* Dates row */}
                {(proposal.sent_at || proposal.signed_at) && (
                  <div
                    style={{
                      display: "flex",
                      gap: "20px",
                      flexWrap: "wrap",
                    }}
                  >
                    {proposal.sent_at && (
                      <span
                        style={{
                          fontSize: "12px",
                          color: "var(--color-slate-500, #64748b)",
                          display: "flex",
                          alignItems: "center",
                          gap: "5px",
                        }}
                      >
                        <Send size={12} />
                        Sent {formatDate(proposal.sent_at)}
                      </span>
                    )}
                    {proposal.signed_at && (
                      <span
                        style={{
                          fontSize: "12px",
                          color: "#166534",
                          display: "flex",
                          alignItems: "center",
                          gap: "5px",
                        }}
                      >
                        <CheckCircle2 size={12} />
                        Signed {formatDate(proposal.signed_at)}
                      </span>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    paddingTop: "4px",
                    borderTop: "1px solid var(--color-slate-100, #f1f5f9)",
                  }}
                >
                  <button
                    onClick={() => router.push(`/proposals/${proposal.id}`)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "7px 14px",
                      borderRadius: "7px",
                      fontSize: "13px",
                      fontWeight: 600,
                      border: "1px solid var(--color-slate-200, #e2e8f0)",
                      backgroundColor: "white",
                      color: "var(--color-navy-800)",
                      cursor: "pointer",
                    }}
                  >
                    <Eye size={14} />
                    View
                  </button>
                  <button
                    onClick={() =>
                      window.open(`/p/${proposal.id}`, "_blank")
                    }
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "7px 14px",
                      borderRadius: "7px",
                      fontSize: "13px",
                      fontWeight: 600,
                      border: "1px solid var(--color-slate-200, #e2e8f0)",
                      backgroundColor: "white",
                      color: "var(--color-slate-600, #475569)",
                      cursor: "pointer",
                    }}
                  >
                    <ExternalLink size={14} />
                    Preview
                  </button>
                  {proposal.status === "draft" && (
                    <button
                      onClick={() => router.push(`/proposals/${proposal.id}`)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "7px 14px",
                        borderRadius: "7px",
                        fontSize: "13px",
                        fontWeight: 600,
                        border: "none",
                        backgroundColor: "var(--color-gold-500)",
                        color: "white",
                        cursor: "pointer",
                      }}
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
