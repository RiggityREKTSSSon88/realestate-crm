"use client";

import { useMemo } from "react";
import type { ReportData } from "@/app/(crm)/reports/types";
import { downloadCSV } from "@/app/(crm)/reports/utils/exportCSV";

type Props = {
  data: ReportData;
};

function fmtDollar(n: number): string {
  return `$${n.toLocaleString("en-AU")}`;
}

export default function KPIDashboard({ data }: Props) {
  const { listings, appraisals, commissions, agents } = data;

  const now = new Date();
  const thisMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthPrefix = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;

  const computed = useMemo(() => {
    const activeListings = listings.filter((l) => l.status === "active");
    const totalActiveListings = activeListings.length;

    const totalPipelineValue = activeListings.reduce((sum, l) => sum + (l.list_price ?? 0), 0);

    const avgDOM =
      activeListings.length > 0
        ? Math.round(
            activeListings.reduce(
              (sum, l) =>
                sum + Math.floor((Date.now() - new Date(l.list_date).getTime()) / 86400000),
              0
            ) / activeListings.length
          )
        : 0;

    const appraisalsThisMonth = appraisals.filter((a) =>
      a.appraisal_date.startsWith(thisMonthPrefix)
    ).length;

    const revenueThisMonth = commissions
      .filter(
        (c) => c.status === "paid" && c.updated_at.startsWith(thisMonthPrefix)
      )
      .reduce((sum, c) => sum + (c.actual_amount ?? 0), 0);

    const revenueLastMonth = commissions
      .filter(
        (c) => c.status === "paid" && c.updated_at.startsWith(lastMonthPrefix)
      )
      .reduce((sum, c) => sum + (c.actual_amount ?? 0), 0);

    const revenueChangePct =
      revenueLastMonth > 0
        ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100
        : null;

    const agentListingCounts: Record<string, number> = {};
    for (const listing of listings) {
      if (listing.listed_by) {
        agentListingCounts[listing.listed_by] = (agentListingCounts[listing.listed_by] ?? 0) + 1;
      }
    }

    const agentCommissionPaid: Record<string, number> = {};
    for (const c of commissions) {
      if (c.agent_id && c.status === "paid") {
        agentCommissionPaid[c.agent_id] = (agentCommissionPaid[c.agent_id] ?? 0) + (c.actual_amount ?? 0);
      }
    }

    const topAgents = agents
      .map((a) => ({
        ...a,
        listingCount: agentListingCounts[a.id] ?? 0,
        commissionPaid: agentCommissionPaid[a.id] ?? 0,
      }))
      .sort((a, b) => b.listingCount - a.listingCount)
      .slice(0, 5);

    return {
      totalActiveListings,
      totalPipelineValue,
      avgDOM,
      appraisalsThisMonth,
      revenueThisMonth,
      revenueLastMonth,
      revenueChangePct,
      topAgents,
    };
  }, [listings, appraisals, commissions, agents, thisMonthPrefix, lastMonthPrefix]);

  function handleExportCSV() {
    const headers = ["Metric", "Value"];
    const rows: (string | number | null | undefined)[][] = [
      ["Active Listings", computed.totalActiveListings],
      ["Pipeline Value", computed.totalPipelineValue],
      ["Avg Days on Market", computed.avgDOM],
      ["Appraisals This Month", computed.appraisalsThisMonth],
      ["Revenue This Month", computed.revenueThisMonth],
      ["Revenue Last Month", computed.revenueLastMonth],
      [
        "Revenue Change %",
        computed.revenueChangePct != null
          ? `${computed.revenueChangePct.toFixed(1)}%`
          : "N/A",
      ],
      ...computed.topAgents.map((a, i) => [
        `Top Agent #${i + 1} - ${a.full_name}`,
        `${a.listingCount} listings, ${fmtDollar(a.commissionPaid)} commission`,
      ]),
    ];
    downloadCSV("kpi-dashboard.csv", headers, rows);
  }

  const cardStyle: React.CSSProperties = {
    backgroundColor: "white",
    border: "1px solid var(--color-slate-200)",
    borderRadius: "12px",
    padding: "20px",
  };

  const revChangePositive =
    computed.revenueChangePct !== null && computed.revenueChangePct >= 0;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
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
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "16px",
          marginBottom: "16px",
        }}
      >
        <div style={cardStyle}>
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
            Active Listings
          </div>
          <div
            style={{
              fontSize: "32px",
              fontWeight: 700,
              color: "var(--color-navy-800)",
              lineHeight: 1,
            }}
          >
            {computed.totalActiveListings}
          </div>
        </div>

        <div style={cardStyle}>
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
            Pipeline Value
          </div>
          <div
            style={{
              fontSize: "28px",
              fontWeight: 700,
              color: "var(--color-navy-800)",
              lineHeight: 1,
            }}
          >
            {fmtDollar(computed.totalPipelineValue)}
          </div>
        </div>

        <div style={cardStyle}>
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
            Avg Days on Market
          </div>
          <div
            style={{
              fontSize: "32px",
              fontWeight: 700,
              color: "var(--color-navy-800)",
              lineHeight: 1,
            }}
          >
            {computed.avgDOM}
            <span style={{ fontSize: "16px", fontWeight: 500, color: "var(--color-slate-500)", marginLeft: "4px" }}>
              days
            </span>
          </div>
        </div>

        <div style={cardStyle}>
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
            Appraisals This Month
          </div>
          <div
            style={{
              fontSize: "32px",
              fontWeight: 700,
              color: "var(--color-navy-800)",
              lineHeight: 1,
            }}
          >
            {computed.appraisalsThisMonth}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
        }}
      >
        <div style={cardStyle}>
          <div
            style={{
              fontSize: "12px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--color-slate-500)",
              marginBottom: "16px",
            }}
          >
            Revenue
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "12px", marginBottom: "16px" }}>
            <div>
              <div style={{ fontSize: "11px", color: "var(--color-slate-400)", marginBottom: "4px" }}>
                This Month
              </div>
              <div
                style={{
                  fontSize: "28px",
                  fontWeight: 700,
                  color: "var(--color-navy-800)",
                  lineHeight: 1,
                }}
              >
                {fmtDollar(computed.revenueThisMonth)}
              </div>
            </div>
            {computed.revenueChangePct !== null && (
              <div
                style={{
                  padding: "4px 8px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 600,
                  backgroundColor: revChangePositive ? "#dcfce7" : "#fee2e2",
                  color: revChangePositive ? "#15803d" : "#b91c1c",
                  marginBottom: "4px",
                }}
              >
                {revChangePositive ? "+" : ""}
                {computed.revenueChangePct.toFixed(1)}%
              </div>
            )}
          </div>
          <div
            style={{
              paddingTop: "12px",
              borderTop: "1px solid var(--color-slate-100)",
            }}
          >
            <div style={{ fontSize: "11px", color: "var(--color-slate-400)", marginBottom: "4px" }}>
              Last Month
            </div>
            <div style={{ fontSize: "18px", fontWeight: 600, color: "var(--color-slate-600)" }}>
              {fmtDollar(computed.revenueLastMonth)}
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <div
            style={{
              fontSize: "12px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--color-slate-500)",
              marginBottom: "12px",
            }}
          >
            Top Agents by Listings
          </div>
          {computed.topAgents.length === 0 ? (
            <div style={{ color: "var(--color-slate-400)", fontSize: "14px", padding: "16px 0" }}>
              No agent data available.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid var(--color-slate-100)",
                  }}
                >
                  <th
                    style={{
                      textAlign: "left",
                      padding: "6px 8px 6px 0",
                      fontWeight: 600,
                      color: "var(--color-slate-500)",
                      fontSize: "11px",
                    }}
                  >
                    #
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "6px 8px",
                      fontWeight: 600,
                      color: "var(--color-slate-500)",
                      fontSize: "11px",
                    }}
                  >
                    Agent
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "6px 8px",
                      fontWeight: 600,
                      color: "var(--color-slate-500)",
                      fontSize: "11px",
                    }}
                  >
                    Listings
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "6px 0 6px 8px",
                      fontWeight: 600,
                      color: "var(--color-slate-500)",
                      fontSize: "11px",
                    }}
                  >
                    Commission Paid
                  </th>
                </tr>
              </thead>
              <tbody>
                {computed.topAgents.map((agent, i) => (
                  <tr
                    key={agent.id}
                    style={{ borderBottom: "1px solid var(--color-slate-50)" }}
                  >
                    <td
                      style={{
                        padding: "8px 8px 8px 0",
                        color: i === 0 ? "var(--color-gold-500)" : "var(--color-slate-400)",
                        fontWeight: i === 0 ? 700 : 400,
                      }}
                    >
                      {i + 1}
                    </td>
                    <td
                      style={{
                        padding: "8px",
                        fontWeight: 500,
                        color: "var(--color-slate-800)",
                      }}
                    >
                      {agent.full_name}
                    </td>
                    <td
                      style={{
                        padding: "8px",
                        textAlign: "right",
                        color: "var(--color-slate-600)",
                      }}
                    >
                      {agent.listingCount}
                    </td>
                    <td
                      style={{
                        padding: "8px 0 8px 8px",
                        textAlign: "right",
                        color: "var(--color-slate-600)",
                      }}
                    >
                      {fmtDollar(agent.commissionPaid)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
