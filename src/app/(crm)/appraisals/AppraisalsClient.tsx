"use client";

import { useState, useMemo } from "react";
import { Plus, Search, Filter, ChevronUp, ChevronDown, ChevronsUpDown, Building2, User } from "lucide-react";
import type { Appraisal, Contact } from "@/types/database";
import AppraisalModal from "./AppraisalModal";

type AppraisalWithRelations = Appraisal & {
  contacts: { id: string; full_name: string; email: string | null; phone: string | null; type: string; status: string } | null;
  properties: { id: string; address: string; suburb: string; state: string; postcode: string; property_type: string } | null;
  users: { id: string; full_name: string } | null;
};

const STATUS_COLORS = {
  hot:  { bg: "#fee2e2", text: "#b91c1c" },
  warm: { bg: "#fef3c7", text: "#b45309" },
  cold: { bg: "#dbeafe", text: "#1d4ed8" },
};

type SortField = "appraisal_date" | "status" | "created_at";
type SortDir = "asc" | "desc";

export default function AppraisalsClient({
  initialAppraisals,
  contacts,
}: {
  initialAppraisals: AppraisalWithRelations[];
  contacts: Pick<Contact, "id" | "full_name" | "email" | "phone" | "type" | "status">[];
}) {
  const [appraisals, setAppraisals] = useState(initialAppraisals);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [showModal, setShowModal] = useState(false);
  const [editAppraisal, setEditAppraisal] = useState<AppraisalWithRelations | null>(null);

  const filtered = useMemo(() => {
    let result = appraisals;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.contacts?.full_name.toLowerCase().includes(q) ||
          a.properties?.address.toLowerCase().includes(q) ||
          a.properties?.suburb.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") result = result.filter((a) => a.status === statusFilter);
    return [...result].sort((a, b) => {
      const av = a[sortField] ?? "";
      const bv = b[sortField] ?? "";
      const cmp = String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [appraisals, search, statusFilter, sortField, sortDir]);

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ChevronsUpDown size={14} className="opacity-40" />;
    return sortDir === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  }

  function onSaved(appraisal: AppraisalWithRelations, isNew: boolean) {
    if (isNew) setAppraisals((prev) => [appraisal, ...prev]);
    else setAppraisals((prev) => prev.map((a) => (a.id === appraisal.id ? appraisal : a)));
    setShowModal(false);
    setEditAppraisal(null);
  }

  function onDeleted(id: string) {
    setAppraisals((prev) => prev.filter((a) => a.id !== id));
    setShowModal(false);
    setEditAppraisal(null);
  }

  const fmt = (val: number | null) =>
    val ? `$${val.toLocaleString("en-AU")}` : "—";

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-bold" style={{ fontSize: "24px", color: "var(--color-navy-800)" }}>Appraisals</h1>
          <p style={{ fontSize: "14px", color: "var(--color-slate-500)", marginTop: "2px" }}>
            {filtered.length} appraisal{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => { setEditAppraisal(null); setShowModal(true); }}
          className="flex items-center gap-2 rounded-lg font-medium transition-colors"
          style={{ padding: "10px 18px", backgroundColor: "var(--color-navy-800)", color: "white", fontSize: "14px" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-navy-700)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-navy-800)")}
        >
          <Plus size={16} /> New Appraisal
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 rounded-xl p-3"
        style={{ backgroundColor: "white", border: "1px solid var(--color-slate-200)" }}>
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-slate-400)" }} />
          <input
            type="text" placeholder="Search by contact or property…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg outline-none"
            style={{ padding: "8px 12px 8px 36px", fontSize: "14px", border: "1px solid var(--color-slate-200)", backgroundColor: "var(--color-slate-50)" }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} style={{ color: "var(--color-slate-400)" }} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg outline-none cursor-pointer"
            style={{ padding: "8px 12px", fontSize: "14px", border: "1px solid var(--color-slate-200)", backgroundColor: "var(--color-slate-50)" }}>
            <option value="all">All statuses</option>
            <option value="hot">Hot</option>
            <option value="warm">Warm</option>
            <option value="cold">Cold</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-slate-200)", backgroundColor: "white" }}>
        <table className="w-full" style={{ fontSize: "14px", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "var(--color-slate-50)", borderBottom: "1px solid var(--color-slate-200)" }}>
              <th className="text-left" style={{ padding: "12px 16px", fontWeight: 600, color: "var(--color-slate-700)" }}>Contact</th>
              <th className="text-left" style={{ padding: "12px 16px", fontWeight: 600, color: "var(--color-slate-700)" }}>Property</th>
              <th className="text-left cursor-pointer select-none" style={{ padding: "12px 16px", fontWeight: 600, color: "var(--color-slate-700)" }} onClick={() => toggleSort("status")}>
                <span className="flex items-center gap-1">Status <SortIcon field="status" /></span>
              </th>
              <th className="text-left" style={{ padding: "12px 16px", fontWeight: 600, color: "var(--color-slate-700)" }}>Est. Value</th>
              <th className="text-left cursor-pointer select-none" style={{ padding: "12px 16px", fontWeight: 600, color: "var(--color-slate-700)" }} onClick={() => toggleSort("appraisal_date")}>
                <span className="flex items-center gap-1">Date <SortIcon field="appraisal_date" /></span>
              </th>
              <th className="text-left" style={{ padding: "12px 16px", fontWeight: 600, color: "var(--color-slate-700)" }}>Agent</th>
              <th style={{ padding: "12px 16px", width: "48px" }} />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center" style={{ padding: "48px 16px", color: "var(--color-slate-400)" }}>
                No appraisals yet. Create your first one.
              </td></tr>
            ) : filtered.map((appraisal) => (
              <tr key={appraisal.id} className="cursor-pointer transition-colors"
                style={{ borderBottom: "1px solid var(--color-slate-100)" }}
                onClick={() => { setEditAppraisal(appraisal); setShowModal(true); }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-slate-50)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "transparent")}>
                <td style={{ padding: "14px 16px" }}>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center rounded-full shrink-0"
                      style={{ width: "32px", height: "32px", backgroundColor: "var(--color-navy-100)", color: "var(--color-navy-800)", fontSize: "12px", fontWeight: 600 }}>
                      {appraisal.contacts?.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() ?? "?"}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500 }}>{appraisal.contacts?.full_name ?? "Unknown"}</div>
                      <div style={{ fontSize: "12px", color: "var(--color-slate-400)" }}>{appraisal.contacts?.phone ?? appraisal.contacts?.email ?? ""}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <div style={{ fontWeight: 500 }}>{appraisal.properties?.address ?? "—"}</div>
                  <div style={{ fontSize: "12px", color: "var(--color-slate-400)" }}>{appraisal.properties?.suburb}, {appraisal.properties?.state}</div>
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <span className="rounded-full px-2 py-1 font-medium capitalize"
                    style={{ fontSize: "12px", backgroundColor: STATUS_COLORS[appraisal.status]?.bg, color: STATUS_COLORS[appraisal.status]?.text }}>
                    {appraisal.status}
                  </span>
                </td>
                <td style={{ padding: "14px 16px", color: "var(--color-slate-700)" }}>
                  {appraisal.estimated_value_low || appraisal.estimated_value_high
                    ? `${fmt(appraisal.estimated_value_low)} – ${fmt(appraisal.estimated_value_high)}`
                    : <span style={{ color: "var(--color-slate-300)" }}>—</span>}
                </td>
                <td style={{ padding: "14px 16px", color: "var(--color-slate-500)", fontSize: "13px" }}>
                  {new Date(appraisal.appraisal_date).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                </td>
                <td style={{ padding: "14px 16px", color: "var(--color-slate-500)", fontSize: "13px" }}>
                  {appraisal.users?.full_name ?? "—"}
                </td>
                <td style={{ padding: "14px 8px" }}>
                  <span style={{ color: "var(--color-slate-300)", fontSize: "18px" }}>›</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <AppraisalModal
          appraisal={editAppraisal}
          contacts={contacts}
          onSaved={onSaved}
          onDeleted={onDeleted}
          onClose={() => { setShowModal(false); setEditAppraisal(null); }}
        />
      )}
    </div>
  );
}
