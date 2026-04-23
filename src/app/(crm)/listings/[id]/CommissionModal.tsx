"use client";

import { useState } from "react";
import { Trash2, X, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Commission } from "@/types/database";

type Props = {
  listingId: string;
  agencyId: string;
  agents: { id: string; full_name: string }[];
  commission: Commission | null;
  onSaved: (c: Commission) => void;
  onDeleted: () => void;
  onClose: () => void;
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

export default function CommissionModal({
  listingId,
  agencyId,
  agents,
  commission,
  onSaved,
  onDeleted,
  onClose,
}: Props) {
  const isNew = commission === null;

  const [agentId, setAgentId] = useState(commission?.agent_id ?? "");
  const [expectedAmount, setExpectedAmount] = useState(
    commission?.expected_amount != null ? String(commission.expected_amount) : ""
  );
  const [actualAmount, setActualAmount] = useState(
    commission?.actual_amount != null ? String(commission.actual_amount) : ""
  );
  const [status, setStatus] = useState<Commission["status"]>(
    commission?.status ?? "pending"
  );
  const [notes, setNotes] = useState(commission?.notes ?? "");

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    const payload = {
      agent_id: agentId || null,
      expected_amount: expectedAmount ? Number(expectedAmount) : null,
      actual_amount: actualAmount ? Number(actualAmount) : null,
      status,
      notes: notes || null,
    };

    if (isNew) {
      const { data: created, error: insertErr } = await supabase
        .from("commissions")
        .insert({
          ...payload,
          listing_id: listingId,
          agency_id: agencyId,
        })
        .select("*")
        .single();

      if (insertErr || !created) {
        setError("Failed to create commission. Please try again.");
        setLoading(false);
        return;
      }

      onSaved(created as Commission);
    } else {
      const { data: updated, error: updateErr } = await supabase
        .from("commissions")
        .update(payload)
        .eq("id", commission.id)
        .select("*")
        .single();

      if (updateErr || !updated) {
        setError("Failed to update commission. Please try again.");
        setLoading(false);
        return;
      }

      onSaved(updated as Commission);
    }

    setLoading(false);
  }

  async function handleDelete() {
    if (!commission) return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("commissions").delete().eq("id", commission.id);
    onDeleted();
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
            <label style={lbl}>Agent</label>
            <select
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              style={inp}
              autoFocus
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
              rows={3}
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
                  {deleting ? (
                    <Loader2 size={14} style={{ display: "inline" }} />
                  ) : (
                    "Yes, delete"
                  )}
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
