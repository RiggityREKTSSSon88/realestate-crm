"use client";

import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, X, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ReportData, ReportCommission } from "@/app/(crm)/reports/types";
import type { Commission } from "@/types/database";
import { downloadCSV } from "@/app/(crm)/reports/utils/exportCSV";
import { downloadPDF } from "@/app/(crm)/reports/utils/exportPDF";

type Props = {
  data: ReportData;
};

function fmtDollar(n: number | null): string {
  if (n == null) return "—";
  return `$${n.toLocaleString("en-AU")}`;
}

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  pending:  { bg: "#fef3c7", text: "#b45309" },
  invoiced: { bg: "#dbeafe", text: "#1d4ed8" },
  paid:     { bg: "#d1fae5", text: "#065f46" },
};

const inp: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  fontSize: "14px",
  border: "1px solid var(--color-slate-200)",
  borderRadius: "8px",
  outline: "none",
  backgroundColor: "var(--color-slate-50)",
  boxSizing: "border-box",
};

const lbl: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 500,
  color: "var(--color-slate-700)",
  marginBottom: "6px",
  display: "block",
};

type ModalState =
  | { mode: "new" }
  | { mode: "edit"; commission: ReportCommission };

export default function CommissionsTab({ data }: Props) {
  const [localCommissions, setLocalCommissions] = useState<ReportCommission[]>(
    data.commissions
  );
  const { listings, agents } = data;
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ModalState | null>(null);

  const filtered = useMemo(() => {
    let result = localCommissions;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.listings?.properties?.address?.toLowerCase().includes(q) ||
          c.listings?.properties?.suburb?.toLowerCase().includes(q) ||
          c.agents?.full_name?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      result = result.filter((c) => c.status === statusFilter);
    }
    return result;
  }, [localCommissions, search, statusFilter]);

  const totals = useMemo(() => {
    const paid = filtered
      .filter((c) => c.status === "paid")
      .reduce((s, c) => s + (c.actual_amount ?? 0), 0);
    const invoiced = filtered
      .filter((c) => c.status === "invoiced")
      .reduce((s, c) => s + (c.expected_amount ?? 0), 0);
    const pending = filtered
      .filter((c) => c.status === "pending")
      .reduce((s, c) => s + (c.expected_amount ?? 0), 0);
    return { paid, invoiced, pending };
  }, [filtered]);

  const CSV_HEADERS = [
    "Property",
    "Suburb",
    "Agent",
    "Status",
    "Expected Amount",
    "Actual Amount",
    "Last Updated",
  ];

  function buildRows(): (string | number | null | undefined)[][] {
    return filtered.map((c) => [
      c.listings?.properties?.address ?? "",
      c.listings?.properties?.suburb ?? "",
      c.agents?.full_name ?? "",
      c.status,
      c.expected_amount,
      c.actual_amount,
      new Date(c.updated_at).toLocaleDateString("en-AU"),
    ]);
  }

  function handleSaved(saved: ReportCommission) {
    setLocalCommissions((prev) => {
      const idx = prev.findIndex((c) => c.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
    setModal(null);
  }

  function handleDeleted(id: string) {
    setLocalCommissions((prev) => prev.filter((c) => c.id !== id));
    setModal(null);
  }

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
        {[
          { label: "Paid", value: totals.paid, color: "#065f46", bg: "#d1fae5" },
          { label: "Invoiced", value: totals.invoiced, color: "#1d4ed8", bg: "#dbeafe" },
          { label: "Pending", value: totals.pending, color: "#b45309", bg: "#fef3c7" },
        ].map((card) => (
          <div
            key={card.label}
            style={{
              backgroundColor: "white",
              border: "1px solid var(--color-slate-200)",
              borderRadius: "12px",
              padding: "20px",
            }}
          >
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
              {card.label}
            </div>
            <div style={{ fontSize: "26px", fontWeight: 700, color: "var(--color-navy-800)" }}>
              {fmtDollar(card.value)}
            </div>
          </div>
        ))}
      </div>

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
            placeholder="Search property or agent…"
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
            <option value="pending">Pending</option>
            <option value="invoiced">Invoiced</option>
            <option value="paid">Paid</option>
          </select>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => downloadPDF("Commissions Report", "commissions.pdf", CSV_HEADERS, buildRows())}
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
            onClick={() => downloadCSV("commissions.csv", CSV_HEADERS, buildRows())}
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
          <button
            onClick={() => setModal({ mode: "new" })}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "var(--color-navy-800)",
              color: "white",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-navy-700)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-navy-800)")
            }
          >
            <Plus size={15} />
            Log Commission
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
              <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "var(--color-slate-700)" }}>
                Property
              </th>
              <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "var(--color-slate-700)" }}>
                Agent
              </th>
              <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "var(--color-slate-700)" }}>
                Status
              </th>
              <th style={{ textAlign: "right", padding: "12px 16px", fontWeight: 600, color: "var(--color-slate-700)" }}>
                Expected
              </th>
              <th style={{ textAlign: "right", padding: "12px 16px", fontWeight: 600, color: "var(--color-slate-700)" }}>
                Actual
              </th>
              <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "var(--color-slate-700)" }}>
                Last Updated
              </th>
              <th style={{ padding: "12px 16px", width: "64px" }} />
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
                  No commissions match your filters.
                </td>
              </tr>
            ) : (
              filtered.map((commission) => {
                const style = STATUS_STYLES[commission.status] ?? STATUS_STYLES["pending"];
                return (
                  <tr
                    key={commission.id}
                    style={{ borderBottom: "1px solid var(--color-slate-100)", cursor: "pointer" }}
                    onClick={() => setModal({ mode: "edit", commission })}
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
                        {commission.listings?.properties?.address ?? (
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
                        {commission.listings?.properties
                          ? `${commission.listings.properties.suburb}, ${commission.listings.properties.state}`
                          : ""}
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px", color: "var(--color-slate-700)" }}>
                      {commission.agents?.full_name ?? (
                        <span style={{ color: "var(--color-slate-300)" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 8px",
                          borderRadius: "999px",
                          fontSize: "12px",
                          fontWeight: 500,
                          backgroundColor: style.bg,
                          color: style.text,
                          textTransform: "capitalize",
                        }}
                      >
                        {commission.status}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "14px 16px",
                        textAlign: "right",
                        color: "var(--color-slate-600)",
                      }}
                    >
                      {fmtDollar(commission.expected_amount)}
                    </td>
                    <td
                      style={{
                        padding: "14px 16px",
                        textAlign: "right",
                        fontWeight: commission.actual_amount ? 600 : 400,
                        color: commission.actual_amount
                          ? "var(--color-slate-900)"
                          : "var(--color-slate-300)",
                      }}
                    >
                      {fmtDollar(commission.actual_amount)}
                    </td>
                    <td
                      style={{
                        padding: "14px 16px",
                        color: "var(--color-slate-500)",
                        fontSize: "13px",
                      }}
                    >
                      {new Date(commission.updated_at).toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td
                      style={{ padding: "14px 16px", textAlign: "right" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setModal({ mode: "edit", commission });
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: "4px",
                          color: "var(--color-slate-400)",
                          borderRadius: "4px",
                        }}
                        onMouseEnter={(e) =>
                          ((e.currentTarget as HTMLElement).style.color = "var(--color-navy-800)")
                        }
                        onMouseLeave={(e) =>
                          ((e.currentTarget as HTMLElement).style.color = "var(--color-slate-400)")
                        }
                      >
                        <Pencil size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <CommissionModal
          modal={modal}
          listings={listings}
          agents={agents}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

type CommissionModalProps = {
  modal: ModalState;
  listings: ReportData["listings"];
  agents: ReportData["agents"];
  onSaved: (c: ReportCommission) => void;
  onDeleted: (id: string) => void;
  onClose: () => void;
};

function CommissionModal({
  modal,
  listings,
  agents,
  onSaved,
  onDeleted,
  onClose,
}: CommissionModalProps) {
  const isNew = modal.mode === "new";
  const existing = modal.mode === "edit" ? modal.commission : null;

  const [listingId, setListingId] = useState(existing?.listing_id ?? "");
  const [agentId, setAgentId] = useState(existing?.agent_id ?? "");
  const [expectedAmount, setExpectedAmount] = useState(
    existing?.expected_amount != null ? String(existing.expected_amount) : ""
  );
  const [actualAmount, setActualAmount] = useState(
    existing?.actual_amount != null ? String(existing.actual_amount) : ""
  );
  const [status, setStatus] = useState<Commission["status"]>(
    existing?.status ?? "pending"
  );
  const [notes, setNotes] = useState(existing?.notes ?? "");

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (isNew && !listingId) {
      setError("Please select a listing.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const payload = {
      listing_id: listingId,
      agent_id: agentId || null,
      expected_amount: expectedAmount ? Number(expectedAmount) : null,
      actual_amount: actualAmount ? Number(actualAmount) : null,
      status,
      notes: notes || null,
    };

    if (isNew) {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        setError("Not authenticated.");
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("users")
        .select("agency_id")
        .eq("id", authData.user.id)
        .single();

      if (!profile?.agency_id) {
        setError("Agency not found.");
        setLoading(false);
        return;
      }

      const { data: created, error: insertErr } = await supabase
        .from("commissions")
        .insert({ ...payload, agency_id: profile.agency_id })
        .select("*")
        .single();

      if (insertErr || !created) {
        setError("Failed to create commission. Please try again.");
        setLoading(false);
        return;
      }

      const listing = listings.find((l) => l.id === listingId) ?? null;
      const agent = agents.find((a) => a.id === agentId) ?? null;

      onSaved({
        ...(created as Commission),
        listings: listing
          ? {
              ...listing,
              properties: listing.properties ?? null,
            }
          : null,
        agents: agent,
      });
    } else if (existing) {
      const { data: updated, error: updateErr } = await supabase
        .from("commissions")
        .update({
          agent_id: payload.agent_id,
          expected_amount: payload.expected_amount,
          actual_amount: payload.actual_amount,
          status: payload.status,
          notes: payload.notes,
        })
        .eq("id", existing.id)
        .select("*")
        .single();

      if (updateErr || !updated) {
        setError("Failed to update commission. Please try again.");
        setLoading(false);
        return;
      }

      const agent = agents.find((a) => a.id === agentId) ?? null;

      onSaved({
        ...(updated as Commission),
        listings: existing.listings,
        agents: agent,
      });
    }

    setLoading(false);
  }

  async function handleDelete() {
    if (!existing) return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("commissions").delete().eq("id", existing.id);
    onDeleted(existing.id);
    setDeleting(false);
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        zIndex: 50,
        backgroundColor: "rgba(0,0,0,0.4)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "480px",
          height: "100%",
          backgroundColor: "white",
          boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 24px",
            borderBottom: "1px solid var(--color-slate-200)",
            flexShrink: 0,
          }}
        >
          <h2 style={{ fontSize: "18px", fontWeight: 600, color: "var(--color-navy-800)" }}>
            {isNew ? "Log Commission" : "Edit Commission"}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "6px",
              borderRadius: "8px",
              color: "var(--color-slate-400)",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.color = "var(--color-slate-700)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.color = "var(--color-slate-400)")
            }
          >
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            flex: 1,
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {error && (
            <div
              style={{
                backgroundColor: "#fee2e2",
                color: "#b91c1c",
                fontSize: "13px",
                borderRadius: "8px",
                padding: "12px 16px",
              }}
            >
              {error}
            </div>
          )}

          <div>
            <label style={lbl}>Listing</label>
            {!isNew && existing ? (
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--color-slate-200)",
                  backgroundColor: "var(--color-slate-50)",
                  fontSize: "14px",
                  color: "var(--color-slate-700)",
                }}
              >
                {existing.listings?.properties?.address
                  ? `${existing.listings.properties.address} — ${existing.listings.properties.suburb}`
                  : existing.listing_id}
              </div>
            ) : (
              <select
                value={listingId}
                onChange={(e) => setListingId(e.target.value)}
                style={inp}
                autoFocus
              >
                <option value="">Select a listing…</option>
                {listings.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.properties
                      ? `${l.properties.address} — ${l.properties.suburb}`
                      : l.id}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label style={lbl}>Agent</label>
            <select
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              style={inp}
            >
              <option value="">No agent</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.full_name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label style={lbl}>Expected Amount ($)</label>
              <input
                type="number"
                placeholder="e.g. 15000"
                value={expectedAmount}
                onChange={(e) => setExpectedAmount(e.target.value)}
                min="0"
                style={inp}
              />
            </div>
            <div>
              <label style={lbl}>Actual Amount ($)</label>
              <input
                type="number"
                placeholder="e.g. 14500"
                value={actualAmount}
                onChange={(e) => setActualAmount(e.target.value)}
                min="0"
                style={inp}
              />
            </div>
          </div>

          <div>
            <label style={lbl}>Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Commission["status"])}
              style={inp}
            >
              <option value="pending">Pending</option>
              <option value="invoiced">Invoiced</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          <div>
            <label style={lbl}>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Any additional notes…"
              style={{
                ...inp,
                resize: "vertical",
                lineHeight: "1.5",
                fontFamily: "inherit",
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginTop: "auto",
              paddingTop: "16px",
              borderTop: "1px solid var(--color-slate-100)",
            }}
          >
            {!isNew && !confirmDelete && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "1px solid var(--color-slate-200)",
                  background: "none",
                  color: "#b91c1c",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                <Trash2 size={14} />
                Delete
              </button>
            )}

            {confirmDelete && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "13px", color: "#b91c1c" }}>Are you sure?</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: "#b91c1c",
                    color: "white",
                    fontSize: "13px",
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  {deleting ? <Loader2 size={14} style={{ display: "inline" }} /> : "Yes, delete"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--color-slate-200)",
                    background: "none",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginLeft: "auto" }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "1px solid var(--color-slate-200)",
                  background: "none",
                  fontSize: "14px",
                  color: "var(--color-slate-700)",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 20px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: "var(--color-navy-800)",
                  color: "white",
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!loading)
                    (e.currentTarget as HTMLElement).style.backgroundColor =
                      "var(--color-navy-700)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    "var(--color-navy-800)";
                }}
              >
                {loading && <Loader2 size={14} />}
                {isNew ? "Log Commission" : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
