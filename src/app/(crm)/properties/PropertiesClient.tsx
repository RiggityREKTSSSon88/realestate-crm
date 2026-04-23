"use client";

import { useState, useMemo, useRef } from "react";
import {
  Plus, Search, Filter, ChevronUp, ChevronDown, ChevronsUpDown,
  X, Trash2, Loader2, ImagePlus, Image as ImageIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Property } from "@/types/database";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  appraisal:   { bg: "#f0f9ff", text: "#0369a1" },
  listed:      { bg: "#d1fae5", text: "#065f46" },
  under_offer: { bg: "#fef3c7", text: "#b45309" },
  sold:        { bg: "#fee2e2", text: "#b91c1c" },
  leased:      { bg: "#ede9fe", text: "#6d28d9" },
  withdrawn:   { bg: "#f1f5f9", text: "#64748b" },
};

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  house:      { bg: "#dbeafe", text: "#1d4ed8" },
  unit:       { bg: "#ede9fe", text: "#6d28d9" },
  townhouse:  { bg: "#d1fae5", text: "#065f46" },
  land:       { bg: "#fef3c7", text: "#b45309" },
  commercial: { bg: "#fee2e2", text: "#b91c1c" },
  rural:      { bg: "#f0f9ff", text: "#0369a1" },
};

const AU_STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];

type SortField = "address" | "status" | "created_at";
type SortDir = "asc" | "desc";

const EMPTY_FORM = {
  address: "",
  suburb: "",
  state: "VIC",
  postcode: "",
  property_type: "house" as Property["property_type"],
  status: "appraisal" as Property["status"],
  bedrooms: "",
  bathrooms: "",
  parking: "",
  land_size: "",
  notes: "",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  fontSize: "14px",
  border: "1px solid var(--color-slate-200)",
  borderRadius: "8px",
  outline: "none",
  backgroundColor: "var(--color-slate-50)",
};

const labelStyle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 500,
  color: "var(--color-slate-700)",
  marginBottom: "6px",
  display: "block",
};

const sectionStyle: React.CSSProperties = {
  paddingTop: "20px",
  borderTop: "1px solid var(--color-slate-100)",
};

// ─── Modal ────────────────────────────────────────────────────────────────────

type ModalProps = {
  property: Property | null;
  onSaved: (property: Property, isNew: boolean) => void;
  onDeleted: (id: string) => void;
  onClose: () => void;
};

