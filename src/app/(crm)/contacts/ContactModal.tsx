"use client";

import { useState } from "react";
import { X, Trash2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Contact } from "@/types/database";


type Props = {
  contact: Contact | null;
  onSaved: (contact: Contact, isNew: boolean) => void;
  onDeleted: (id: string) => void;
  onClose: () => void;
};

const EMPTY_FORM = {
  full_name: "",
  email: "",
  phone: "",
  type: "buyer" as Contact["type"],
  status: "cold" as Contact["status"],
  notes: "",
  seller_likelihood: "" as Contact["seller_likelihood"] | "",
};

export default function ContactModal({ contact, onSaved, onDeleted, onClose }: Props) {
  const isNew = !contact;
  const [form, setForm] = useState(
    contact
      ? {
          full_name: contact.full_name,
          email: contact.email ?? "",
          phone: contact.phone ?? "",
          type: contact.type,
          status: contact.status,
          notes: contact.notes ?? "",
          seller_likelihood: (contact.seller_likelihood ?? "") as Contact["seller_likelihood"] | "",
        }
      : EMPTY_FORM
  );
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.full_name.trim()) {
      setError("Full name is required.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const payload = {
      full_name: form.full_name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      type: form.type,
      status: form.status,
      notes: form.notes.trim() || null,
      seller_likelihood: (form.seller_likelihood || null) as Contact["seller_likelihood"],
    };

    if (isNew) {
      const { data: user } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("users")
        .select("agency_id")
        .eq("id", user.user!.id)
        .single();

      const { data, error: err } = await supabase
        .from("contacts")
        .insert({ ...payload, agency_id: profile!.agency_id!, created_by: user.user!.id })
        .select()
        .single();

      if (err) {
        if (err.code === "23505") {
          setError(
            err.message.includes("email")
              ? "A contact with this email already exists in your agency."
              : "A contact with this phone number already exists in your agency."
          );
        } else {
          setError("Failed to create contact. Please try again.");
        }
        setLoading(false);
        return;
      }

      onSaved(data, true);
    } else {
      const { data, error: err } = await supabase
        .from("contacts")
        .update(payload)
        .eq("id", contact.id)
        .select()
        .single();

      if (err) {
        if (err.code === "23505") {
          setError(
            err.message.includes("email")
              ? "A contact with this email already exists in your agency."
              : "A contact with this phone number already exists in your agency."
          );
        } else {
          setError("Failed to update contact. Please try again.");
        }
        setLoading(false);
        return;
      }

      onSaved(data, false);
    }

    setLoading(false);
  }

  async function handleDelete() {
    if (!contact) return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("contacts").delete().eq("id", contact.id);
    onDeleted(contact.id);
    setDeleting(false);
  }

  const inputStyle = {
    width: "100%",
    padding: "9px 12px",
    fontSize: "14px",
    border: "1px solid var(--color-slate-200)",
    borderRadius: "8px",
    outline: "none",
    backgroundColor: "var(--color-slate-50)",
  };

  const labelStyle = {
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
            {isNew ? "Add Contact" : "Edit Contact"}
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

          <div>
            <label style={labelStyle}>Full Name *</label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => set("full_name", e.target.value)}
              placeholder="e.g. Sarah Johnson"
              style={inputStyle}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Type</label>
              <select
                value={form.type}
                onChange={(e) => set("type", e.target.value as Contact["type"])}
                style={inputStyle}
              >
                <option value="buyer">Buyer</option>
                <option value="vendor">Vendor</option>
                <option value="tenant">Tenant</option>
                <option value="landlord">Landlord</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value as Contact["status"])}
                style={inputStyle}
              >
                <option value="cold">Cold</option>
                <option value="warm">Warm</option>
                <option value="hot">Hot</option>
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Seller Likelihood</label>
            <select
              value={form.seller_likelihood ?? ""}
              onChange={(e) => set("seller_likelihood", e.target.value as Contact["seller_likelihood"] | "")}
              style={inputStyle}
            >
              <option value="">Unknown</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="email@example.com"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="04XX XXX XXX"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Any relevant notes about this contact…"
              rows={4}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-auto pt-4" style={{ borderTop: "1px solid var(--color-slate-100)" }}>
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
                {isNew ? "Add Contact" : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
