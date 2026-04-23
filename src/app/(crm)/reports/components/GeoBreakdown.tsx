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

type SuburbRow = {
  suburb: string;
  state: string;
  totalListings: number;
  activeListings: number;
  soldListings: number;
  avgListPrice: number | null;
  avgSoldPrice: number | null;
  avgDOM: number;
  totalCommission: number;
};

export default function GeoBreakdown({ data }: Props) {
  const { listings, commissions } = data;

  const rows: SuburbRow[] = useMemo(() => {
    const map = new Map<string, SuburbRow>();

    for (const listing of listings) {
      const suburb = listing.properties?.suburb ?? "Unknown";
      const state = listing.properties?.state ?? "";
      const key = `${suburb}|${state}`;

      if (!map.has(key)) {
        map.set(key, {
          suburb,
          state,
          totalListings: 0,
          activeListings: 0,
          soldListings: 0,
          avgListPrice: null,
          avgSoldPrice: null,
          avgDOM: 0,
          totalCommission: 0,
        });
      }

      const row = map.get(key)!;
      row.totalListings += 1;
      if (listing.status === "active") row.activeListings += 1;
      if (listing.status === "sold") row.soldListings += 1;
    }

    for (const [key, row] of map.entries()) {
      const [suburb, state] = key.split("|");
      const suburbListings = listings.filter(
        (l) => l.properties?.suburb === suburb && l.properties?.state === state
      );

      const pricedListings = suburbListings.filter((l) => l.list_price != null);
      row.avgListPrice =
        pricedListings.length > 0
          ? Math.round(
              pricedListings.reduce((s, l) => s + (l.list_price ?? 0), 0) /
                pricedListings.length
            )
          : null;

      const soldWithPrice = suburbListings.filter(
        (l) => l.status === "sold" && l.sold_price != null
      );
      row.avgSoldPrice =
        soldWithPrice.length > 0
          ? Math.round(
              soldWithPrice.reduce((s, l) => s + (l.sold_price ?? 0), 0) /
                soldWithPrice.length
            )
          : null;

      const domListings = suburbListings.filter((l) => l.status === "active");
      row.avgDOM =
        domListings.length > 0
          ? Math.round(
              domListings.reduce(
                (s, l) =>
                  s + Math.floor((Date.now() - new Date(l.list_date).getTime()) / 86400000),
                0
              ) / domListings.length
            )
          : 0;

      const listingIds = new Set(suburbListings.map((l) => l.id));
      row.totalCommission = commissions
        .filter((c) => c.status === "paid" && c.listing_id && listingIds.has(c.listing_id))
        .reduce((s, c) => s + (c.actual_amount ?? 0), 0);
    }

    return Array.from(map.values()).sort((a, b) => b.totalListings - a.totalListings);
  }, [listings, commissions]);

  const CSV_HEADERS = [
    "Suburb",
    "State",
    "Total Listings",
    "Active",
    "Sold",
    "Avg List Price",
    "Avg Sold Price",
    "Avg DOM",
    "Total Commission",
  ];

  function buildRows(): (string | number | null | undefined)[][] {
    return rows.map((r) => [
      r.suburb,
      r.state,
      r.totalListings,
      r.activeListings,
      r.soldListings,
      r.avgListPrice,
      r.avgSoldPrice,
      r.avgDOM,
      r.totalCommission,
    ]);
  }

  function handleExportCSV() {
    downloadCSV("geo-breakdown.csv", CSV_HEADERS, buildRows());
  }

  function handleExportPDF() {
    downloadPDF("Geo Breakdown Report", "geo-breakdown.pdf", CSV_HEADERS, buildRows());
  }

  const maxListings = rows.length > 0 ? rows[0].totalListings : 1;

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
                Suburb
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: "12px 16px",
                  fontWeight: 600,
                  color: "var(--color-slate-700)",
                }}
              >
                State
              </th>
              <th
                style={{
                  textAlign: "right",
                  padding: "12px 16px",
                  fontWeight: 600,
                  color: "var(--color-slate-700)",
                }}
              >
                Total
              </th>
              <th
                style={{
                  textAlign: "right",
                  padding: "12px 16px",
                  fontWeight: 600,
                  color: "var(--color-slate-700)",
                }}
              >
                Active
              </th>
              <th
                style={{
                  textAlign: "right",
                  padding: "12px 16px",
                  fontWeight: 600,
                  color: "var(--color-slate-700)",
                }}
              >
                Sold
              </th>
              <th
                style={{
                  textAlign: "right",
                  padding: "12px 16px",
                  fontWeight: 600,
                  color: "var(--color-slate-700)",
                }}
              >
                Avg List Price
              </th>
              <th
                style={{
                  textAlign: "right",
                  padding: "12px 16px",
                  fontWeight: 600,
                  color: "var(--color-slate-700)",
                }}
              >
                Avg Sold Price
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
                Commission
              </th>
              <th
                style={{
                  padding: "12px 16px",
                  minWidth: "120px",
                }}
              />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  style={{
                    textAlign: "center",
                    padding: "48px 16px",
                    color: "var(--color-slate-400)",
                  }}
                >
                  No listing data available.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const barPct = Math.round((row.totalListings / maxListings) * 100);
                return (
                  <tr
                    key={`${row.suburb}|${row.state}`}
                    style={{ borderBottom: "1px solid var(--color-slate-100)" }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLElement).style.backgroundColor =
                        "var(--color-slate-50)")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLElement).style.backgroundColor = "transparent")
                    }
                  >
                    <td
                      style={{
                        padding: "14px 16px",
                        fontWeight: 500,
                        color: "var(--color-slate-900)",
                      }}
                    >
                      {row.suburb}
                    </td>
                    <td
                      style={{
                        padding: "14px 16px",
                        color: "var(--color-slate-500)",
                        fontSize: "13px",
                      }}
                    >
                      {row.state}
                    </td>
                    <td
                      style={{
                        padding: "14px 16px",
                        textAlign: "right",
                        fontWeight: 600,
                        color: "var(--color-navy-800)",
                      }}
                    >
                      {row.totalListings}
                    </td>
                    <td
                      style={{
                        padding: "14px 16px",
                        textAlign: "right",
                        color: "#065f46",
                      }}
                    >
                      {row.activeListings}
                    </td>
                    <td
                      style={{
                        padding: "14px 16px",
                        textAlign: "right",
                        color: "var(--color-slate-600)",
                      }}
                    >
                      {row.soldListings}
                    </td>
                    <td
                      style={{
                        padding: "14px 16px",
                        textAlign: "right",
                        color: "var(--color-slate-700)",
                      }}
                    >
                      {row.avgListPrice != null ? fmtDollar(row.avgListPrice) : (
                        <span style={{ color: "var(--color-slate-300)" }}>—</span>
                      )}
                    </td>
                    <td
                      style={{
                        padding: "14px 16px",
                        textAlign: "right",
                        color: "var(--color-slate-700)",
                      }}
                    >
                      {row.avgSoldPrice != null ? fmtDollar(row.avgSoldPrice) : (
                        <span style={{ color: "var(--color-slate-300)" }}>—</span>
                      )}
                    </td>
                    <td
                      style={{
                        padding: "14px 16px",
                        textAlign: "right",
                        color: "var(--color-slate-600)",
                      }}
                    >
                      {row.avgDOM}d
                    </td>
                    <td
                      style={{
                        padding: "14px 16px",
                        textAlign: "right",
                        color: "var(--color-slate-700)",
                        fontWeight: 500,
                      }}
                    >
                      {fmtDollar(row.totalCommission)}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <div
                        style={{
                          width: "100%",
                          height: "6px",
                          borderRadius: "3px",
                          backgroundColor: "var(--color-slate-100)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${barPct}%`,
                            borderRadius: "3px",
                            backgroundColor: "var(--color-navy-800)",
                          }}
                        />
                      </div>
                    </td>
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
