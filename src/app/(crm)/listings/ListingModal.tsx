"use client";

import { useState } from "react";
import { X, Trash2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Listing } from "@/types/database";

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

type Props = {
  listing: ListingWithRelations | null;
  properties: PropertyOption[];
  onSaved: (listing: ListingWithRelations, isNew: boolean) => void;
  onDeleted: (id: string) => void;
  onClose: () => void;
};

const SELECT = `*, properties(id,address,suburb,state,postcode,property_type), users:listed_by(id,full_name)`;

export default function ListingModal({ listing, properties, onSaved, onDeleted, onClose }: Props) {
  const isNew = !listing;

  const [propertyId, setPropertyId] = useState(listing?.property_id ?? "");
  const [listPrice, setListPrice] = useState(listing?.list_price?.toString() ?? "");
  const [listDate, setListDate] = useState(listing?.list_date ?? new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<Listing["status"]>(listing?.status ?? "active");
  const [marketingBudget, setMarketingBudget] = useState(listing?.marketing_budget?.toString() ?? "");

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!propertyId) {
      setError("Please select a property.");
      return;
    }
    if (!listDate) {
      setError("List date is required.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const payload = {
      property_id: propertyId,
      list_price: listPrice ? Number(listPrice) : null,
      list_date: listDate,
      status,
      marketing_budget: marketingBudget ? Number(marketingBudget) : null,
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
        .from("listings")
        .insert({
          ...payload,
          agency_id: profile.agency_id,
          listed_by: authData.user.id,
          contact_id: null,
          enquiries_count: 0,
          open_home_count: 0,
          price_feedback: null,
          offers_received: 0,
          contracts_out: 0,
          vendor_notes: null,
          sold_price: null,
        })
        .select(SELECT)
        .single();

      if (insertErr || !created) {
        setError("Failed to create listing. Please try again.");
        setLoading(false);
        return;
      }

      onSaved(created as unknown as ListingWithRelations, true);
    } else {
      const { data: updated, error: updateErr } = await supabase
        .from("listings")
        .update(payload)
        .eq("id", listing.id)
        .select(SELECT)
        .single();

      if (updateErr || !updated) {
        setError("Failed to update listing. Please try again.");
        setLoading(false);
        return;
      }

      onSaved(updated as unknown as ListingWithRelations, false);
    }

    setLoading(false);
  }

  async function handleDelete() {
    if (!listing) return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("listings").delete().eq("id", listing.id);
    onDeleted(listing.id);
    setDeleting(false);
  }

  const inp: React.CSSProperties = {
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

  return (
    <div
      className="fixed inset-0 flex items-center justify-end z-50"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="h-full overflow-y-auto flex flex-col"
        style={{
          width: "480px",
          backgroundColor: "white",
          boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--color-slate-200)" }}
        >
          <h2 style={{ fontSize: "18px", fontWeight: 600, color: "var(--color-navy-800)" }}>
            {isNew ? "New Listing" : "Edit Listing"}
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
            <div
              className="rounded-lg px-4 py-3"
              style={{ backgroundColor: "#fee2e2", color: "#b91c1c", fontSize: "13px" }}
            >
              {error}
            </div>
          )}

          {/* Property */}
          <div>
            <label style={lbl}>Property *</label>
            {!isNew && listing.properties ? (
              <div
                className="rounded-lg p-3"
                style={{
                  backgroundColor: "var(--color-slate-50)",
                  border: "1px solid var(--color-slate-200)",
                  fontSize: "14px",
                  color: "var(--color-slate-700)",
                }}
              >
                <div style={{ fontWeight: 500 }}>{listing.properties.address}</div>
                <div style={{ fontSize: "13px", color: "var(--color-slate-400)", marginTop: "2px" }}>
                  {[listing.properties.suburb, listing.properties.state].filter(Boolean).join(", ")}
                </div>
              </div>
            ) : (
              <select
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                style={inp}
                autoFocus
              >
                <option value="">Select a property…</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.address}{p.suburb ? ` — ${p.suburb}` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Status + List Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={lbl}>Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Listing["status"])}
                style={inp}
              >
                <option value="active">Active</option>
                <option value="under_offer">Under Offer</option>
                <option value="sold">Sold</option>
                <option value="leased">Leased</option>
                <option value="withdrawn">Withdrawn</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Date Listed *</label>
              <input
                type="date"
                value={listDate}
                onChange={(e) => setListDate(e.target.value)}
                style={inp}
              />
            </div>
          </div>

          {/* List Price */}
          <div>
            <label style={lbl}>List Price</label>
            <div className="relative">
              <span
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ fontSize: "14px", color: "var(--color-slate-400)", pointerEvents: "none" }}
              >
                $
              </span>
              <input
                type="number"
                placeholder="e.g. 850000"
                value={listPrice}
                onChange={(e) => setListPrice(e.target.value)}
                min="0"
                style={{ ...inp, paddingLeft: "24px" }}
              />
            </div>
          </div>

          {/* Marketing Budget */}
          <div>
            <label style={lbl}>Marketing Budget</label>
            <div className="relative">
              <span
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ fontSize: "14px", color: "var(--color-slate-400)", pointerEvents: "none" }}
              >
                $
              </span>
              <input
                type="number"
                placeholder="e.g. 5000"
                value={marketingBudget}
                onChange={(e) => setMarketingBudget(e.target.value)}
                min="0"
                style={{ ...inp, paddingLeft: "24px" }}
              />
            </div>
          </div>

          {/* Read-only days on market for existing listings */}
          {!isNew && listing.days_on_market != null && (
            <div>
              <label style={lbl}>Days on Market</label>
              <div
                className="rounded-lg p-3"
                style={{
                  backgroundColor: "var(--color-slate-50)",
                  border: "1px solid var(--color-slate-200)",
                  fontSize: "14px",
                  color: "var(--color-slate-700)",
                }}
              >
                {listing.days_on_market} days
              </div>
            </div>
          )}

          {/* Agent (read-only display for existing) */}
          {!isNew && listing.users && (
            <div>
              <label style={lbl}>Listed By</label>
              <div
                className="rounded-lg p-3"
                style={{
                  backgroundColor: "var(--color-slate-50)",
                  border: "1px solid var(--color-slate-200)",
                  fontSize: "14px",
                  color: "var(--color-slate-700)",
                }}
              >
                {listing.users.full_name}
              </div>
            </div>
          )}

          {/* Actions */}
          <div
            className="flex items-center gap-3 mt-auto pt-4"
            style={{ borderTop: "1px solid var(--color-slate-100)" }}
          >
            {!isNew && !confirmDelete && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-2 rounded-lg px-4 py-2.5 transition-colors"
                style={{
                  fontSize: "13px",
                  border: "1px solid var(--color-slate-200)",
                  color: "#b91c1c",
                }}
              >
                <Trash2 size={14} />
                Delete
              </button>
            )}

            {confirmDelete && (
              <div className="flex items-center gap-2">
                <span style={{ fontSize: "13px", color: "#b91c1c" }}>Are you sure?</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="rounded-lg px-3 py-2 font-medium"
                  style={{ fontSize: "13px", backgroundColor: "#b91c1c", color: "white" }}
                >
                  {deleting ? <Loader2 size={14} className="animate-spin" /> : "Yes, delete"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-lg px-3 py-2"
                  style={{ fontSize: "13px", border: "1px solid var(--color-slate-200)" }}
                >
                  Cancel
                </button>
              </div>
            )}

            <div className="flex items-center gap-3 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2.5 transition-colors"
                style={{
                  fontSize: "14px",
                  border: "1px solid var(--color-slate-200)",
                  color: "var(--color-slate-700)",
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 rounded-lg px-5 py-2.5 font-medium transition-colors"
                style={{
                  fontSize: "14px",
                  backgroundColor: "var(--color-navy-800)",
                  color: "white",
                }}
                onMouseEnter={(e) =>
                  !loading && ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-navy-700)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-navy-800)")
                }
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                {isNew ? "Create Listing" : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
