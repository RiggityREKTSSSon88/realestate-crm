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

type AgentMetrics = {
  id: string;
  name: string;
  appraisals: number;
  listings: number;
  activeListings: number;
  soldListings: number;
  avgDOM: number;
  conversionRate: number | null;
  totalCommissionPaid: number;
};

type MetricRow = {
  key: keyof Omit<AgentMetrics, "id" | "name">;
  label: string;
  format: (v: number | null) => string;
  higherIsBetter: boolean;
};

const METRIC_ROWS: MetricRow[] = [
  {
    key: "appraisals",
    label: "Appraisals",
    format: (v) => (v != null ? String(v) : "—"),
    higherIsBetter: true,
  },
  {
    key: "listings",
    label: "Listings",
    format: (v) => (v != null ? String(v) : "—"),
    higherIsBetter: true,
  },
  {
    key: "activeListings",
    label: "Active Listings",
    format: (v) => (v != null ? String(v) : "—"),
    higherIsBetter: true,
  },
  {
    key: "soldListings",
    label: "Sold Listings",
    format: (v) => (v != null ? String(v) : "—"),
    higherIsBetter: true,
  },
  {
    key: "avgDOM",
    label: "Avg DOM (active)",
    format: (v) => (v != null ? `${v}d` : "—"),
    higherIsBetter: false,
  },
  {
    key: "conversionRate",
    label: "Conversion Rate",
    format: (v) => (v != null ? `${v.toFixed(1)}%` : "—"),
    higherIsBetter: true,
  },
  {
    key: "totalCommissionPaid",
    label: "Total Commission Paid",
    format: (v) => (v != null ? fmtDollar(v) : "—"),
    higherIsBetter: true,
  },
];

export default function StaffComparison({ data }: Props) {
  const { agents, listings, appraisals, commissions } = data;

  const agentMetrics: AgentMetrics[] = useMemo(() => {
    return agents.map((agent) => {
      const agentAppraisals = appraisals.filter((a) => a.appraised_by === agent.id).length;
      const agentListings = listings.filter((l) => l.listed_by === agent.id);
      const totalListings = agentListings.length;
      const activeListings = agentListings.filter((l) => l.status === "active").length;
      const soldListings = agentListings.filter((l) => l.status === "sold").length;

      const activeDOMListings = agentListings.filter((l) => l.status === "active");
      const avgDOM =
        activeDOMListings.length > 0
          ? Math.round(
              activeDOMListings.reduce(
                (sum, l) =>
                  sum + Math.floor((Date.now() - new Date(l.list_date).getTime()) / 86400000),
                0
              ) / activeDOMListings.length
            )
          : 0;

      const conversionRate =
        agentAppraisals > 0 ? (totalListings / agentAppraisals) * 100 : null;

      const totalCommissionPaid = commissions
        .filter((c) => c.agent_id === agent.id && c.status === "paid")
        .reduce((sum, c) => sum + (c.actual_amount ?? 0), 0);

      return {
        id: agent.id,
        name: agent.full_name,
        appraisals: agentAppraisals,
        listings: totalListings,
        activeListings,
        soldListings,
        avgDOM,
        conversionRate,
        totalCommissionPaid,
      };
    });
  }, [agents, listings, appraisals, commissions]);

  function getBestAgentIndex(
    metricKey: keyof Omit<AgentMetrics, "id" | "name">,
    higherIsBetter: boolean
  ): number {
    if (agentMetrics.length === 0) return -1;
    let bestIdx = 0;
    for (let i = 1; i < agentMetrics.length; i++) {
      const curr = agentMetrics[i][metricKey] as number | null;
      const best = agentMetrics[bestIdx][metricKey] as number | null;
      if (curr == null) continue;
      if (best == null) { bestIdx = i; continue; }
      if (higherIsBetter ? curr > best : curr < best) {
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  const CSV_HEADERS = ["Metric", ...agentMetrics.map((a) => a.name)];

  function buildRows(): (string | number | null | undefined)[][] {
    return METRIC_ROWS.map((metric) => [
      metric.label,
      ...agentMetrics.map((a) => {
        const v = a[metric.key] as number | null;
        return metric.format(v);
      }),
    ]);
  }

  function handleExportCSV() {
    downloadCSV("staff-comparison.csv", CSV_HEADERS, buildRows());
  }

  function handleExportPDF() {
    downloadPDF(
      "Staff Comparison Report",
      "staff-comparison.pdf",
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
          overflowX: "auto",
        }}
      >
        <table style={{ borderCollapse: "collapse", fontSize: "14px", minWidth: "100%" }}>
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
                  whiteSpace: "nowrap",
                  minWidth: "180px",
                  position: "sticky",
                  left: 0,
                  backgroundColor: "var(--color-slate-50)",
                  zIndex: 1,
                  borderRight: "1px solid var(--color-slate-200)",
                }}
              >
                Metric
              </th>
              {agentMetrics.map((agent) => (
                <th
                  key={agent.id}
                  style={{
                    textAlign: "right",
                    padding: "12px 16px",
                    fontWeight: 600,
                    color: "var(--color-slate-700)",
                    whiteSpace: "nowrap",
                    minWidth: "140px",
                  }}
                >
                  {agent.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {agentMetrics.length === 0 ? (
              <tr>
                <td
                  colSpan={METRIC_ROWS.length + 1}
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
              METRIC_ROWS.map((metric, rowIdx) => {
                const bestIdx = getBestAgentIndex(metric.key, metric.higherIsBetter);
                return (
                  <tr
                    key={metric.key}
                    style={{
                      borderBottom:
                        rowIdx < METRIC_ROWS.length - 1
                          ? "1px solid var(--color-slate-100)"
                          : "none",
                    }}
                  >
                    <td
                      style={{
                        padding: "12px 16px",
                        fontWeight: 500,
                        color: "var(--color-slate-700)",
                        whiteSpace: "nowrap",
                        position: "sticky",
                        left: 0,
                        backgroundColor: "white",
                        zIndex: 1,
                        borderRight: "1px solid var(--color-slate-100)",
                      }}
                    >
                      {metric.label}
                    </td>
                    {agentMetrics.map((agent, colIdx) => {
                      const v = agent[metric.key] as number | null;
                      const isBest = colIdx === bestIdx;
                      return (
                        <td
                          key={agent.id}
                          style={{
                            padding: "12px 16px",
                            textAlign: "right",
                            color: isBest ? "var(--color-slate-900)" : "var(--color-slate-600)",
                            fontWeight: isBest ? 600 : 400,
                            backgroundColor: isBest ? "#fef9c3" : "transparent",
                          }}
                        >
                          {metric.format(v)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
