"use client";

import { useState, useMemo } from "react";
import { Plus, Search, Filter, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import type { Listing } from "@/types/database";
import ListingModal from "./ListingModal";

type ListingWithRelations = Listing & {
  properties: { id: string; address: string; suburb: string; state: string; postcode: string; property_type: string } | null;
  users: { id: string; full_name: string } | null;
};

type PropertyOption = {
  id: string;
  address: string;
  suburb: string;
  state: string;
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active:      { bg: "#d1fae5", text: "#065f46" },
  under_offer: { bg: "#fef3c7", text: "#b45309" },
  sold:        { bg: "#fee2e2", text: "#b91c1c" },
  withdrawn:   { bg: "#f1f5f9", text: "#64748b" },
  leased:      { bg: "#ede9fe", text: "#6d28d9" },
};

function formatStatus(status: string) {
  return status === "under_offer" ? "Under Offer" : status.charAt(0).toUpperCase() + status.slice(1);
}

type SortField = "list_date" | "status" | "created_at";
type SortDir = "asc" | "desc";

export default function ListingsClient({
  initialListings,
  properties,
}: {
  initialListings: ListingWithRelations[];
  properties: PropertyOption[];
}) {
  const [listings, setListings] = useState(initialListings);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editListing, setEditListing] = useState<ListingWithRelations | null>(null);

  const PAGE_SIZE = 20;

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

    if (statusFilter !== "all") result = result.filter((l) => l.status === statusFilter);

    result = [...result].sort((a, b) => {
      const av = a[sortField] ?? "";
      const bv = b[sortField] ?? "";
      const cmp = String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [listings, search, statusFilter, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
    setPage(1);
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ChevronsUpDown size={14} className="opacity-40" />;
    return sortDir === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  }

  function onSaved(listing: ListingWithRelations, isNew: boolean) {
    if (isNew) {
      setListings((prev) => [listing, ...prev]);
    } else {
      setListings((prev) => prev.map((l) => (l.id === listing.id ? listing : l)));
    }
    setShowModal(false);
    setEditListing(null);
  }

  function onDeleted(id: string) {
    setListings((prev) => prev.filter((l) => l.id !== id));
    setShowModal(false);
    setEditListing(null);
  }

  const fmt = (val: number | null) =>
    val != null ? `$${val.toLocaleString("en-AU")}` : <span style={{ color: "var(--color-slate-300)" }}>—</span>;

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-bold" style={{ fontSize: "24px", color: "var(--color-navy-800)" }}>
            Listings
          </h1>
          <p style={{ fontSize: "14px", color: "var(--color-slate-500)", marginTop: "2px" }}>
            {filtered.length} listing{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => { setEditListing(null); setShowModal(true); }}
          className="flex items-center gap-2 rounded-lg font-medium transition-colors"
          style={{
            padding: "10px 18px",
            backgroundColor: "var(--color-navy-800)",
            color: "white",
            fontSize: "14px",
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-navy-700)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-navy-800)")}
        >
          <Plus size={16} />
          New Listing
        </button>
      </div>

      {/* Filters */}
      <div
        className="flex items-center gap-3 mb-4 rounded-xl p-3"
        style={{ backgroundColor: "white", border: "1px solid var(--color-slate-200)" }}
      >
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--color-slate-400)" }}
          />
          <input
            type="text"
            placeholder="Search by address or suburb…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-lg outline-none"
            style={{
              padding: "8px 12px 8px 36px",
              fontSize: "14px",
              border: "1px solid var(--color-slate-200)",
              backgroundColor: "var(--color-slate-50)",
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} style={{ color: "var(--color-slate-400)" }} />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-lg outline-none cursor-pointer"
            style={{
              padding: "8px 12px",
              fontSize: "14px",
              border: "1px solid var(--color-slate-200)",
              backgroundColor: "var(--color-slate-50)",
            }}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="under_offer">Under Offer</option>
            <option value="sold">Sold</option>
            <option value="leased">Leased</option>
            <option value="withdrawn">Withdrawn</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: "1px solid var(--color-slate-200)", backgroundColor: "white" }}
      >
        <table className="w-full" style={{ fontSize: "14px", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "var(--color-slate-50)", borderBottom: "1px solid var(--color-slate-200)" }}>
              <th className="text-left" style={{ padding: "12px 16px", fontWeight: 600, color: "var(--color-slate-700)" }}>
                Property
              </th>
              <th
                className="text-left cursor-pointer select-none"
                style={{ padding: "12px 16px", fontWeight: 600, color: "var(--color-slate-700)" }}
                onClick={() => toggleSort("status")}
              >
                <span className="flex items-center gap-1">
                  Status
                  <SortIcon field="status" />
                </span>
              </th>
              <th className="text-left" style={{ padding: "12px 16px", fontWeight: 600, color: "var(--color-slate-700)" }}>
                List Price
              </th>
              <th className="text-left" style={{ padding: "12px 16px", fontWeight: 600, color: "var(--color-slate-700)" }}>
                Days on Market
              </th>
              <th
                className="text-left cursor-pointer select-none"
                style={{ padding: "12px 16px", fontWeight: 600, color: "var(--color-slate-700)" }}
                onClick={() => toggleSort("list_date")}
              >
                <span className="flex items-center gap-1">
                  Date Listed
                  <SortIcon field="list_date" />
                </span>
              </th>
              <th className="text-left" style={{ padding: "12px 16px", fontWeight: 600, color: "var(--color-slate-700)" }}>
                Agent
              </th>
              <th style={{ padding: "12px 16px", width: "48px" }} />
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="text-center"
                  style={{ padding: "48px 16px", color: "var(--color-slate-400)" }}
                >
                  {search || statusFilter !== "all"
                    ? "No listings match your filters."
                    : "No listings yet. Create your first listing."}
                </td>
              </tr>
            ) : (
              paginated.map((listing) => (
                <tr
                  key={listing.id}
                  className="cursor-pointer transition-colors"
                  style={{ borderBottom: "1px solid var(--color-slate-100)" }}
                  onClick={() => { setEditListing(listing); setShowModal(true); }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-slate-50)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "transparent")}
                >
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ fontWeight: 500, color: "var(--color-slate-900)" }}>
                      {listing.properties?.address ?? <span style={{ color: "var(--color-slate-400)" }}>—</span>}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--color-slate-400)", marginTop: "2px" }}>
                      {listing.properties
                        ? `${listing.properties.suburb}, ${listing.properties.state}`
                        : ""}
                    </div>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span
                      className="rounded-full px-2 py-1 font-medium"
                      style={{
                        fontSize: "12px",
                        backgroundColor: STATUS_COLORS[listing.status]?.bg,
                        color: STATUS_COLORS[listing.status]?.text,
                      }}
                    >
                      {formatStatus(listing.status)}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px", color: "var(--color-slate-700)" }}>
                    {fmt(listing.list_price)}
                  </td>
                  <td style={{ padding: "14px 16px", color: "var(--color-slate-600)" }}>
                    {listing.days_on_market != null
                      ? `${listing.days_on_market}d`
                      : <span style={{ color: "var(--color-slate-300)" }}>—</span>}
                  </td>
                  <td style={{ padding: "14px 16px", color: "var(--color-slate-500)", fontSize: "13px" }}>
                    {new Date(listing.list_date).toLocaleDateString("en-AU", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td style={{ padding: "14px 16px", color: "var(--color-slate-500)", fontSize: "13px" }}>
                    {listing.users?.full_name ?? <span style={{ color: "var(--color-slate-300)" }}>—</span>}
                  </td>
                  <td style={{ padding: "14px 8px" }}>
                    <span style={{ color: "var(--color-slate-300)", fontSize: "18px" }}>›</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span style={{ fontSize: "13px", color: "var(--color-slate-500)" }}>
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="rounded-lg px-3 py-1.5 transition-colors disabled:opacity-40"
              style={{
                fontSize: "13px",
                border: "1px solid var(--color-slate-200)",
                backgroundColor: "white",
              }}
            >
              Previous
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className="rounded-lg w-8 h-8 transition-colors"
                style={{
                  fontSize: "13px",
                  fontWeight: p === page ? 600 : 400,
                  border: p === page ? "none" : "1px solid var(--color-slate-200)",
                  backgroundColor: p === page ? "var(--color-navy-800)" : "white",
                  color: p === page ? "white" : "var(--color-slate-700)",
                }}
              >
                {p}
              </button>
            ))}
            <button
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              className="rounded-lg px-3 py-1.5 transition-colors disabled:opacity-40"
              style={{
                fontSize: "13px",
                border: "1px solid var(--color-slate-200)",
                backgroundColor: "white",
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <ListingModal
          listing={editListing}
          properties={properties}
          onSaved={onSaved}
          onDeleted={onDeleted}
          onClose={() => { setShowModal(false); setEditListing(null); }}
        />
      )}
    </div>
  );
}
