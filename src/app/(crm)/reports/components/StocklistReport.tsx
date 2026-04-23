"use client";

import { useMemo, useState } from "react";
import type { ReportData } from "@/app/(crm)/reports/types";
import { downloadCSV } from "@/app/(crm)/reports/utils/exportCSV";
import { downloadPDF } from "@/app/(crm)/reports/utils/exportPDF";

type Props = {
  data: ReportData;
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active:      { bg: "#d1fae5", text: "#065f46" },
  under_offer: { bg: "#fef3c7", text: "#b45309" },
  sold:        { bg: "#fee2e2", text: "#b91c1c" },
  withdrawn:   { bg: "#f1f5f9", text: "#64748b" },
  leased:      { bg: "#ede9fe", text: "#6d28d9" },
};

function fmtStatus(s: string): string {
  if (s === "under_offer") return "Under Offer";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function fmtDollar(n: number | null): string {
  if (n == null) return "—";
  return `$${n.toLocaleString("en-AU")}`;
}

export default function StocklistReport({ data }: Props) {
  const { listings } = data;
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let result = listings;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.properties?.address.toLowerCase().includes(q) ||
          l.properties?.suburb.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      result = result.filter((l) => l.status === statusFilter);
    }
    return result;
  }, [listings, search, statusFilter]);

  const CSV_HEADERS = [
    "Address",
    "Suburb",
    "State",
    "Type",
    "Status",
    "List Price",
    "Date Listed",
    "Days on Market",
    "Sold Price",
    "Agent",
  ];

  function buildRows(): (string | number | null | undefined)[][] {
    return filtered.map((l) => {
      const dom = Math.floor(
        (Date.now() - new Date(l.list_date).getTime()) / 86400000
      );
      return [
        l.properties?.address ?? "",
        l.properties?.suburb ?? "",
        l.properties?.state ?? "",
        l.properties?.property_type ?? "",
        fmtStatus(l.status),
        l.list_price,
        new Date(l.list_date).toLocaleDateString("en-AU"),
        dom,
        l.sold_price ?? null,
        l.users?.full_name ?? "",
      ];
    });
  }

  function handleExportCSV() {
    downloadCSV("stocklist.csv", CSV_HEADERS, buildRows());
  }

  function handleExportPDF() {
    downloadPDF("Stocklist Report", "stocklist.pdf", CSV_HEADERS, buildRows());
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: "8px", flex: 1, minWidth: "200px" }}>
          <input
            type="text"
            placeholder="Search address or suburb…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid var(--color-slate-200)",
              backgroundColor: "white",
              fontSize: "14px",
              outline: "none",
            }}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid var(--color-slate-200)",
              backgroundColor: "white",
              fontSize: "14px",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="under_offer">Under Offer</option>
            <option value="sold">Sold</option>
            <option value="leased">Leased</option>
            <option value="withdrawn">Withdrawn</option>
          </select>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
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
                Property
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: "12px 16px",
                  fontWeight: 600,
                  color: "var(--color-slate-700)",
                }}
              >
                Status
              </th>
              <th
                style={{
                  textAlign: "right",
                  padding: "12px 16px",
                  fontWeight: 600,
                  color: "var(--color-slate-700)",
                }}
              >
                List Price
              </th>
              <th
                style={{
                  textAlign: "right",
                  padding: "12px 16px",
                  fontWeight: 600,
                  color: "var(--color-slate-700)",
                }}
              >
                Sold Price
              </th>
              <th
                style={{
                  textAlign: "right",
                  padding: "12px 16px",
                  fontWeight: 600,
                  color: "var(--color-slate-700)",
                }}
              >
                DOM
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: "12px 16px",
                  fontWeight: 600,
                  color: "var(--color-slate-700)",
                }}
              >
                Date Listed
              </th>
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
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    textAlign: "center",
                    padding: "48px 16px",
                    color: "var(--color-slate-400)",
                  }}
                >
                  No listings match your filters.
                </td>
              </tr>
            ) : (
              filtered.map((listing) => {
                const dom = Math.floor(
                  (Date.now() - new Date(listing.list_date).getTime()) / 86400000
                );
                const statusStyle = STATUS_COLORS[listing.status] ?? {
                  bg: "#f1f5f9",
                  text: "#64748b",
                };
                return (
                  <tr
                    key={listing.id}
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
                        {listing.properties?.address ?? (
                          <span style={{ color: "var(--color-slate-400)" }}>—</span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "var(--color-slate-400)",
                          marginTop: "2px",
                        }}
                      >
                        {listing.properties
                          ? `${listing.properties.suburb}, ${listing.properties.state} · ${listing.properties.property_type}`
                          : ""}
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 8px",
                          borderRadius: "999px",
                          fontSize: "12px",
                          fontWeight: 500,
                          backgroundColor: statusStyle.bg,
                          color: statusStyle.text,
                        }}
                      >
                        {fmtStatus(listing.status)}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "14px 16px",
                        textAlign: "right",
                        color: "var(--color-slate-700)",
                      }}
                    >
                      {fmtDollar(listing.list_price)}
                    </td>
                    <td
                      style={{
                        padding: "14px 16px",
                        textAlign: "right",
                        color: listing.sold_price ? "var(--color-slate-700)" : "var(--color-slate-300)",
                      }}
                    >
                      {fmtDollar(listing.sold_price)}
                    </td>
                    <td
                      style={{
                        padding: "14px 16px",
                        textAlign: "right",
                        color: "var(--color-slate-600)",
                      }}
                    >
                      {dom}d
                    </td>
                    <td
                      style={{
                        padding: "14px 16px",
                        color: "var(--color-slate-500)",
                        fontSize: "13px",
                      }}
                    >
                      {new Date(listing.list_date).toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td
                      style={{
                        padding: "14px 16px",
                        color: "var(--color-slate-500)",
                        fontSize: "13px",
                      }}
                    >
                      {listing.users?.full_name ?? (
                        <span style={{ color: "var(--color-slate-300)" }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: "12px", fontSize: "13px", color: "var(--color-slate-400)" }}>
        {filtered.length} listing{filtered.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
