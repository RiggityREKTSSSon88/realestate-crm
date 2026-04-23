"use client";

import { useState } from "react";
import { Star, Plus, Pencil, Trash2, X, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { AgentReview } from "@/types/database";

type Props = {
  initialReviews: AgentReview[];
  agentId: string;
  agencyId: string;
};

type ModalState = {
  open: boolean;
  editing: AgentReview | null;
};

type FormState = {
  reviewer_name: string;
  rating: number;
  review_text: string;
  review_date: string;
  source: AgentReview["source"];
};

const SOURCE_BADGE: Record<AgentReview["source"], { bg: string; color: string; label: string }> = {
  ratemyagent: { bg: "#dbeafe", color: "#1d4ed8", label: "RateMyAgent" },
  google: { bg: "#fee2e2", color: "#b91c1c", label: "Google" },
  other: { bg: "var(--color-slate-100)", color: "var(--color-slate-600)", label: "Other" },
};

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div style={{ display: "flex", gap: "2px" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={14}
          fill={i <= rating ? "var(--color-gold-500)" : "none"}
          color={i <= rating ? "var(--color-gold-500)" : "var(--color-slate-300)"}
        />
      ))}
    </div>
  );
}

function StarSelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div style={{ display: "flex", gap: "4px" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(0)}
          style={{ background: "none", border: "none", cursor: "pointer", padding: "2px" }}
        >
          <Star
            size={24}
            fill={i <= (hovered || value) ? "var(--color-gold-500)" : "none"}
            color={i <= (hovered || value) ? "var(--color-gold-500)" : "var(--color-slate-300)"}
          />
        </button>
      ))}
    </div>
  );
}

const EMPTY_FORM: FormState = {
  reviewer_name: "",
  rating: 5,
  review_text: "",
  review_date: new Date().toISOString().slice(0, 10),
  source: "google",
};

