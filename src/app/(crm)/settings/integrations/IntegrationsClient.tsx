"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, ChevronDown, ChevronUp, Plus, Trash2, Zap, AlertCircle, ExternalLink } from "lucide-react";

type IntegrationSetting = {
  integration_name: string;
  has_api_key: boolean;
  has_api_secret: boolean;
  config: Record<string, unknown>;
  connected_at: string | null;
};

type ZapierWebhook = {
  id: string;
  name: string;
  url: string;
  events: string[];
  active: boolean;
  created_at: string;
};

type Props = {
  userRole: string;
  initialSettings: IntegrationSetting[];
  initialWebhooks: ZapierWebhook[];
};

const ZAPIER_EVENTS = [
  "contact.created",
  "contact.updated",
  "listing.created",
  "listing.updated",
  "listing.sold",
  "appraisal.created",
  "proposal.signed",
  "task.completed",
  "communication.logged",
] as const;

type IntegrationDef = {
  id: string;
  name: string;
  description: string;
  website: string;
  color: string;
  initials: string;
  fields: { key: "api_key" | "api_secret"; label: string; placeholder: string }[];
};

const INTEGRATIONS: IntegrationDef[] = [
  {
    id: "corelogic",
    name: "CoreLogic RP Data",
    description: "Pull live property data and suburb market statistics directly into the appraisals module.",
    website: "https://www.corelogic.com.au",
    color: "#1e40af",
    initials: "CL",
    fields: [
      { key: "api_key", label: "Client ID", placeholder: "Your CoreLogic client ID" },
      { key: "api_secret", label: "Client Secret", placeholder: "Your CoreLogic client secret" },
    ],
  },
  {
    id: "domain",
    name: "Domain.com.au",
    description: "Push listings from the CRM directly to Domain with one click.",
    website: "https://www.domain.com.au",
    color: "#7c3aed",
    initials: "DO",
    fields: [
      { key: "api_key", label: "Client ID", placeholder: "Your Domain client ID" },
      { key: "api_secret", label: "Client Secret", placeholder: "Your Domain client secret" },
    ],
  },
  {
    id: "ratemyagent",
    name: "RateMyAgent",
    description: "Pull agent reviews into profiles and automatically include them in digital proposals.",
    website: "https://www.ratemyagent.com.au",
    color: "#059669",
    initials: "RM",
    fields: [
      { key: "api_key", label: "API Key", placeholder: "Your RateMyAgent API key" },
    ],
  },
  {
    id: "inspectrealestate",
    name: "InspectRealEstate",
    description: "Sync open homes and automatically import attendee lists back into the CRM.",
    website: "https://www.inspectrealestate.com.au",
    color: "#0891b2",
    initials: "IR",
    fields: [
      { key: "api_key", label: "API Key", placeholder: "Your InspectRealEstate API key" },
    ],
  },
  {
    id: "reiformslive",
    name: "REI Forms Live",
    description: "Auto-populate contracts and agency agreements with contact and property data from the CRM.",
    website: "https://www.reiformslive.com.au",
    color: "#b45309",
    initials: "RF",
    fields: [
      { key: "api_key", label: "API Key", placeholder: "Your REI Forms Live API key" },
    ],
  },
  {
    id: "movemein",
    name: "Move Me In",
    description: "Send utility connection referrals at settlement and earn passive referral income.",
    website: "https://www.movemein.com.au",
    color: "#be185d",
    initials: "MM",
    fields: [
      { key: "api_key", label: "Partner API Key", placeholder: "Your Move Me In partner key" },
    ],
  },
];