function PropertyModal({ property, onSaved, onDeleted, onClose }: ModalProps) {
  const isNew = !property;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState(
    property
      ? {
          address:       property.address,
          suburb:        property.suburb,
          state:         property.state,
          postcode:      property.postcode,
          property_type: property.property_type,
          status:        property.status,
          bedrooms:      property.bedrooms != null ? String(property.bedrooms) : "",
          bathrooms:     property.bathrooms != null ? String(property.bathrooms) : "",
          parking:       property.parking != null ? String(property.parking) : "",
          land_size:     property.land_size != null ? String(property.land_size) : "",
          notes:         property.notes ?? "",
        }
      : EMPTY_FORM
  );

  // Photos: existing saved URLs + new local File objects
  const [savedPhotos, setSavedPhotos] = useState<string[]>(property?.photo_urls ?? []);
  const [newFiles, setNewFiles] = useState<{ file: File; preview: string }[]>([]);
  const [removedPhotos, setRemovedPhotos] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setError(null);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const validFiles = files.filter((f) => f.type.startsWith("image/")).slice(0, 10 - savedPhotos.length - newFiles.length);
    const previews = validFiles.map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setNewFiles((prev) => [...prev, ...previews]);
    // Reset input so the same file can be re-selected
    e.target.value = "";
  }

  function removeNewFile(idx: number) {
    setNewFiles((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  }

  function removeSavedPhoto(url: string) {
    setSavedPhotos((prev) => prev.filter((u) => u !== url));
    setRemovedPhotos((prev) => [...prev, url]);
  }

  async function uploadPhotos(propertyId: string, agencyId: string): Promise<string[]> {
    if (newFiles.length === 0) return [];
    const supabase = createClient();
    const uploaded: string[] = [];

    for (const { file } of newFiles) {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${agencyId}/${propertyId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("property-photos")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (!upErr) {
        const { data: urlData } = supabase.storage.from("property-photos").getPublicUrl(path);
        uploaded.push(urlData.publicUrl);
      }
    }

    return uploaded;
  }

  async function deleteRemovedPhotos() {
    if (removedPhotos.length === 0) return;
    const supabase = createClient();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const paths = removedPhotos.map((url) =>
      url.replace(`${supabaseUrl}/storage/v1/object/public/property-photos/`, "")
    );
    await supabase.storage.from("property-photos").remove(paths);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.address.trim()) { setError("Address is required."); return; }
    if (!form.suburb.trim())  { setError("Suburb is required."); return; }
    if (!form.postcode.trim()) { setError("Postcode is required."); return; }

    setLoading(true);
    const supabase = createClient();

    const basePayload = {
      address:       form.address.trim(),
      suburb:        form.suburb.trim(),
      state:         form.state,
      postcode:      form.postcode.trim(),
      property_type: form.property_type,
      status:        form.status,
      bedrooms:      form.bedrooms !== "" ? Number(form.bedrooms) : null,
      bathrooms:     form.bathrooms !== "" ? Number(form.bathrooms) : null,
      parking:       form.parking !== "" ? Number(form.parking) : null,
      land_size:     form.land_size !== "" ? Number(form.land_size) : null,
      notes:         form.notes.trim() || null,
    };

    if (isNew) {
      const { data: user } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("users").select("agency_id").eq("id", user.user!.id).single();

      // Create property first to get the ID
      const { data: created, error: err } = await supabase
        .from("properties")
        .insert({ ...basePayload, agency_id: profile!.agency_id!, photo_urls: [] })
        .select()
        .single();

      if (err || !created) { setError("Failed to create property."); setLoading(false); return; }

      // Upload photos and update the record
      const uploadedUrls = await uploadPhotos(created.id, profile!.agency_id!);
      if (uploadedUrls.length > 0) {
        const { data: withPhotos, error: upErr } = await supabase
          .from("properties")
          .update({ photo_urls: uploadedUrls })
          .eq("id", created.id)
          .select()
          .single();
        if (!upErr && withPhotos) { onSaved(withPhotos as Property, true); setLoading(false); return; }
      }

      onSaved(created as Property, true);
    } else {
      await deleteRemovedPhotos();
      const { data: user } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("users").select("agency_id").eq("id", user.user!.id).single();

      const uploadedUrls = await uploadPhotos(property.id, profile!.agency_id!);
      const finalPhotos = [...savedPhotos, ...uploadedUrls];

      const { data, error: err } = await supabase
        .from("properties")
        .update({ ...basePayload, photo_urls: finalPhotos })
        .eq("id", property.id)
        .select()
        .single();

      if (err) { setError("Failed to update property."); setLoading(false); return; }
      onSaved(data as Property, false);
    }

    setLoading(false);
  }

  async function handleDelete() {
    if (!property) return;
    setDeleting(true);
    const supabase = createClient();
    // Delete all stored photos first
    if (property.photo_urls.length > 0) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const paths = property.photo_urls.map((url) =>
        url.replace(`${supabaseUrl}/storage/v1/object/public/property-photos/`, "")
      );
      await supabase.storage.from("property-photos").remove(paths);
    }
    await supabase.from("properties").delete().eq("id", property.id);
    onDeleted(property.id);
    setDeleting(false);
  }

  const totalPhotos = savedPhotos.length + newFiles.length;
  const canAddMore = totalPhotos < 10;

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
        <div className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--color-slate-200)" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 600, color: "var(--color-navy-800)" }}>
            {isNew ? "Add Property" : "Edit Property"}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 transition-colors"
            style={{ color: "var(--color-slate-400)" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--color-slate-700)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--color-slate-400)")}>
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 px-6 py-6 flex flex-col gap-5">
          {error && (
            <div className="rounded-lg px-4 py-3"
              style={{ backgroundColor: "#fee2e2", color: "#b91c1c", fontSize: "13px" }}>
              {error}
            </div>
          )}

          {/* Address */}
          <div>
            <label style={labelStyle}>Address *</label>
            <input type="text" value={form.address} onChange={(e) => set("address", e.target.value)}
              placeholder="e.g. 42 Harbour St" style={inputStyle} autoFocus />
          </div>

          {/* Suburb + State */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Suburb *</label>
              <input type="text" value={form.suburb} onChange={(e) => set("suburb", e.target.value)}
                placeholder="e.g. Richmond" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>State</label>
              <select value={form.state} onChange={(e) => set("state", e.target.value)} style={inputStyle}>
                {AU_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Postcode */}
          <div>
            <label style={labelStyle}>Postcode *</label>
            <input type="text" value={form.postcode} onChange={(e) => set("postcode", e.target.value)}
              placeholder="e.g. 3121" maxLength={4} style={inputStyle} />
          </div>

          {/* Type + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Property Type</label>
              <select value={form.property_type}
                onChange={(e) => set("property_type", e.target.value as Property["property_type"])}
                style={inputStyle}>
                <option value="house">House</option>
                <option value="unit">Unit</option>
                <option value="townhouse">Townhouse</option>
                <option value="land">Land</option>
                <option value="commercial">Commercial</option>
                <option value="rural">Rural</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select value={form.status}
                onChange={(e) => set("status", e.target.value as Property["status"])}
                style={inputStyle}>
                <option value="appraisal">Appraisal</option>
                <option value="listed">Listed</option>
                <option value="under_offer">Under Offer</option>
                <option value="sold">Sold</option>
                <option value="leased">Leased</option>
                <option value="withdrawn">Withdrawn</option>
              </select>
            </div>
          </div>

          {/* Beds / Baths / Parking */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label style={labelStyle}>Bedrooms</label>
              <input type="number" min={0} value={form.bedrooms}
                onChange={(e) => set("bedrooms", e.target.value)} placeholder="—" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Bathrooms</label>
              <input type="number" min={0} value={form.bathrooms}
                onChange={(e) => set("bathrooms", e.target.value)} placeholder="—" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Parking</label>
              <input type="number" min={0} value={form.parking}
                onChange={(e) => set("parking", e.target.value)} placeholder="—" style={inputStyle} />
            </div>
          </div>

          {/* Land size */}
          <div>
            <label style={labelStyle}>Land Size (m²)</label>
            <input type="number" min={0} value={form.land_size}
              onChange={(e) => set("land_size", e.target.value)} placeholder="e.g. 650" style={inputStyle} />
          </div>

          {/* Notes */}
          <div style={sectionStyle}>
            <label style={labelStyle}>Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Property notes, key features, vendor instructions…"
              rows={4}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          {/* Photos */}
          <div style={sectionStyle}>
            <div className="flex items-center justify-between mb-3">
              <label style={{ ...labelStyle, marginBottom: 0 }}>
                Photos{totalPhotos > 0 ? ` (${totalPhotos}/10)` : ""}
              </label>
              {canAddMore && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors"
                  style={{ fontSize: "13px", border: "1px solid var(--color-slate-200)", color: "var(--color-slate-600)" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-slate-50)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "transparent")}
                >
                  <ImagePlus size={14} /> Add photos
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />

            {totalPhotos === 0 ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex flex-col items-center justify-center gap-2 rounded-xl transition-colors"
                style={{
                  padding: "32px 16px",
                  border: "2px dashed var(--color-slate-200)",
                  color: "var(--color-slate-400)",
                  backgroundColor: "var(--color-slate-50)",
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "var(--color-slate-300)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "var(--color-slate-200)")}
              >
                <ImageIcon size={24} />
                <span style={{ fontSize: "13px" }}>Click to upload photos</span>
                <span style={{ fontSize: "12px", color: "var(--color-slate-300)" }}>JPG, PNG, WEBP — up to 10</span>
              </button>
            ) : (
              <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                {/* Saved photos */}
                {savedPhotos.map((url) => (
                  <div key={url} className="relative rounded-lg overflow-hidden"
                    style={{ aspectRatio: "4/3", backgroundColor: "var(--color-slate-100)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeSavedPhoto(url)}
                      className="absolute top-1 right-1 flex items-center justify-center rounded-full"
                      style={{ width: 22, height: 22, backgroundColor: "rgba(0,0,0,0.6)", color: "white" }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {/* New (unsaved) previews */}
                {newFiles.map(({ preview }, idx) => (
                  <div key={preview} className="relative rounded-lg overflow-hidden"
                    style={{ aspectRatio: "4/3", backgroundColor: "var(--color-slate-100)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt="" className="w-full h-full object-cover" />
                    <div className="absolute top-1 left-1 rounded px-1"
                      style={{ fontSize: "10px", backgroundColor: "rgba(0,0,0,0.6)", color: "white" }}>
                      New
                    </div>
                    <button
                      type="button"
                      onClick={() => removeNewFile(idx)}
                      className="absolute top-1 right-1 flex items-center justify-center rounded-full"
                      style={{ width: 22, height: 22, backgroundColor: "rgba(0,0,0,0.6)", color: "white" }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {/* Add more tile */}
                {canAddMore && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center rounded-lg gap-1 transition-colors"
                    style={{
                      aspectRatio: "4/3",
                      border: "2px dashed var(--color-slate-200)",
                      color: "var(--color-slate-400)",
                      backgroundColor: "var(--color-slate-50)",
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "var(--color-slate-300)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "var(--color-slate-200)")}
                  >
                    <ImagePlus size={18} />
                    <span style={{ fontSize: "11px" }}>Add</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-auto pt-4"
            style={{ borderTop: "1px solid var(--color-slate-100)" }}>
            {!isNew && !confirmDelete && (
              <button type="button" onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-2 rounded-lg px-4 py-2.5 transition-colors"
                style={{ fontSize: "13px", border: "1px solid var(--color-slate-200)", color: "#b91c1c" }}>
                <Trash2 size={14} /> Delete
              </button>
            )}

            {confirmDelete && (
              <div className="flex items-center gap-2">
                <span style={{ fontSize: "13px", color: "#b91c1c" }}>Are you sure?</span>
                <button type="button" onClick={handleDelete} disabled={deleting}
                  className="rounded-lg px-3 py-2 font-medium"
                  style={{ fontSize: "13px", backgroundColor: "#b91c1c", color: "white" }}>
                  {deleting ? <Loader2 size={14} className="animate-spin" /> : "Yes, delete"}
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)}
                  className="rounded-lg px-3 py-2"
                  style={{ fontSize: "13px", border: "1px solid var(--color-slate-200)" }}>
                  Cancel
                </button>
              </div>
            )}

            <div className="flex items-center gap-3 ml-auto">
              <button type="button" onClick={onClose}
                className="rounded-lg px-4 py-2.5 transition-colors"
                style={{ fontSize: "14px", border: "1px solid var(--color-slate-200)", color: "var(--color-slate-700)" }}>
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className="flex items-center gap-2 rounded-lg px-5 py-2.5 font-medium transition-colors"
                style={{ fontSize: "14px", backgroundColor: "var(--color-navy-800)", color: "white" }}
                onMouseEnter={(e) => !loading && ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-navy-700)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-navy-800)")}>
                {loading && <Loader2 size={14} className="animate-spin" />}
                {loading ? "Saving…" : isNew ? "Add Property" : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main list component ──────────────────────────────────────────────────────

export default function PropertiesClient({ initialProperties }: { initialProperties: Property[] }) {
  const [properties, setProperties] = useState<Property[]>(initialProperties);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editProperty, setEditProperty] = useState<Property | null>(null);

  const PAGE_SIZE = 20;

  const filtered = useMemo(() => {
    let result = properties;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p) => p.address.toLowerCase().includes(q) || p.suburb.toLowerCase().includes(q));
    }
    if (typeFilter !== "all") result = result.filter((p) => p.property_type === typeFilter);
    if (statusFilter !== "all") result = result.filter((p) => p.status === statusFilter);
    result = [...result].sort((a, b) => {
      const cmp = String(a[sortField] ?? "").localeCompare(String(b[sortField] ?? ""));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [properties, search, typeFilter, statusFilter, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
    setPage(1);
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ChevronsUpDown size={14} className="opacity-40" />;
    return sortDir === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  }

  function onSaved(p: Property, isNew: boolean) {
    if (isNew) setProperties((prev) => [p, ...prev]);
    else setProperties((prev) => prev.map((x) => (x.id === p.id ? p : x)));
    setShowModal(false);
    setEditProperty(null);
  }

  function onDeleted(id: string) {
    setProperties((prev) => prev.filter((p) => p.id !== id));
    setShowModal(false);
    setEditProperty(null);
  }

  function formatBedBath(p: Property) {
    const parts: string[] = [];
    if (p.bedrooms != null) parts.push(`${p.bedrooms} bd`);
    if (p.bathrooms != null) parts.push(`${p.bathrooms} ba`);
    return parts.length ? parts.join(" · ") : <span style={{ color: "var(--color-slate-300)" }}>—</span>;
  }

  const fmtStatus = (s: Property["status"]) => s === "under_offer" ? "Under Offer" : s.charAt(0).toUpperCase() + s.slice(1);
  const fmtType = (t: Property["property_type"]) => t.charAt(0).toUpperCase() + t.slice(1);

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-bold" style={{ fontSize: "24px", color: "var(--color-navy-800)" }}>Properties</h1>
          <p style={{ fontSize: "14px", color: "var(--color-slate-500)", marginTop: "2px" }}>
            {filtered.length} propert{filtered.length !== 1 ? "ies" : "y"}
          </p>
        </div>
        <button onClick={() => { setEditProperty(null); setShowModal(true); }}
          className="flex items-center gap-2 rounded-lg font-medium transition-colors"
          style={{ padding: "10px 18px", backgroundColor: "var(--color-navy-800)", color: "white", fontSize: "14px" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-navy-700)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-navy-800)")}>
          <Plus size={16} /> Add Property
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 rounded-xl p-3"
        style={{ backgroundColor: "white", border: "1px solid var(--color-slate-200)" }}>
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-slate-400)" }} />
          <input type="text" placeholder="Search by address or suburb…" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-lg outline-none"
            style={{ padding: "8px 12px 8px 36px", fontSize: "14px", border: "1px solid var(--color-slate-200)", backgroundColor: "var(--color-slate-50)" }} />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} style={{ color: "var(--color-slate-400)" }} />
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="rounded-lg outline-none cursor-pointer"
            style={{ padding: "8px 12px", fontSize: "14px", border: "1px solid var(--color-slate-200)", backgroundColor: "var(--color-slate-50)" }}>
            <option value="all">All types</option>
            <option value="house">House</option>
            <option value="unit">Unit</option>
            <option value="townhouse">Townhouse</option>
            <option value="land">Land</option>
            <option value="commercial">Commercial</option>
            <option value="rural">Rural</option>
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-lg outline-none cursor-pointer"
            style={{ padding: "8px 12px", fontSize: "14px", border: "1px solid var(--color-slate-200)", backgroundColor: "var(--color-slate-50)" }}>
            <option value="all">All statuses</option>
            <option value="appraisal">Appraisal</option>
            <option value="listed">Listed</option>
            <option value="under_offer">Under Offer</option>
            <option value="sold">Sold</option>
            <option value="leased">Leased</option>
            <option value="withdrawn">Withdrawn</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-slate-200)", backgroundColor: "white" }}>
        <table className="w-full" style={{ fontSize: "14px", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "var(--color-slate-50)", borderBottom: "1px solid var(--color-slate-200)" }}>
              <th className="text-left cursor-pointer select-none"
                style={{ padding: "12px 16px", fontWeight: 600, color: "var(--color-slate-700)" }}
                onClick={() => toggleSort("address")}>
                <span className="flex items-center gap-1">Address / Suburb <SortIcon field="address" /></span>
              </th>
              <th className="text-left" style={{ padding: "12px 16px", fontWeight: 600, color: "var(--color-slate-700)" }}>Type</th>
              <th className="text-left cursor-pointer select-none"
                style={{ padding: "12px 16px", fontWeight: 600, color: "var(--color-slate-700)" }}
                onClick={() => toggleSort("status")}>
                <span className="flex items-center gap-1">Status <SortIcon field="status" /></span>
              </th>
              <th className="text-left" style={{ padding: "12px 16px", fontWeight: 600, color: "var(--color-slate-700)" }}>Beds / Baths</th>
              <th className="text-left" style={{ padding: "12px 16px", fontWeight: 600, color: "var(--color-slate-700)" }}>Photos</th>
              <th className="text-left cursor-pointer select-none"
                style={{ padding: "12px 16px", fontWeight: 600, color: "var(--color-slate-700)" }}
                onClick={() => toggleSort("created_at")}>
                <span className="flex items-center gap-1">Added <SortIcon field="created_at" /></span>
              </th>
              <th style={{ padding: "12px 16px", width: "48px" }} />
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={7} className="text-center"
                style={{ padding: "48px 16px", color: "var(--color-slate-400)" }}>
                {search || typeFilter !== "all" || statusFilter !== "all"
                  ? "No properties match your filters."
                  : "No properties yet. Add your first property."}
              </td></tr>
            ) : paginated.map((p) => (
              <tr key={p.id} className="cursor-pointer transition-colors"
                style={{ borderBottom: "1px solid var(--color-slate-100)" }}
                onClick={() => { setEditProperty(p); setShowModal(true); }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-slate-50)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "transparent")}>
                <td style={{ padding: "14px 16px" }}>
                  <div style={{ fontWeight: 500, color: "var(--color-slate-900)" }}>{p.address}</div>
                  <div style={{ fontSize: "12px", color: "var(--color-slate-400)", marginTop: "2px" }}>
                    {p.suburb}, {p.state} {p.postcode}
                  </div>
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <span className="rounded-full px-2 py-1 font-medium"
                    style={{ fontSize: "12px", backgroundColor: TYPE_COLORS[p.property_type]?.bg, color: TYPE_COLORS[p.property_type]?.text }}>
                    {fmtType(p.property_type)}
                  </span>
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <span className="rounded-full px-2 py-1 font-medium"
                    style={{ fontSize: "12px", backgroundColor: STATUS_COLORS[p.status]?.bg, color: STATUS_COLORS[p.status]?.text }}>
                    {fmtStatus(p.status)}
                  </span>
                </td>
                <td style={{ padding: "14px 16px", color: "var(--color-slate-600)", fontSize: "13px" }}>
                  {formatBedBath(p)}
                </td>
                <td style={{ padding: "14px 16px" }}>
                  {p.photo_urls.length > 0 ? (
                    <div className="flex items-center gap-1">
                      <div className="rounded overflow-hidden"
                        style={{ width: 36, height: 28, backgroundColor: "var(--color-slate-100)", flexShrink: 0 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.photo_urls[0]} alt="" className="w-full h-full object-cover" />
                      </div>
                      {p.photo_urls.length > 1 && (
                        <span style={{ fontSize: "12px", color: "var(--color-slate-400)" }}>
                          +{p.photo_urls.length - 1}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span style={{ color: "var(--color-slate-300)", fontSize: "13px" }}>—</span>
                  )}
                </td>
                <td style={{ padding: "14px 16px", color: "var(--color-slate-400)", fontSize: "12px" }}>
                  {new Date(p.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                </td>
                <td style={{ padding: "14px 8px" }}>
                  <span style={{ color: "var(--color-slate-300)", fontSize: "18px" }}>›</span>
                </td>
              </tr>
            ))}
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
            <button disabled={page === 1} onClick={() => setPage(page - 1)}
              className="rounded-lg px-3 py-1.5 disabled:opacity-40"
              style={{ fontSize: "13px", border: "1px solid var(--color-slate-200)", backgroundColor: "white" }}>
              Previous
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => setPage(p)}
                className="rounded-lg w-8 h-8"
                style={{ fontSize: "13px", fontWeight: p === page ? 600 : 400,
                  border: p === page ? "none" : "1px solid var(--color-slate-200)",
                  backgroundColor: p === page ? "var(--color-navy-800)" : "white",
                  color: p === page ? "white" : "var(--color-slate-700)" }}>
                {p}
              </button>
            ))}
            <button disabled={page === totalPages} onClick={() => setPage(page + 1)}
              className="rounded-lg px-3 py-1.5 disabled:opacity-40"
              style={{ fontSize: "13px", border: "1px solid var(--color-slate-200)", backgroundColor: "white" }}>
              Next
            </button>
          </div>
        </div>
      )}

      {showModal && (
        <PropertyModal
          property={editProperty}
          onSaved={onSaved}
          onDeleted={onDeleted}
          onClose={() => { setShowModal(false); setEditProperty(null); }}
        />
      )}
    </div>
  );
}
