"use client";

import { useMemo } from "react";
import type { ReportData } from "@/app/(crm)/reports/types";
import { downloadCSV } from "@/app/(crm)/reports/utils/exportCSV";
import { downloadPDF } from "@/app/(crm)/reports/utils/exportPDF";

type Props = {
  data: ReportData;
};

function fmtDollar(n: number): string {
  return `$${n.toLocaleString("en-AU")}`;
}

function conversionColor(rate: number): string {
  if (rate >= 50) return "#15803d";
  if (rate >= 20) return "#b45309";
  return "#b91c1c";
}

function conversionBg(rate: number): string {
  if (rate >= 50) return "#dcfce7";
  if (rate >= 20) return "#fef3c7";
  return "#fee2e2";
}

export default function AgentPerformance({ data }: Props) {
  const { agents, listings, appraisals, commissions } = data;

  const rows = useMemo(() => {
    return agents.map((agent) => {
      const agentAppraisals = appraisals.filter((a) => a.appraised_by === agent.id);
      const agentListings = listings.filter((l) => l.listed_by === agent.id);

      const totalAppraisals = agentAppraisals.length;
      const totalListings = agentListings.length;

      const avgDOM =
        agentListings.length > 0
          ? Math.round(
              agentListings.reduce(
                (sum, l) =>
                  sum + Math.floor((Date.now() - new Date(l.list_date).getTime()) / 86400000),
                0
              ) / agentListings.length
            )
          : 0;

      const conversionRate =
        totalAppraisals > 0 ? (totalListings / totalAppraisals) * 100 : null;

      const totalCommissionPaid = commissions
        .filter((c) => c.agent_id === agent.id && c.status === "paid")
        .reduce((sum, c) => sum + (c.actual_amount ?? 0), 0);

      return {
        id: agent.id,
        name: agent.full_name,
        role: agent.role,
        totalAppraisals,
        totalListings,
        avgDOM,
        conversionRate,
        totalCommissionPaid,
      };
    });
  }, [agents, listings, appraisals, commissions]);

  const CSV_HEADERS = [
    "Agent",
    "Appraisals",
    "Listings",
    "Avg DOM",
    "Conversion Rate",
    "Commission Earned",
  ];

  function buildRows(): (string | number | null | undefined)[][] {
    return rows.map((r) => [
      r.name,
      r.totalAppraisals,
      r.totalListings,
      r.avgDOM,
      r.conversionRate != null ? `${r.conversionRate.toFixed(1)}%` : "—",
      r.totalCommissionPaid,
    ]);
  }

  function handleExportCSV() {
    downloadCSV("agent-performance.csv", CSV_HEADERS, buildRows());
  }

  function handleExportPDF() {
    downloadPDF(
      "Agent Performance Report",
      "agent-performance.pdf",
      CSV_HEADERS,
      buildRows()
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginBottom: "16px" }}>
        <button
          onClick={handleExportPDF}
          style={{
            padding: "8px 16px",
            borderRadius: "8px",
            border: "1px solid var(--color-slate-200)",
            backgroundColor: "white",
            color: "var(--color-slate-700)",
            fontSize: "13px",
            fontWeight: 500,
            cursor: "pointer",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-slate-50)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.backgroundColor = "white")
          }
        >
          Export PDF
        </button>
        <button
          onClick={handleExportCSV}
          style={{
            padding: "8px 16px",
            borderRadius: "8px",
            border: "1px solid var(--color-slate-200)",
            backgroundColor: "white",
            color: "var(--color-slate-700)",
            fontSize: "13px",
            fontWeight: 500,
            cursor: "pointer",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-slate-50)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.backgroundColor = "white")
          }
        >
          Export CSV
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
                Agent
              </th>
              <th
                style={{
                  textAlign: "right",
                  padding: "12px 16px",
                  fontWeight: 600,
                  color: "var(--color-slate-700)",
                }}
              >
                Appraisals
              </th>
              <th
                style={{
                  textAlign: "right",
                  padding: "12px 16px",
                  fontWeight: 600,
                  color: "var(--color-slate-700)",
                }}
              >
                Listings
              </th>
              <th
                style={{
                  textAlign: "right",
                  padding: "12px 16px",
                  fontWeight: 600,
                  color: "var(--color-slate-700)",
                }}
              >
                Avg DOM
              </th>
              <th
                style={{
                  textAlign: "right",
                  padding: "12px 16px",
                  fontWeight: 600,
                  color: "var(--color-slate-700)",
                }}
              >
                Conversion Rate
              </th>
              <th
                style={{
                  textAlign: "right",
                  padding: "12px 16px",
                  fontWeight: 600,
                  color: "var(--color-slate-700)",
                }}
              >
                Commission Earned
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    textAlign: "center",
                    padding: "48px 16px",
                    color: "var(--color-slate-400)",
                  }}
                >
                  No agents found.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  style={{ borderBottom: "1px solid var(--color-slate-100)" }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.backgroundColor =
                      "var(--color-slate-50)")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.backgroundColor = "transparent")
                  }
                >
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ fontWeight: 500, color: "var(--color-slate-900)" }}>
                      {row.name}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "var(--color-slate-400)",
                        marginTop: "2px",
                        textTransform: "capitalize",
                      }}
                    >
                      {row.role}
                    </div>
                  </td>
                  <td
                    style={{
                      padding: "14px 16px",
                      textAlign: "right",
                      color: "var(--color-slate-700)",
                    }}
                  >
                    {row.totalAppraisals}
                  </td>
                  <td
                    style={{
                      padding: "14px 16px",
                      textAlign: "right",
                      color: "var(--color-slate-700)",
                    }}
                  >
                    {row.totalListings}
                  </td>
                  <td
                    style={{
                      padding: "14px 16px",
                      textAlign: "right",
                      color: "var(--color-slate-700)",
                    }}
                  >
                    {row.avgDOM}d
                  </td>
                  <td style={{ padding: "14px 16px", textAlign: "right" }}>
                    {row.conversionRate != null ? (
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 8px",
                          borderRadius: "999px",
                          fontSize: "12px",
                          fontWeight: 600,
                          backgroundColor: conversionBg(row.conversionRate),
                          color: conversionColor(row.conversionRate),
                        }}
                      >
                        {row.conversionRate.toFixed(1)}%
                      </span>
                    ) : (
                      <span style={{ color: "var(--color-slate-300)" }}>—</span>
                    )}
                  </td>
                  <td
                    style={{
                      padding: "14px 16px",
                      textAlign: "right",
                      color: "var(--color-slate-700)",
                      fontWeight: 500,
                    }}
                  >
                    {fmtDollar(row.totalCommissionPaid)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