function IntegrationCard({
  def,
  setting,
  isAdmin,
}: {
  def: IntegrationDef;
  setting: IntegrationSetting | undefined;
  isAdmin: boolean;
}) {
  const isConnected = setting?.has_api_key ?? false;
  const [expanded, setExpanded] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/integrations/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          integration_name: def.id,
          api_key: apiKey || undefined,
          api_secret: apiSecret || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Save failed");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      setApiKey("");
      setApiSecret("");
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnect() {
    setSaving(true);
    setError(null);
    try {
      await fetch("/api/integrations/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integration_name: def.id, api_key: "", api_secret: "" }),
      });
      setExpanded(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "white", border: "1px solid var(--color-slate-200)" }}>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-4 px-5 py-4"
        style={{ background: "none", cursor: "pointer", textAlign: "left" }}
      >
        <div className="flex items-center justify-center rounded-xl shrink-0"
          style={{ width: 44, height: 44, backgroundColor: def.color + "18" }}>
          <span style={{ fontSize: "14px", fontWeight: 700, color: def.color }}>{def.initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-navy-800)" }}>{def.name}</span>
            {isConnected ? (
              <span className="flex items-center gap-1 rounded-full px-2 py-0.5"
                style={{ fontSize: "11px", fontWeight: 600, backgroundColor: "#dcfce7", color: "#166534" }}>
                <CheckCircle2 size={11} /> Connected
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-full px-2 py-0.5"
                style={{ fontSize: "11px", fontWeight: 600, backgroundColor: "var(--color-slate-100)", color: "var(--color-slate-500)" }}>
                <XCircle size={11} /> Not connected
              </span>
            )}
          </div>
          <p style={{ fontSize: "12px", color: "var(--color-slate-500)", marginTop: "2px" }} className="truncate">{def.description}</p>
        </div>
        {expanded ? <ChevronUp size={16} style={{ color: "var(--color-slate-400)", flexShrink: 0 }} /> : <ChevronDown size={16} style={{ color: "var(--color-slate-400)", flexShrink: 0 }} />}
      </button>

      {expanded && (
        <div className="px-5 pb-5" style={{ borderTop: "1px solid var(--color-slate-100)" }}>
          <p style={{ fontSize: "13px", color: "var(--color-slate-600)", lineHeight: 1.6, marginTop: "12px", marginBottom: "16px" }}>
            {def.description}
            {" "}
            <a href={def.website} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1"
              style={{ color: def.color, fontWeight: 500 }}>
              Learn more <ExternalLink size={11} />
            </a>
          </p>

          {!isAdmin ? (
            <div className="flex items-start gap-2 rounded-lg px-3 py-2.5" style={{ backgroundColor: "#f8fafc", border: "1px solid var(--color-slate-200)" }}>
              <AlertCircle size={14} style={{ color: "var(--color-slate-400)", marginTop: "1px" }} />
              <p style={{ fontSize: "13px", color: "var(--color-slate-500)" }}>Only admins can manage integration credentials.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {def.fields.map((field) => (
                <div key={field.key}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--color-slate-600)", marginBottom: "6px" }}>
                    {field.label}
                    {isConnected && <span style={{ color: "#059669", fontWeight: 400, marginLeft: "6px" }}>• Already saved</span>}
                  </label>
                  <input
                    type="password"
                    placeholder={isConnected ? "Enter new key to update" : field.placeholder}
                    value={field.key === "api_key" ? apiKey : apiSecret}
                    onChange={(e) => field.key === "api_key" ? setApiKey(e.target.value) : setApiSecret(e.target.value)}
                    className="w-full rounded-lg px-3 py-2.5"
                    style={{ fontSize: "13px", border: "1px solid var(--color-slate-200)", outline: "none", fontFamily: "monospace" }}
                  />
                </div>
              ))}

              {error && (
                <p style={{ fontSize: "12px", color: "#b91c1c" }}>{error}</p>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving || (!apiKey && !apiSecret)}
                  className="flex items-center gap-2 rounded-lg px-4 py-2 transition-colors"
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    backgroundColor: saved ? "#059669" : def.color,
                    color: "white",
                    border: "none",
                    cursor: saving || (!apiKey && !apiSecret) ? "not-allowed" : "pointer",
                    opacity: saving || (!apiKey && !apiSecret) ? 0.6 : 1,
                  }}
                >
                  {saved ? <><CheckCircle2 size={14} /> Saved</> : saving ? "Saving…" : "Save credentials"}
                </button>

                {isConnected && (
                  <button
                    onClick={handleDisconnect}
                    disabled={saving}
                    className="rounded-lg px-3 py-2 transition-colors"
                    style={{ fontSize: "13px", color: "#b91c1c", border: "1px solid #fecaca", backgroundColor: "white", cursor: "pointer" }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "#fef2f2")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "white")}
                  >
                    Disconnect
                  </button>
                )}
              </div>

              {setting?.connected_at && (
                <p style={{ fontSize: "11px", color: "var(--color-slate-400)" }}>
                  Last updated {new Date(setting.connected_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ZapierSection({ webhooks: initialWebhooks, isAdmin }: { webhooks: ZapierWebhook[]; isAdmin: boolean }) {
  const [webhooks, setWebhooks] = useState(initialWebhooks);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleEvent(event: string) {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  }

  async function handleAdd() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/webhooks/zapier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, url, events: selectedEvents }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to add webhook");
        return;
      }
      const { webhook } = await res.json();
      setWebhooks((prev) => [webhook, ...prev]);
      setName("");
      setUrl("");
      setSelectedEvents([]);
      setShowAdd(false);
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/webhooks/zapier/${id}`, { method: "DELETE" });
    setWebhooks((prev) => prev.filter((w) => w.id !== id));
  }

  async function handleToggle(id: string, active: boolean) {
    await fetch(`/api/webhooks/zapier/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    setWebhooks((prev) => prev.map((w) => w.id === id ? { ...w, active } : w));
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "white", border: "1px solid var(--color-slate-200)" }}>
      <div className="flex items-center gap-4 px-5 py-4" style={{ borderBottom: "1px solid var(--color-slate-200)" }}>
        <div className="flex items-center justify-center rounded-xl shrink-0"
          style={{ width: 44, height: 44, backgroundColor: "#ff4a0018" }}>
          <Zap size={20} style={{ color: "#ff4a00" }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-navy-800)" }}>Zapier Webhooks</span>
            <span className="flex items-center gap-1 rounded-full px-2 py-0.5"
              style={{ fontSize: "11px", fontWeight: 600, backgroundColor: "#dcfce7", color: "#166534" }}>
              <CheckCircle2 size={11} /> No API key needed
            </span>
          </div>
          <p style={{ fontSize: "12px", color: "var(--color-slate-500)", marginTop: "2px" }}>
            Connect to 7,000+ apps via Zapier webhooks. No API key required.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5"
            style={{ fontSize: "13px", fontWeight: 600, backgroundColor: "#ff4a00", color: "white", border: "none", cursor: "pointer" }}
          >
            <Plus size={14} /> Add Webhook
          </button>
        )}
      </div>

      {showAdd && (
        <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--color-slate-100)", backgroundColor: "var(--color-slate-50)" }}>
          <div className="flex flex-col gap-3">
            <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--color-slate-600)", marginBottom: "6px" }}>Webhook name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. New Contact → Slack"
                  className="w-full rounded-lg px-3 py-2"
                  style={{ fontSize: "13px", border: "1px solid var(--color-slate-200)", outline: "none" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--color-slate-600)", marginBottom: "6px" }}>Zapier Webhook URL</label>
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://hooks.zapier.com/hooks/catch/..."
                  className="w-full rounded-lg px-3 py-2"
                  style={{ fontSize: "13px", border: "1px solid var(--color-slate-200)", outline: "none", fontFamily: "monospace" }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--color-slate-600)", marginBottom: "8px" }}>Trigger on events</label>
              <div className="flex flex-wrap gap-2">
                {ZAPIER_EVENTS.map((event) => (
                  <button
                    key={event}
                    onClick={() => toggleEvent(event)}
                    className="rounded-full px-3 py-1 transition-colors"
                    style={{
                      fontSize: "12px",
                      fontWeight: 500,
                      backgroundColor: selectedEvents.includes(event) ? "#ff4a00" : "var(--color-slate-100)",
                      color: selectedEvents.includes(event) ? "white" : "var(--color-slate-600)",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    {event}
                  </button>
                ))}
              </div>
            </div>

            {error && <p style={{ fontSize: "12px", color: "#b91c1c" }}>{error}</p>}

            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={saving || !name || !url || !selectedEvents.length}
                className="rounded-lg px-4 py-2"
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  backgroundColor: "#ff4a00",
                  color: "white",
                  border: "none",
                  cursor: saving || !name || !url || !selectedEvents.length ? "not-allowed" : "pointer",
                  opacity: saving || !name || !url || !selectedEvents.length ? 0.6 : 1,
                }}
              >
                {saving ? "Adding…" : "Add webhook"}
              </button>
              <button onClick={() => setShowAdd(false)} className="rounded-lg px-3 py-2"
                style={{ fontSize: "13px", border: "1px solid var(--color-slate-200)", backgroundColor: "white", cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {webhooks.length === 0 ? (
        <p style={{ fontSize: "13px", color: "var(--color-slate-400)", textAlign: "center", padding: "24px 0" }}>
          No webhooks registered yet.{isAdmin ? " Add one above to start." : ""}
        </p>
      ) : (
        <div>
          {webhooks.map((wh) => (
            <div key={wh.id} className="flex items-start gap-3 px-5 py-3" style={{ borderBottom: "1px solid var(--color-slate-100)" }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-slate-800)" }}>{wh.name}</span>
                  <span className="rounded-full px-1.5 py-0.5"
                    style={{ fontSize: "10px", fontWeight: 600, backgroundColor: wh.active ? "#dcfce7" : "var(--color-slate-100)", color: wh.active ? "#166534" : "var(--color-slate-500)" }}>
                    {wh.active ? "Active" : "Paused"}
                  </span>
                </div>
                <p style={{ fontSize: "11px", color: "var(--color-slate-400)", fontFamily: "monospace", marginTop: "2px" }} className="truncate">{wh.url}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {wh.events.map((e) => (
                    <span key={e} className="rounded px-1.5 py-0.5" style={{ fontSize: "10px", backgroundColor: "#fff3e8", color: "#ff4a00" }}>{e}</span>
                  ))}
                </div>
              </div>
              {isAdmin && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleToggle(wh.id, !wh.active)}
                    className="rounded px-2 py-1"
                    style={{ fontSize: "11px", border: "1px solid var(--color-slate-200)", backgroundColor: "white", cursor: "pointer", color: "var(--color-slate-600)" }}
                  >
                    {wh.active ? "Pause" : "Resume"}
                  </button>
                  <button onClick={() => handleDelete(wh.id)} className="flex items-center justify-center rounded p-1.5 transition-colors"
                    style={{ color: "var(--color-slate-400)", border: "none", backgroundColor: "transparent", cursor: "pointer" }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#b91c1c")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--color-slate-400)")}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function IntegrationsClient({ userRole, initialSettings, initialWebhooks }: Props) {
  const isAdmin = userRole === "admin" || userRole === "super_admin";

  const settingsByName = new Map(initialSettings.map((s) => [s.integration_name, s]));

  return (
    <div className="p-6 max-w-screen-lg mx-auto">
      <div className="mb-6">
        <h1 style={{ fontSize: "24px", fontWeight: 700, color: "var(--color-navy-800)" }}>Integrations</h1>
        <p style={{ fontSize: "14px", color: "var(--color-slate-500)", marginTop: "2px" }}>
          Connect your CRM to third-party platforms. {!isAdmin && "Contact your admin to manage API keys."}
        </p>
      </div>

      {!isAdmin && (
        <div className="flex items-start gap-2 rounded-xl px-4 py-3 mb-6" style={{ backgroundColor: "#fffbeb", border: "1px solid #fcd34d" }}>
          <AlertCircle size={15} style={{ color: "#b45309", marginTop: "1px", flexShrink: 0 }} />
          <p style={{ fontSize: "13px", color: "#b45309" }}>You can view integration status but only admins can add or change API credentials.</p>
        </div>
      )}

      <div className="flex flex-col gap-3 mb-6">
        <h2 style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-slate-500)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Property &amp; Market Data
        </h2>
        <IntegrationCard def={INTEGRATIONS[0]} setting={settingsByName.get("corelogic")} isAdmin={isAdmin} />
      </div>

      <div className="flex flex-col gap-3 mb-6">
        <h2 style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-slate-500)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Portals &amp; Marketing
        </h2>
        <IntegrationCard def={INTEGRATIONS[1]} setting={settingsByName.get("domain")} isAdmin={isAdmin} />
        <IntegrationCard def={INTEGRATIONS[2]} setting={settingsByName.get("ratemyagent")} isAdmin={isAdmin} />
      </div>

      <div className="flex flex-col gap-3 mb-6">
        <h2 style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-slate-500)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Operations
        </h2>
        <IntegrationCard def={INTEGRATIONS[3]} setting={settingsByName.get("inspectrealestate")} isAdmin={isAdmin} />
        <IntegrationCard def={INTEGRATIONS[4]} setting={settingsByName.get("reiformslive")} isAdmin={isAdmin} />
      </div>

      <div className="flex flex-col gap-3 mb-6">
        <h2 style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-slate-500)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Revenue
        </h2>
        <IntegrationCard def={INTEGRATIONS[5]} setting={settingsByName.get("movemein")} isAdmin={isAdmin} />
      </div>

      <div className="flex flex-col gap-3">
        <h2 style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-slate-500)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Automation
        </h2>
        <ZapierSection webhooks={initialWebhooks} isAdmin={isAdmin} />
      </div>
    </div>
  );
}
