"use client";

import { useState } from "react";
import { X, Trash2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Contact, Appraisal, Property, ComparableSale } from "@/types/database";

type AppraisalWithRelations = Appraisal & {
  contacts: { id: string; full_name: string; email: string | null; phone: string | null; type: string; status: string } | null;
  properties: { id: string; address: string; suburb: string; state: string; postcode: string; property_type: string } | null;
  users: { id: string; full_name: string } | null;
};

type Props = {
  appraisal: AppraisalWithRelations | null;
  contacts: Pick<Contact, "id" | "full_name" | "email" | "phone" | "type" | "status">[];
  onSaved: (appraisal: AppraisalWithRelations, isNew: boolean) => void;
  onDeleted: (id: string) => void;
  onClose: () => void;
};

const EMPTY_COMP: ComparableSale = { address: "", sale_price: null, sale_date: "" };
const AU_STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];
const PROPERTY_TYPES: Property["property_type"][] = ["house", "unit", "townhouse", "land", "commercial", "rural"];

export default function AppraisalModal({ appraisal, contacts, onSaved, onDeleted, onClose }: Props) {
  const isNew = !appraisal;

  const [contactId, setContactId] = useState(appraisal?.contact_id ?? "");
  const [appraisalDate, setAppraisalDate] = useState(appraisal?.appraisal_date ?? new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<Appraisal["status"]>(appraisal?.status ?? "warm");
  const [valueLow, setValueLow] = useState(appraisal?.estimated_value_low?.toString() ?? "");
  const [valueHigh, setValueHigh] = useState(appraisal?.estimated_value_high?.toString() ?? "");
  const [followUpDate, setFollowUpDate] = useState(appraisal?.follow_up_date ?? "");
  const [notes, setNotes] = useState(appraisal?.notes ?? "");

  const [comps, setComps] = useState<ComparableSale[]>(() => {
    const existing = appraisal?.comparable_sales ?? [];
    const padded = [...existing];
    while (padded.length < 3) padded.push({ ...EMPTY_COMP });
    return padded.slice(0, 3);
  });

  // Property fields — only editable on new appraisals
  const [propAddress, setPropAddress] = useState(appraisal?.properties?.address ?? "");
  const [propSuburb, setPropSuburb] = useState(appraisal?.properties?.suburb ?? "");
  const [propState, setPropState] = useState(appraisal?.properties?.state ?? "VIC");
  const [propPostcode, setPropPostcode] = useState(appraisal?.properties?.postcode ?? "");
  const [propType, setPropType] = useState<Property["property_type"]>(
    (appraisal?.properties?.property_type as Property["property_type"]) ?? "house"
  );

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function updateComp(idx: number, field: keyof ComparableSale, raw: string) {
    setComps((prev) =>
      prev.map((c, i) =>
        i !== idx ? c : { ...c, [field]: field === "sale_price" ? (raw ? Number(raw) : null) : raw }
      )
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!contactId) { setError("Please select a contact."); return; }
    if (!propAddress.trim()) { setError("Property address is required."); return; }
    if (!propSuburb.trim()) { setError("Property suburb is required."); return; }
    if (!propPostcode.trim()) { setError("Property postcode is required."); return; }

    setLoading(true);
    const supabase = createClient();
    const filteredComps = comps.filter((c) => c.address.trim());

    const SELECT = `*, contacts(id,full_name,email,phone,type,status), properties(id,address,suburb,state,postcode,property_type), users(id,full_name)`;

    if (isNew) {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) { setError("Not authenticated."); setLoading(false); return; }

      const { data: profile } = await supabase
        .from("users")
        .select("agency_id")
        .eq("id", authData.user.id)
        .single();

      if (!profile?.agency_id) { setError("Agency not found."); setLoading(false); return; }

      const { data: property, error: propErr } = await supabase
        .from("properties")
        .insert({
          agency_id: profile.agency_id,
          address: propAddress.trim(),
          suburb: propSuburb.trim(),
          state: propState,
          postcode: propPostcode.trim(),
          property_type: propType,
          status: "appraisal" as const,
          bedrooms: null,
          bathrooms: null,
          parking: null,
          land_size: null,
          notes: null,
          photo_urls: [],
        })
        .select()
        .single();

      if (propErr || !property) { setError("Failed to create property."); setLoading(false); return; }

      const { data: created, error: apprErr } = await supabase
        .from("appraisals")
        .insert({
          agency_id: profile.agency_id,
          contact_id: contactId,
          property_id: property.id,
          appraised_by: authData.user.id,
          appraisal_date: appraisalDate,
          status,
          estimated_value_low: valueLow ? Number(valueLow) : null,
          estimated_value_high: valueHigh ? Number(valueHigh) : null,
          follow_up_date: followUpDate || null,
          notes: notes.trim() || null,
          comparable_sales: filteredComps,
        })
        .select(SELECT)
        .single();

      if (apprErr || !created) { setError("Failed to create appraisal."); setLoading(false); return; }
      onSaved(created as unknown as AppraisalWithRelations, true);
    } else {
      const { data: updated, error: upErr } = await supabase
        .from("appraisals")
        .update({
          contact_id: contactId,
          appraisal_date: appraisalDate,
          status,
          estimated_value_low: valueLow ? Number(valueLow) : null,
          estimated_value_high: valueHigh ? Number(valueHigh) : null,
          follow_up_date: followUpDate || null,
          notes: notes.trim() || null,
          comparable_sales: filteredComps,
        })
        .eq("id", appraisal.id)
        .select(SELECT)
        .single();

      if (upErr || !updated) { setError("Failed to update appraisal."); setLoading(false); return; }
      onSaved(updated as unknown as AppraisalWithRelations, false);
    }

    setLoading(false);
  }

  async function handleDelete() {
    if (!appraisal) return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("appraisals").delete().eq("id", appraisal.id);
    onDeleted(appraisal.id);
    setDeleting(false);
  }

  const inp = {
    width: "100%",
    padding: "9px 12px",
    fontSize: "14px",
    border: "1px solid var(--color-slate-200)",
    borderRadius: "8px",
    outline: "none",
    backgroundColor: "var(--color-slate-50)",
  };

  const lbl: React.CSSProperties = {
    fontSize: "13px",
    fontWeight: 500,
    color: "var(--color-slate-700)",
    marginBottom: "6px",
    display: "block",
  };

  const section = {
    paddingTop: "20px",
    borderTop: "1px solid var(--color-slate-100)",
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-end z-50"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="h-full overflow-y-auto flex flex-col"
        style={{ width: "560px", backgroundColor: "white", boxShadow: "-4px 0 24px rgba(0,0,0,0.12)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--color-slate-200)" }}
        >
          <h2 style={{ fontSize: "18px", fontWeight: 600, color: "var(--color-navy-800)" }}>
            {isNew ? "New Appraisal" : "Edit Appraisal"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 transition-colors"
            style={{ color: "var(--color-slate-400)" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--color-slate-700)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--color-slate-400)")}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 px-6 py-6 flex flex-col gap-5">
          {error && (
            <div className="rounded-lg px-4 py-3" style={{ backgroundColor: "#fee2e2", color: "#b91c1c", fontSize: "13px" }}>
              {error}
            </div>
          )}

          {/* Contact */}
          <div>
            <label style={lbl}>Contact *</label>
            <select value={contactId} onChange={(e) => setContactId(e.target.value)} style={inp}>
              <option value="">Select a contact…</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>{c.full_name}{c.phone ? ` — ${c.phone}` : ""}</option>
              ))}
            </select>
          </div>

          {/* Status + Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={lbl}>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as Appraisal["status"])} style={inp}>
                <option value="hot">Hot</option>
                <option value="warm">Warm</option>
                <option value="cold">Cold</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Appraisal Date</label>
              <input type="date" value={appraisalDate} onChange={(e) => setAppraisalDate(e.target.value)} style={inp} />
            </div>
          </div>

          {/* Estimated Value */}
          <div>
            <label style={lbl}>Estimated Value Range</label>
            <div className="flex items-center gap-3">
              <input
                type="number" placeholder="Low e.g. 800000" value={valueLow}
                onChange={(e) => setValueLow(e.target.value)} style={inp} min="0"
              />
              <span style={{ color: "var(--color-slate-400)", flexShrink: 0 }}>–</span>
              <input
                type="number" placeholder="High e.g. 900000" value={valueHigh}
                onChange={(e) => setValueHigh(e.target.value)} style={inp} min="0"
              />
            </div>
          </div>

          {/* Property */}
          <div style={section}>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-slate-500)", marginBottom: "14px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Property
            </p>
            {!isNew ? (
              <div className="rounded-lg p-3" style={{ backgroundColor: "var(--color-slate-50)", border: "1px solid var(--color-slate-200)", fontSize: "14px", color: "var(--color-slate-700)" }}>
                <div style={{ fontWeight: 500 }}>{appraisal.properties?.address ?? "—"}</div>
                <div style={{ fontSize: "13px", color: "var(--color-slate-400)", marginTop: "2px" }}>
                  {[appraisal.properties?.suburb, appraisal.properties?.state, appraisal.properties?.postcode].filter(Boolean).join(", ")}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div>
                  <label style={lbl}>Address *</label>
                  <input type="text" placeholder="e.g. 42 Oak Street" value={propAddress} onChange={(e) => setPropAddress(e.target.value)} style={inp} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label style={lbl}>Suburb *</label>
                    <input type="text" placeholder="e.g. Richmond" value={propSuburb} onChange={(e) => setPropSuburb(e.target.value)} style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>State</label>
                    <select value={propState} onChange={(e) => setPropState(e.target.value)} style={inp}>
                      {AU_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Postcode *</label>
                    <input type="text" placeholder="3000" value={propPostcode} onChange={(e) => setPropPostcode(e.target.value)} style={inp} maxLength={4} />
                  </div>
                </div>
                <div>
                  <label style={lbl}>Property Type</label>
                  <select value={propType} onChange={(e) => setPropType(e.target.value as Property["property_type"])} style={inp}>
                    {PROPERTY_TYPES.map((t) => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* CMA — Comparable Sales */}
          <div style={section}>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-slate-500)", marginBottom: "14px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Comparable Sales (CMA)
            </p>
            <div className="flex flex-col gap-3">
              {comps.map((comp, idx) => (
                <div key={idx} className="rounded-lg p-3 flex flex-col gap-2" style={{ border: "1px solid var(--color-slate-200)", backgroundColor: "var(--color-slate-50)" }}>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-slate-400)" }}>Sale #{idx + 1}</div>
                  <input
                    type="text" placeholder="Address e.g. 38 Oak Street, Richmond"
                    value={comp.address} onChange={(e) => updateComp(idx, "address", e.target.value)}
                    style={{ ...inp, backgroundColor: "white" }}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number" placeholder="Sale price e.g. 850000"
                      value={comp.sale_price ?? ""} onChange={(e) => updateComp(idx, "sale_price", e.target.value)}
                      style={{ ...inp, backgroundColor: "white" }} min="0"
                    />
                    <input
                      type="date" value={comp.sale_date} onChange={(e) => updateComp(idx, "sale_date", e.target.value)}
                      style={{ ...inp, backgroundColor: "white" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Follow-up + Notes */}
          <div style={section}>
            <div className="flex flex-col gap-4">
              <div>
                <label style={lbl}>Follow-up Date</label>
                <input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} style={inp} />
              </div>
              <div>
                <label style={lbl}>Notes</label>
                <textarea
                  value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any notes about this appraisal…"
                  rows={4} style={{ ...inp, resize: "vertical" }}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-auto pt-4" style={{ borderTop: "1px solid var(--color-slate-100)" }}>
            {!isNew && !confirmDelete && (
              <button
                type="button" onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-2 rounded-lg px-4 py-2.5 transition-colors"
                style={{ fontSize: "13px", border: "1px solid var(--color-slate-200)", color: "#b91c1c" }}
              >
                <Trash2 size={14} /> Delete
              </button>
            )}

            {confirmDelete && (
              <div className="flex items-center gap-2">
                <span style={{ fontSize: "13px", color: "#b91c1c" }}>Are you sure?</span>
                <button
                  type="button" onClick={handleDelete} disabled={deleting}
                  className="rounded-lg px-3 py-2 font-medium"
                  style={{ fontSize: "13px", backgroundColor: "#b91c1c", color: "white" }}
                >
                  {deleting ? <Loader2 size={14} className="animate-spin" /> : "Yes, delete"}
                </button>
                <button
                  type="button" onClick={() => setConfirmDelete(false)}
                  className="rounded-lg px-3 py-2"
                  style={{ fontSize: "13px", border: "1px solid var(--color-slate-200)" }}
                >
                  Cancel
                </button>
              </div>
            )}

            <div className="flex items-center gap-3 ml-auto">
              <button
                type="button" onClick={onClose}
                className="rounded-lg px-4 py-2.5 transition-colors"
                style={{ fontSize: "14px", border: "1px solid var(--color-slate-200)", color: "var(--color-slate-700)" }}
              >
                Cancel
              </button>
              <button
                type="submit" disabled={loading}
                className="flex items-center gap-2 rounded-lg px-5 py-2.5 font-medium transition-colors"
                style={{ fontSize: "14px", backgroundColor: "var(--color-navy-800)", color: "white" }}
                onMouseEnter={(e) => !loading && ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-navy-700)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-navy-800)")}
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                {isNew ? "Create Appraisal" : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
