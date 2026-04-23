"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, X, Loader2, Mail, MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Template } from "./page";

type TabType = "email" | "sms";

type ModalProps = {
  template: Template | null;
  onSaved: (template: Template, isNew: boolean) => void;
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

function TemplateModal({ template, onSaved, onClose }: ModalProps) {
  const isNew = !template;

  const [name, setName] = useState(template?.name ?? "");
  const [type, setType] = useState<"email" | "sms">(template?.type ?? "email");
  const [subject, setSubject] = useState(template?.subject ?? "");
  const [body, setBody] = useState(template?.body ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!body.trim()) {
      setError("Body is required.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

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
        .from("templates")
        .insert({
          name: name.trim(),
          type,
          subject: type === "email" ? (subject.trim() || null) : null,
          body: body.trim(),
          agency_id: profile.agency_id,
          created_by: authData.user.id,
        })
        .select("*")
        .single();

      if (insertErr || !created) {
        setError("Failed to create template. Please try again.");
        setLoading(false);
        return;
      }

      onSaved(created as Template, true);
    } else {
      const { data: updated, error: updateErr } = await supabase
        .from("templates")
        .update({
          name: name.trim(),
          subject: type === "email" ? (subject.trim() || null) : null,
          body: body.trim(),
        })
        .eq("id", template.id)
        .select("*")
        .single();

      if (updateErr || !updated) {
        setError("Failed to update template. Please try again.");
        setLoading(false);
        return;
      }

      onSaved(updated as Template, false);
    }

    setLoading(false);
  }

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
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--color-slate-200)" }}
        >
          <h2 style={{ fontSize: "18px", fontWeight: 600, color: "var(--color-navy-800)" }}>
            {isNew ? "New Template" : "Edit Template"}
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
            <label style={lbl}>Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Open Home Follow-up"
              style={inp}
              autoFocus
            />
          </div>

          <div>
            <label style={lbl}>Type</label>
            <div className="flex gap-4">
              {(["email", "sms"] as const).map((t) => (
                <label
                  key={t}
                  className="flex items-center gap-2 cursor-pointer"
                  style={{
                    fontSize: "14px",
                    color: isNew ? "var(--color-slate-700)" : "var(--color-slate-400)",
                    cursor: isNew ? "pointer" : "not-allowed",
                  }}
                >
                  <input
                    type="radio"
                    name="type"
                    value={t}
                    checked={type === t}
                    onChange={() => isNew && setType(t)}
                    disabled={!isNew}
                    style={{ accentColor: "var(--color-navy-800)" }}
                  />
                  {t === "email" ? "Email" : "SMS"}
                </label>
              ))}
            </div>
          </div>

          {type === "email" && (
            <div>
              <label style={lbl}>Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Thanks for attending our open home"
                style={inp}
              />
            </div>
          )}

          <div>
            <label style={lbl}>Body *</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              placeholder="Use {{name}} to personalise"
              style={{
                ...inp,
                resize: "vertical",
                lineHeight: "1.5",
              }}
            />
          </div>

          <div
            className="flex items-center justify-end gap-3 mt-auto pt-4"
            style={{ borderTop: "1px solid var(--color-slate-100)" }}
          >
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
              {isNew ? "Create Template" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TemplatesClient({ initialTemplates }: { initialTemplates: Template[] }) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [activeTab, setActiveTab] = useState<TabType>("email");
  const [showModal, setShowModal] = useState(false);
  const [editTemplate, setEditTemplate] = useState<Template | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = templates.filter((t) => t.type === activeTab);

  function onSaved(template: Template, isNew: boolean) {
    if (isNew) {
      setTemplates((prev) => [...prev, template]);
    } else {
      setTemplates((prev) => prev.map((t) => (t.id === template.id ? template : t)));
    }
    setShowModal(false);
    setEditTemplate(null);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const supabase = createClient();
    await supabase.from("templates").delete().eq("id", id);
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    setConfirmDeleteId(null);
    setDeletingId(null);
  }

  function openEdit(template: Template) {
    setEditTemplate(template);
    setShowModal(true);
  }

  function openNew() {
    setEditTemplate(null);
    setShowModal(true);
  }

  const tabStyle = (tab: TabType): React.CSSProperties => ({
    padding: "8px 20px",
    fontSize: "14px",
    fontWeight: activeTab === tab ? 600 : 400,
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    backgroundColor: activeTab === tab ? "var(--color-navy-800)" : "transparent",
    color: activeTab === tab ? "white" : "var(--color-slate-500)",
    transition: "background-color 0.15s, color 0.15s",
  });

  return (
    <div style={{ padding: "24px", maxWidth: "1280px", margin: "0 auto" }}>
      <div className="flex items-center justify-between" style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700, color: "var(--color-navy-800)" }}>
          Templates
        </h1>
        <button
          onClick={openNew}
          className="flex items-center gap-2 rounded-lg font-medium transition-colors"
          style={{
            padding: "10px 18px",
            backgroundColor: "var(--color-navy-800)",
            color: "white",
            fontSize: "14px",
            border: "none",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-navy-700)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-navy-800)")}
        >
          <Plus size={16} />
          New Template
        </button>
      </div>

      <div
        className="flex items-center gap-1"
        style={{
          marginBottom: "24px",
          padding: "4px",
          backgroundColor: "var(--color-slate-100)",
          borderRadius: "10px",
          display: "inline-flex",
        }}
      >
        <button style={tabStyle("email")} onClick={() => setActiveTab("email")}>
          <span className="flex items-center gap-2">
            <Mail size={14} />
            Email
          </span>
        </button>
        <button style={tabStyle("sms")} onClick={() => setActiveTab("sms")}>
          <span className="flex items-center gap-2">
            <MessageSquare size={14} />
            SMS
          </span>
        </button>
      </div>

      {filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-xl"
          style={{
            padding: "64px 24px",
            border: "1px dashed var(--color-slate-200)",
            backgroundColor: "white",
          }}
        >
          {activeTab === "email" ? (
            <Mail size={32} style={{ color: "var(--color-slate-300)", marginBottom: "12px" }} />
          ) : (
            <MessageSquare size={32} style={{ color: "var(--color-slate-300)", marginBottom: "12px" }} />
          )}
          <p style={{ fontSize: "15px", fontWeight: 500, color: "var(--color-slate-500)" }}>
            No {activeTab === "email" ? "email" : "SMS"} templates yet
          </p>
          <p style={{ fontSize: "13px", color: "var(--color-slate-400)", marginTop: "4px" }}>
            Create your first template to get started.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "16px",
          }}
        >
          {filtered.map((template) => (
            <div
              key={template.id}
              style={{
                backgroundColor: "white",
                border: "1px solid var(--color-slate-200)",
                borderRadius: "12px",
                padding: "20px",
              }}
            >
              <div className="flex items-start justify-between" style={{ marginBottom: "10px" }}>
                <div style={{ flex: 1, minWidth: 0, marginRight: "12px" }}>
                  <p
                    style={{
                      fontSize: "15px",
                      fontWeight: 600,
                      color: "var(--color-slate-900)",
                      marginBottom: "6px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {template.name}
                  </p>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "11px",
                      fontWeight: 500,
                      padding: "2px 8px",
                      borderRadius: "999px",
                      backgroundColor: template.type === "email" ? "#dbeafe" : "#dcfce7",
                      color: template.type === "email" ? "#1d4ed8" : "#15803d",
                    }}
                  >
                    {template.type === "email" ? <Mail size={10} /> : <MessageSquare size={10} />}
                    {template.type === "email" ? "Email" : "SMS"}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(template)}
                    className="rounded-lg p-1.5 transition-colors"
                    style={{ color: "var(--color-slate-400)", border: "none", backgroundColor: "transparent", cursor: "pointer" }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--color-slate-700)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--color-slate-400)")}
                    title="Edit"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(confirmDeleteId === template.id ? null : template.id)}
                    className="rounded-lg p-1.5 transition-colors"
                    style={{ color: "var(--color-slate-400)", border: "none", backgroundColor: "transparent", cursor: "pointer" }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#b91c1c")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--color-slate-400)")}
                    title="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <p
                style={{
                  fontSize: "13px",
                  color: "var(--color-slate-400)",
                  lineHeight: "1.5",
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {template.type === "email" && template.subject
                  ? template.subject
                  : template.body.slice(0, 80)}
              </p>

              {confirmDeleteId === template.id && (
                <div
                  className="flex items-center gap-2 mt-3 pt-3"
                  style={{ borderTop: "1px solid var(--color-slate-100)" }}
                >
                  <span style={{ fontSize: "12px", color: "#b91c1c", fontWeight: 500 }}>
                    Are you sure?
                  </span>
                  <button
                    onClick={() => handleDelete(template.id)}
                    disabled={deletingId === template.id}
                    className="flex items-center gap-1 rounded-lg px-3 py-1.5 font-medium"
                    style={{
                      fontSize: "12px",
                      backgroundColor: "#b91c1c",
                      color: "white",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    {deletingId === template.id ? <Loader2 size={12} className="animate-spin" /> : "Yes, delete"}
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="rounded-lg px-3 py-1.5"
                    style={{
                      fontSize: "12px",
                      border: "1px solid var(--color-slate-200)",
                      backgroundColor: "transparent",
                      cursor: "pointer",
                      color: "var(--color-slate-600)",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <TemplateModal
          template={editTemplate}
          onSaved={onSaved}
          onClose={() => { setShowModal(false); setEditTemplate(null); }}
        />
      )}
    </div>
  );
}
