"use client";

import { useState } from "react";
import type { ReportData } from "@/app/(crm)/reports/types";
import KPIDashboard from "./components/KPIDashboard";
import AgentPerformance from "./components/AgentPerformance";
import StaffComparison from "./components/StaffComparison";
import StocklistReport from "./components/StocklistReport";
import GeoBreakdown from "./components/GeoBreakdown";
import CommissionsTab from "./components/CommissionsTab";
import ScheduledReportsTab from "./components/ScheduledReportsTab";

type Tab = {
  id: string;
  label: string;
};

const TABS: Tab[] = [
  { id: "kpi", label: "KPI Dashboard" },
  { id: "agent", label: "Agent Performance" },
  { id: "staff", label: "Staff Comparison" },
  { id: "stocklist", label: "Stocklist" },
  { id: "geo", label: "Geo Breakdown" },
  { id: "commissions", label: "Commissions" },
  { id: "scheduled", label: "Scheduled Reports" },
];

type Props = {
  data: ReportData;
};

export default function ReportsClient({ data }: Props) {
  const [activeTab, setActiveTab] = useState("kpi");

  return (
    <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700, color: "var(--color-navy-800)", margin: 0 }}>
          Reports
        </h1>
        <p style={{ fontSize: "14px", color: "var(--color-slate-500)", marginTop: "4px" }}>
          Analytics and performance insights for your agency
        </p>
      </div>

      <div
        style={{
          display: "flex",
          gap: "6px",
          padding: "6px",
          backgroundColor: "white",
          border: "1px solid var(--color-slate-200)",
          borderRadius: "12px",
          marginBottom: "24px",
          overflowX: "auto",
          flexWrap: "nowrap",
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: isActive ? 600 : 400,
                whiteSpace: "nowrap",
                backgroundColor: isActive ? "var(--color-navy-800)" : "transparent",
                color: isActive ? "white" : "var(--color-slate-600)",
                transition: "background-color 0.15s, color 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-slate-100)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                }
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div>
        {activeTab === "kpi" && <KPIDashboard data={data} />}
        {activeTab === "agent" && <AgentPerformance data={data} />}
        {activeTab === "staff" && <StaffComparison data={data} />}
        {activeTab === "stocklist" && <StocklistReport data={data} />}
        {activeTab === "geo" && <GeoBreakdown data={data} />}
        {activeTab === "commissions" && <CommissionsTab data={data} />}
        {activeTab === "scheduled" && <ScheduledReportsTab data={data} />}
      </div>
    </div>
  );
}
