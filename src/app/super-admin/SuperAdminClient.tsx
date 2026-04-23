"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

type AgencyRow = {
  id: string;
  name: string;
  subscription_plan: string;
  subscription_status: string;
  onboarding_completed: boolean;
  trial_ends_at: string | null;
  created_at: string;
};

type UserRow = {
  id: string;
  agency_id: string | null;
  full_name: string;
  email: string;
  role: string;
};

type Props = {
  agencies: AgencyRow[];
  users: UserRow[];
};

type OverrideModalState = {
  open: boolean;
  agencyId: string;
  agencyName: string;
  plan: string;
  status: string;
};

type PlanKey = "trial" | "starter" | "professional" | "enterprise";
type StatusKey = "active" | "past_due" | "cancelled";

const PLAN_BADGE: Record<PlanKey, { bg: string; color: string; label: string }> = {
  trial:        { bg: "var(--color-slate-100)", color: "var(--color-slate-600)", label: "Trial" },
  starter:      { bg: "#dbeafe", color: "#1d4ed8", label: "Starter" },
  professional: { bg: "#0F2942", color: "white", label: "Professional" },
  enterprise:   { bg: "#fef9c3", color: "#b45309", label: "Enterprise" },
};

const STATUS_BADGE: Record<StatusKey, { bg: string; color: string; label: string }> = {
  active:    { bg: "#dcfce7", color: "#15803d", label: "Active" },
  past_due:  { bg: "#fef3c7", color: "#b45309", label: "Past Due" },
  cancelled: { bg: "#fee2e2", color: "#b91c1c", label: "Cancelled" },
};