export default function ReviewsClient({ initialReviews, agentId, agencyId }: Props) {
  const [reviews, setReviews] = useState<AgentReview[]>(initialReviews);
  const [modal, setModal] = useState<ModalState>({ open: false, editing: null });
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function openNew() {
    setForm(EMPTY_FORM);
    setError(null);
    setModal({ open: true, editing: null });
  }

  function openEdit(review: AgentReview) {
    setForm({
      reviewer_name: review.reviewer_name,
      rating: review.rating,
      review_text: review.review_text,
      review_date: review.review_date,
      source: review.source,
    });
    setError(null);
    setModal({ open: true, editing: review });
  }

  function closeModal() {
    setModal({ open: false, editing: null });
    setError(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.reviewer_name.trim()) { setError("Reviewer name is required."); return; }
    if (!form.review_text.trim()) { setError("Review text is required."); return; }

    setSaving(true);
    setError(null);
    const supabase = createClient();

    if (!modal.editing) {
      const { data, error: insertErr } = await supabase
        .from("agent_reviews")
        .insert({
          agency_id: agencyId,
          agent_id: agentId,
          reviewer_name: form.reviewer_name.trim(),
          rating: form.rating,
          review_text: form.review_text.trim(),
          review_date: form.review_date,
          source: form.source,
        })
        .select()
        .single();

      if (insertErr || !data) {
        setError("Failed to add review.");
        setSaving(false);
        return;
      }
      setReviews((prev) => [data, ...prev]);
    } else {
      const { data, error: updateErr } = await supabase
        .from("agent_reviews")
        .update({
          reviewer_name: form.reviewer_name.trim(),
          rating: form.rating,
          review_text: form.review_text.trim(),
          review_date: form.review_date,
          source: form.source,
        })
        .eq("id", modal.editing.id)
        .select()
        .single();

      if (updateErr || !data) {
        setError("Failed to update review.");
        setSaving(false);
        return;
      }
      setReviews((prev) => prev.map((r) => (r.id === data.id ? data : r)));
    }

    setSaving(false);
    closeModal();
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const supabase = createClient();
    await supabase.from("agent_reviews").delete().eq("id", id);
    setReviews((prev) => prev.filter((r) => r.id !== id));
    setDeletingId(null);
    setConfirmDeleteId(null);
  }

  const avgRating = reviews.length
    ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
    : 0;

  const sourceCounts = reviews.reduce<Record<AgentReview["source"], number>>(
    (acc, r) => { acc[r.source] = (acc[r.source] ?? 0) + 1; return acc; },
    { ratemyagent: 0, google: 0, other: 0 }
  );

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

  return (
    <div style={{ padding: "32px", maxWidth: "1100px", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "var(--color-navy-800)", margin: 0 }}>My Reviews</h1>
          <p style={{ fontSize: "14px", color: "var(--color-slate-500)", marginTop: "4px", marginBottom: 0 }}>
            Manage your agent reviews from all sources
          </p>
        </div>
        <button
          onClick={openNew}
          style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            padding: "10px 18px", borderRadius: "8px",
            backgroundColor: "var(--color-navy-800)", color: "white",
            fontWeight: 600, fontSize: "14px", border: "none", cursor: "pointer",
          }}
        >
          <Plus size={16} /> Add Review
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "28px" }}>
        <div style={{ backgroundColor: "white", borderRadius: "12px", border: "1px solid var(--color-slate-200)", padding: "18px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
            <Star size={16} fill="var(--color-gold-500)" color="var(--color-gold-500)" />
            <span style={{ fontSize: "22px", fontWeight: 700, color: "var(--color-navy-800)" }}>
              {reviews.length > 0 ? avgRating.toFixed(1) : "—"}
            </span>
          </div>
          <div style={{ fontSize: "12px", color: "var(--color-slate-500)" }}>Average Rating</div>
        </div>
        <div style={{ backgroundColor: "white", borderRadius: "12px", border: "1px solid var(--color-slate-200)", padding: "18px 20px" }}>
          <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--color-navy-800)", marginBottom: "4px" }}>{reviews.length}</div>
          <div style={{ fontSize: "12px", color: "var(--color-slate-500)" }}>Total Reviews</div>
        </div>
        {(["ratemyagent", "google", "other"] as AgentReview["source"][]).map((src) => {
          const cfg = SOURCE_BADGE[src];
          return (
            <div key={src} style={{ backgroundColor: "white", borderRadius: "12px", border: "1px solid var(--color-slate-200)", padding: "18px 20px" }}>
              <div style={{ fontSize: "22px", fontWeight: 700, color: cfg.color, marginBottom: "4px" }}>{sourceCounts[src]}</div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "9999px", backgroundColor: cfg.bg, color: cfg.color, fontWeight: 600 }}>{cfg.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid */}
      {reviews.length === 0 ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: "80px 24px", backgroundColor: "white", borderRadius: "16px",
          border: "1px solid var(--color-slate-200)", gap: "16px",
        }}>
          <div style={{ width: "56px", height: "56px", borderRadius: "12px", backgroundColor: "var(--color-slate-100)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Star size={28} color="var(--color-slate-400)" />
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "16px", fontWeight: 600, color: "var(--color-navy-800)", margin: "0 0 6px" }}>No reviews yet</p>
            <p style={{ fontSize: "13px", color: "var(--color-slate-500)", margin: 0 }}>Add your first review to start building your social proof</p>
          </div>
          <button
            onClick={openNew}
            style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              padding: "10px 18px", borderRadius: "8px",
              backgroundColor: "var(--color-navy-800)", color: "white",
              fontWeight: 600, fontSize: "14px", border: "none", cursor: "pointer", marginTop: "4px",
            }}
          >
            <Plus size={16} /> Add Review
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
          {reviews.map((review) => {
            const srcCfg = SOURCE_BADGE[review.source];
            const isConfirmDelete = confirmDeleteId === review.id;
            return (
              <div
                key={review.id}
                style={{ backgroundColor: "white", borderRadius: "12px", border: "1px solid var(--color-slate-200)", padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                      <span style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-navy-800)" }}>{review.reviewer_name}</span>
                      <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "9999px", backgroundColor: srcCfg.bg, color: srcCfg.color, fontWeight: 600 }}>
                        {srcCfg.label}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <StarDisplay rating={review.rating} />
                      <span style={{ fontSize: "12px", color: "var(--color-slate-400)" }}>
                        {new Date(review.review_date).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
                    <button
                      onClick={() => openEdit(review)}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "var(--color-slate-400)", display: "flex", alignItems: "center" }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--color-navy-800)")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--color-slate-400)")}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(review.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "var(--color-slate-400)", display: "flex", alignItems: "center" }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#b91c1c")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--color-slate-400)")}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <p style={{ fontSize: "14px", color: "var(--color-slate-600)", lineHeight: 1.6, margin: 0 }}>
                  {review.review_text}
                </p>

                {isConfirmDelete && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingTop: "8px", borderTop: "1px solid var(--color-slate-100)" }}>
                    <span style={{ fontSize: "13px", color: "#b91c1c" }}>Delete this review?</span>
                    <button
                      onClick={() => handleDelete(review.id)}
                      disabled={deletingId === review.id}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: "4px",
                        padding: "5px 12px", borderRadius: "6px", fontSize: "13px",
                        backgroundColor: "#b91c1c", color: "white", border: "none", cursor: "pointer",
                      }}
                    >
                      {deletingId === review.id ? <Loader2 size={12} className="animate-spin" /> : "Yes, delete"}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      style={{ padding: "5px 12px", borderRadius: "6px", fontSize: "13px", border: "1px solid var(--color-slate-200)", background: "white", cursor: "pointer" }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal drawer */}
      {modal.open && (
        <div
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "stretch", justifyContent: "flex-end", zIndex: 50 }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div style={{ width: "480px", backgroundColor: "white", height: "100%", overflowY: "auto", display: "flex", flexDirection: "column", boxShadow: "-4px 0 24px rgba(0,0,0,0.12)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid var(--color-slate-200)", flexShrink: 0 }}>
              <h2 style={{ fontSize: "18px", fontWeight: 600, color: "var(--color-navy-800)", margin: 0 }}>
                {modal.editing ? "Edit Review" : "Add Review"}
              </h2>
              <button
                onClick={closeModal}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-slate-400)", display: "flex", alignItems: "center", padding: "4px", borderRadius: "6px" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--color-slate-700)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--color-slate-400)")}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ flex: 1, padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
              {error && (
                <div style={{ borderRadius: "8px", padding: "12px 16px", backgroundColor: "#fee2e2", color: "#b91c1c", fontSize: "13px" }}>
                  {error}
                </div>
              )}

              <div>
                <label style={lbl}>Reviewer Name *</label>
                <input
                  type="text"
                  value={form.reviewer_name}
                  onChange={(e) => setForm((f) => ({ ...f, reviewer_name: e.target.value }))}
                  placeholder="e.g. John Smith"
                  style={inp}
                />
              </div>

              <div>
                <label style={lbl}>Rating</label>
                <StarSelector value={form.rating} onChange={(v) => setForm((f) => ({ ...f, rating: v }))} />
              </div>

              <div>
                <label style={lbl}>Review Text *</label>
                <textarea
                  value={form.review_text}
                  onChange={(e) => setForm((f) => ({ ...f, review_text: e.target.value }))}
                  placeholder="Write the review content here…"
                  rows={5}
                  style={{ ...inp, resize: "vertical" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={lbl}>Review Date</label>
                  <input
                    type="date"
                    value={form.review_date}
                    onChange={(e) => setForm((f) => ({ ...f, review_date: e.target.value }))}
                    style={inp}
                  />
                </div>
                <div>
                  <label style={lbl}>Source</label>
                  <select
                    value={form.source}
                    onChange={(e) => setForm((f) => ({ ...f, source: e.target.value as AgentReview["source"] }))}
                    style={inp}
                  >
                    <option value="ratemyagent">RateMyAgent</option>
                    <option value="google">Google</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "auto", paddingTop: "16px", borderTop: "1px solid var(--color-slate-100)" }}>
                <button
                  type="button"
                  onClick={closeModal}
                  style={{ padding: "10px 18px", borderRadius: "8px", fontSize: "14px", border: "1px solid var(--color-slate-200)", color: "var(--color-slate-700)", background: "white", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "8px",
                    padding: "10px 20px", borderRadius: "8px", fontSize: "14px", fontWeight: 600,
                    backgroundColor: "var(--color-navy-800)", color: "white", border: "none", cursor: "pointer", marginLeft: "auto",
                  }}
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {modal.editing ? "Save Changes" : "Add Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