function Badge({ bg, color, label }: { bg: string; color: string; label: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        backgroundColor: bg,
        color,
        fontSize: "11px",
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: "999px",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function isTrialExpired(trialEndsAt: string | null): boolean {
  if (!trialEndsAt) return false;
  return new Date(trialEndsAt) < new Date();
}

function getPlanBadge(plan: string): { bg: string; color: string; label: string } {
  return PLAN_BADGE[plan as PlanKey] ?? { bg: "var(--color-slate-100)", color: "var(--color-slate-600)", label: plan };
}

function getStatusBadge(status: string): { bg: string; color: string; label: string } {
  return STATUS_BADGE[status as StatusKey] ?? { bg: "var(--color-slate-100)", color: "var(--color-slate-600)", label: status };
}

export default function SuperAdminClient({ agencies, users }: Props) {
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<OverrideModalState>({
    open: false,
    agencyId: "",
    agencyName: "",
    plan: "trial",
    status: "active",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [localAgencies, setLocalAgencies] = useState<AgencyRow[]>(agencies);

  const totalAgencies = localAgencies.length;
  const activeSubscriptions = localAgencies.filter((a) => a.subscription_status === "active").length;
  const pastDue = localAgencies.filter((a) => a.subscription_status === "past_due").length;
  const trials = localAgencies.filter((a) => a.subscription_plan === "trial").length;

  const filtered = useMemo(() => {
    if (!search.trim()) return localAgencies;
    const q = search.toLowerCase();
    return localAgencies.filter((a) => a.name.toLowerCase().includes(q));
  }, [search, localAgencies]);

  function getUserCount(agencyId: string): number {
    return users.filter((u) => u.agency_id === agencyId).length;
  }

  function openOverride(agency: AgencyRow) {
    setModal({
      open: true,
      agencyId: agency.id,
      agencyName: agency.name,
      plan: agency.subscription_plan,
      status: agency.subscription_status,
    });
    setSaveError(null);
  }

  function closeModal() {
    setModal((m) => ({ ...m, open: false }));
    setSaveError(null);
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("agencies")
      .update({
        subscription_plan: modal.plan as "trial" | "starter" | "professional" | "enterprise",
        subscription_status: modal.status as "active" | "past_due" | "cancelled",
      })
      .eq("id", modal.agencyId);

    if (error) {
      setSaveError(error.message);
      setSaving(false);
      return;
    }

    setLocalAgencies((prev) =>
      prev.map((a) =>
        a.id === modal.agencyId
          ? { ...a, subscription_plan: modal.plan, subscription_status: modal.status }
          : a
      )
    );
    setSaving(false);
    closeModal();
  }

  const statCards = [
    { label: "Total Agencies", value: totalAgencies, color: "#0F2942", bg: "#e8eff6", warn: false },
    { label: "Active Subscriptions", value: activeSubscriptions, color: "#15803d", bg: "#dcfce7", warn: false },
    { label: "Past Due", value: pastDue, color: "#b45309", bg: "#fef3c7", warn: pastDue > 0 },
    { label: "Trial Accounts", value: trials, color: "#1d4ed8", bg: "#dbeafe", warn: false },
  ];

  return (
    <div style={{ padding: "32px", maxWidth: "1400px", margin: "0 auto" }}>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#0F2942", margin: 0 }}>
          Agency Overview
        </h1>
        <p style={{ fontSize: "13px", color: "var(--color-slate-500)", marginTop: "4px" }}>
          {totalAgencies} agenc{totalAgencies === 1 ? "y" : "ies"} · {users.length} total users
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "16px",
          marginBottom: "28px",
        }}
      >
        {statCards.map((s) => (
          <div
            key={s.label}
            style={{
              backgroundColor: "white",
              border: `1px solid ${s.warn ? "#fcd34d" : "var(--color-slate-200)"}`,
              borderRadius: "12px",
              padding: "20px",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                backgroundColor: s.bg,
                marginBottom: "12px",
              }}
            />
            <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--color-slate-900)" }}>
              {s.value}
            </div>
            <div style={{ fontSize: "13px", color: "var(--color-slate-500)", marginTop: "2px" }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          backgroundColor: "white",
          border: "1px solid var(--color-slate-200)",
          borderRadius: "12px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--color-slate-200)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <input
            type="text"
            placeholder="Search agencies…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              fontSize: "13px",
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid var(--color-slate-200)",
              outline: "none",
              width: "260px",
              color: "var(--color-slate-900)",
            }}
          />
          <span style={{ fontSize: "13px", color: "var(--color-slate-400)" }}>
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "var(--color-slate-50)" }}>
                {["Agency Name", "Plan", "Status", "Onboarding", "Trial Ends", "Created", ""].map(
                  (h) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 16px",
                        textAlign: "left",
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "var(--color-slate-500)",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        whiteSpace: "nowrap",
                        borderBottom: "1px solid var(--color-slate-200)",
                      }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      textAlign: "center",
                      padding: "40px",
                      fontSize: "14px",
                      color: "var(--color-slate-400)",
                    }}
                  >
                    No agencies found
                  </td>
                </tr>
              )}
              {filtered.map((agency) => {
                const planBadge = getPlanBadge(agency.subscription_plan);
                const statusBadge = getStatusBadge(agency.subscription_status);
                const userCount = getUserCount(agency.id);
                const expired = isTrialExpired(agency.trial_ends_at);

                return (
                  <tr
                    key={agency.id}
                    style={{ borderBottom: "1px solid var(--color-slate-100)" }}
                  >
                    <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "var(--color-slate-900)",
                        }}
                      >
                        {agency.name}
                      </span>
                      <span
                        style={{
                          fontSize: "12px",
                          color: "var(--color-slate-400)",
                          marginLeft: "6px",
                        }}
                      >
                        · {userCount} user{userCount !== 1 ? "s" : ""}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <Badge {...planBadge} />
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <Badge {...statusBadge} />
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {agency.onboarding_completed ? (
                        <Badge bg="#dcfce7" color="#15803d" label="Complete" />
                      ) : (
                        <Badge bg="#fef3c7" color="#b45309" label="Pending" />
                      )}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "13px",
                        color: agency.trial_ends_at
                          ? expired
                            ? "#b91c1c"
                            : "var(--color-slate-700)"
                          : "var(--color-slate-400)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {agency.trial_ends_at ? formatDate(agency.trial_ends_at) : "—"}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "13px",
                        color: "var(--color-slate-500)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatDate(agency.created_at)}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <button
                        onClick={() => openOverride(agency)}
                        style={{
                          backgroundColor: "white",
                          border: "1px solid var(--color-slate-200)",
                          color: "#0F2942",
                          fontSize: "12px",
                          fontWeight: 500,
                          padding: "5px 12px",
                          borderRadius: "6px",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Override
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modal.open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "28px",
              width: "100%",
              maxWidth: "400px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
          >
            <h2
              style={{
                fontSize: "16px",
                fontWeight: 700,
                color: "#0F2942",
                margin: "0 0 4px 0",
              }}
            >
              {modal.agencyName}
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "20px" }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "var(--color-slate-600)",
                    marginBottom: "6px",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  Plan
                </label>
                <select
                  value={modal.plan}
                  onChange={(e) => setModal((m) => ({ ...m, plan: e.target.value }))}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--color-slate-200)",
                    fontSize: "13px",
                    color: "var(--color-slate-900)",
                    outline: "none",
                    backgroundColor: "white",
                  }}
                >
                  <option value="trial">Trial</option>
                  <option value="starter">Starter</option>
                  <option value="professional">Professional</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "var(--color-slate-600)",
                    marginBottom: "6px",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  Status
                </label>
                <select
                  value={modal.status}
                  onChange={(e) => setModal((m) => ({ ...m, status: e.target.value }))}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--color-slate-200)",
                    fontSize: "13px",
                    color: "var(--color-slate-900)",
                    outline: "none",
                    backgroundColor: "white",
                  }}
                >
                  <option value="active">Active</option>
                  <option value="past_due">Past Due</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {saveError && (
              <p
                style={{
                  fontSize: "13px",
                  color: "#b91c1c",
                  backgroundColor: "#fee2e2",
                  borderRadius: "6px",
                  padding: "8px 12px",
                  marginTop: "16px",
                }}
              >
                {saveError}
              </p>
            )}

            <div
              style={{
                display: "flex",
                gap: "10px",
                marginTop: "24px",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={closeModal}
                disabled={saving}
                style={{
                  padding: "9px 18px",
                  borderRadius: "8px",
                  border: "1px solid var(--color-slate-200)",
                  backgroundColor: "white",
                  color: "var(--color-slate-700)",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: "9px 18px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: "#0F2942",
                  color: "white",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
