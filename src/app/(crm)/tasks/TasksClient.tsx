"use client";

import { useState, useMemo } from "react";
import { Plus, Search, X, Trash2, Loader2, CheckSquare, Square } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Task, Contact } from "@/types/database";

// ─── Types ───────────────────────────────────────────────────────────────────

type TaskWithUser = Task & {
  users: { id: string; full_name: string } | null;
};

type ContactOption = Pick<Contact, "id" | "full_name">;

type FilterTab = "all" | "pending" | "overdue" | "completed";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function isOverdue(task: TaskWithUser): boolean {
  if (task.completed || !task.due_date) return false;
  return task.due_date < todayISO();
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const [year, month, day] = iso.slice(0, 10).split("-");
  const d = new Date(Number(year), Number(month) - 1, Number(day));
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Shared style tokens ──────────────────────────────────────────────────────

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

// ─── TaskModal ────────────────────────────────────────────────────────────────

type ModalProps = {
  task: TaskWithUser | null;
  contacts: ContactOption[];
  onSaved: (task: TaskWithUser, isNew: boolean) => void;
  onDeleted: (id: string) => void;
  onClose: () => void;
};

const EMPTY_FORM = {
  title: "",
  related_contact_id: "",
  due_date: "",
  completed: false,
};

function TaskModal({ task, contacts, onSaved, onDeleted, onClose }: ModalProps) {
  const isNew = !task;

  const [form, setForm] = useState(
    task
      ? {
          title: task.title,
          related_contact_id: task.related_contact_id ?? "",
          due_date: task.due_date ?? "",
          completed: task.completed,
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

    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const payload = {
      title: form.title.trim(),
      related_contact_id: form.related_contact_id || null,
      due_date: form.due_date || null,
      completed: form.completed,
      completed_at: form.completed ? (task?.completed_at ?? new Date().toISOString()) : null,
    };

    if (isNew) {
      const { data: authData } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("users")
        .select("agency_id")
        .eq("id", authData.user!.id)
        .single();

      const { data, error: err } = await supabase
        .from("tasks")
        .insert({
          ...payload,
          agency_id: profile!.agency_id!,
          assigned_to: authData.user!.id,
          related_property_id: null,
        })
        .select(`*, users:assigned_to ( id, full_name )`)
        .single();

      if (err) {
        setError("Failed to create task. Please try again.");
        setLoading(false);
        return;
      }

      onSaved(data as unknown as TaskWithUser, true);
    } else {
      const { data, error: err } = await supabase
        .from("tasks")
        .update(payload)
        .eq("id", task.id)
        .select(`*, users:assigned_to ( id, full_name )`)
        .single();

      if (err) {
        setError("Failed to update task. Please try again.");
        setLoading(false);
        return;
      }

      onSaved(data as unknown as TaskWithUser, false);
    }

    setLoading(false);
  }

  async function handleDelete() {
    if (!task) return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("tasks").delete().eq("id", task.id);
    onDeleted(task.id);
    setDeleting(false);
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
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--color-slate-200)" }}
        >
          <h2 style={{ fontSize: "18px", fontWeight: 600, color: "var(--color-navy-800)" }}>
            {isNew ? "Add Task" : "Edit Task"}
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

          {/* Title */}
          <div>
            <label style={labelStyle}>Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Follow up with buyer"
              style={inputStyle}
              autoFocus
            />
          </div>

          {/* Related contact */}
          <div>
            <label style={labelStyle}>Related Contact</label>
            <select
              value={form.related_contact_id}
              onChange={(e) => set("related_contact_id", e.target.value)}
              style={inputStyle}
            >
              <option value="">— None —</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Due date */}
          <div>
            <label style={labelStyle}>Due Date</label>
            <input
              type="date"
              value={form.due_date}
              onChange={(e) => set("due_date", e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Completed (edit mode only) */}
          {!isNew && (
            <div className="flex items-center gap-3">
              <input
                id="task-completed"
                type="checkbox"
                checked={form.completed}
                onChange={(e) => set("completed", e.target.checked)}
                style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "var(--color-navy-800)" }}
              />
              <label
                htmlFor="task-completed"
                style={{ fontSize: "14px", color: "var(--color-slate-700)", cursor: "pointer", userSelect: "none" }}
              >
                Mark as completed
              </label>
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
                {isNew ? "Add Task" : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── TasksClient ──────────────────────────────────────────────────────────────

type Props = {
  initialTasks: TaskWithUser[];
  contacts: ContactOption[];
};

export default function TasksClient({ initialTasks, contacts }: Props) {
  const [tasks, setTasks] = useState<TaskWithUser[]>(initialTasks);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState<TaskWithUser | null>(null);

  // Build a contact lookup map for displaying names in the table
  const contactMap = useMemo(
    () => new Map(contacts.map((c) => [c.id, c.full_name])),
    [contacts]
  );

  const today = todayISO();

  const filtered = useMemo(() => {
    let result = tasks;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((t) => t.title.toLowerCase().includes(q));
    }

    switch (activeTab) {
      case "pending":
        result = result.filter((t) => !t.completed && (!t.due_date || t.due_date >= today));
        break;
      case "overdue":
        result = result.filter((t) => isOverdue(t));
        break;
      case "completed":
        result = result.filter((t) => t.completed);
        break;
      default:
        break;
    }

    return result;
  }, [tasks, search, activeTab, today]);

  // Tab counts
  const counts = useMemo(() => {
    const pending = tasks.filter((t) => !t.completed && (!t.due_date || t.due_date >= today)).length;
    const overdue = tasks.filter((t) => isOverdue(t)).length;
    const completed = tasks.filter((t) => t.completed).length;
    return { all: tasks.length, pending, overdue, completed };
  }, [tasks, today]);

  // Optimistic checkbox toggle
  async function handleToggleComplete(e: React.MouseEvent, task: TaskWithUser) {
    e.stopPropagation();
    const newCompleted = !task.completed;
    const now = new Date().toISOString();

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? { ...t, completed: newCompleted, completed_at: newCompleted ? now : null }
          : t
      )
    );

    const supabase = createClient();
    const { error } = await supabase
      .from("tasks")
      .update({
        completed: newCompleted,
        completed_at: newCompleted ? now : null,
      })
      .eq("id", task.id);

    // Revert on failure
    if (error) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? { ...t, completed: task.completed, completed_at: task.completed_at }
            : t
        )
      );
    }
  }

  function onSaved(task: TaskWithUser, isNew: boolean) {
    if (isNew) {
      setTasks((prev) => [task, ...prev]);
    } else {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
    }
    setShowModal(false);
    setEditTask(null);
  }

  function onDeleted(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setShowModal(false);
    setEditTask(null);
  }

  function openEdit(task: TaskWithUser) {
    setEditTask(task);
    setShowModal(true);
  }

  function openNew() {
    setEditTask(null);
    setShowModal(true);
  }

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "overdue", label: "Overdue" },
    { key: "completed", label: "Completed" },
  ];

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-bold" style={{ fontSize: "24px", color: "var(--color-navy-800)" }}>
            Tasks
          </h1>
          <p style={{ fontSize: "14px", color: "var(--color-slate-500)", marginTop: "2px" }}>
            {filtered.length} task{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 rounded-lg font-medium transition-colors"
          style={{
            padding: "10px 18px",
            backgroundColor: "var(--color-navy-800)",
            color: "white",
            fontSize: "14px",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-navy-700)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-navy-800)")
          }
        >
          <Plus size={16} />
          Add Task
        </button>
      </div>

      {/* Filter bar */}
      <div
        className="flex items-center gap-3 mb-4 rounded-xl p-3"
        style={{ backgroundColor: "white", border: "1px solid var(--color-slate-200)" }}
      >
        {/* Search */}
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--color-slate-400)" }}
          />
          <input
            type="text"
            placeholder="Search by title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg outline-none"
            style={{
              padding: "8px 12px 8px 36px",
              fontSize: "14px",
              border: "1px solid var(--color-slate-200)",
              backgroundColor: "var(--color-slate-50)",
            }}
          />
        </div>

        {/* Tabs */}
        <div
          className="flex items-center rounded-lg overflow-hidden"
          style={{ border: "1px solid var(--color-slate-200)" }}
        >
          {tabs.map(({ key, label }) => {
            const isActive = activeTab === key;
            const isOverdueTab = key === "overdue";
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className="flex items-center gap-1.5 px-4 py-2 transition-colors"
                style={{
                  fontSize: "13px",
                  fontWeight: isActive ? 600 : 400,
                  backgroundColor: isActive ? "var(--color-navy-800)" : "transparent",
                  color: isActive
                    ? "white"
                    : isOverdueTab && counts.overdue > 0
                    ? "#b91c1c"
                    : "var(--color-slate-600)",
                  borderRight: "1px solid var(--color-slate-200)",
                }}
              >
                {label}
                <span
                  className="rounded-full px-1.5 py-0.5"
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    backgroundColor: isActive
                      ? "rgba(255,255,255,0.2)"
                      : isOverdueTab && counts.overdue > 0
                      ? "#fee2e2"
                      : "var(--color-slate-100)",
                    color: isActive
                      ? "white"
                      : isOverdueTab && counts.overdue > 0
                      ? "#b91c1c"
                      : "var(--color-slate-500)",
                  }}
                >
                  {counts[key]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: "1px solid var(--color-slate-200)", backgroundColor: "white" }}
      >
        <table className="w-full" style={{ fontSize: "14px", borderCollapse: "collapse" }}>
          <thead>
            <tr
              style={{
                backgroundColor: "var(--color-slate-50)",
                borderBottom: "1px solid var(--color-slate-200)",
              }}
            >
              {/* Checkbox column */}
              <th style={{ padding: "12px 16px", width: "40px" }} />
              <th
                className="text-left"
                style={{ padding: "12px 16px", fontWeight: 600, color: "var(--color-slate-700)" }}
              >
                Title
              </th>
              <th
                className="text-left"
                style={{ padding: "12px 16px", fontWeight: 600, color: "var(--color-slate-700)" }}
              >
                Contact
              </th>
              <th
                className="text-left"
                style={{ padding: "12px 16px", fontWeight: 600, color: "var(--color-slate-700)" }}
              >
                Due Date
              </th>
              <th
                className="text-left"
                style={{ padding: "12px 16px", fontWeight: 600, color: "var(--color-slate-700)" }}
              >
                Assigned To
              </th>
              <th
                className="text-left"
                style={{ padding: "12px 16px", fontWeight: 600, color: "var(--color-slate-700)" }}
              >
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="text-center"
                  style={{ padding: "48px 16px", color: "var(--color-slate-400)" }}
                >
                  {search || activeTab !== "all"
                    ? "No tasks match your filters."
                    : "No tasks yet. Add your first task."}
                </td>
              </tr>
            ) : (
              filtered.map((task) => {
                const overdue = isOverdue(task);
                return (
                  <tr
                    key={task.id}
                    className="cursor-pointer transition-colors"
                    style={{ borderBottom: "1px solid var(--color-slate-100)" }}
                    onClick={() => openEdit(task)}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-slate-50)")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLElement).style.backgroundColor = "transparent")
                    }
                  >
                    {/* Toggle checkbox */}
                    <td
                      style={{ padding: "14px 16px", width: "40px" }}
                      onClick={(e) => handleToggleComplete(e, task)}
                    >
                      {task.completed ? (
                        <CheckSquare
                          size={18}
                          style={{ color: "var(--color-navy-800)" }}
                        />
                      ) : (
                        <Square
                          size={18}
                          style={{ color: "var(--color-slate-300)" }}
                        />
                      )}
                    </td>

                    {/* Title */}
                    <td style={{ padding: "14px 16px" }}>
                      <span
                        style={{
                          fontWeight: 500,
                          color: task.completed
                            ? "var(--color-slate-400)"
                            : "var(--color-slate-900)",
                          textDecoration: task.completed ? "line-through" : "none",
                        }}
                      >
                        {task.title}
                      </span>
                    </td>

                    {/* Contact */}
                    <td style={{ padding: "14px 16px", color: "var(--color-slate-600)" }}>
                      {task.related_contact_id && contactMap.has(task.related_contact_id) ? (
                        contactMap.get(task.related_contact_id)
                      ) : (
                        <span style={{ color: "var(--color-slate-300)" }}>—</span>
                      )}
                    </td>

                    {/* Due date — red if overdue */}
                    <td
                      style={{
                        padding: "14px 16px",
                        color: overdue ? "#b91c1c" : "var(--color-slate-600)",
                        fontWeight: overdue ? 500 : 400,
                      }}
                    >
                      {formatDate(task.due_date)}
                    </td>

                    {/* Assigned to */}
                    <td style={{ padding: "14px 16px", color: "var(--color-slate-600)" }}>
                      {task.users?.full_name ?? (
                        <span style={{ color: "var(--color-slate-300)" }}>—</span>
                      )}
                    </td>

                    {/* Status badge */}
                    <td style={{ padding: "14px 16px" }}>
                      {task.completed ? (
                        <span
                          className="rounded-full px-2 py-1 font-medium"
                          style={{
                            fontSize: "12px",
                            backgroundColor: "#d1fae5",
                            color: "#065f46",
                          }}
                        >
                          Complete
                        </span>
                      ) : overdue ? (
                        <span
                          className="rounded-full px-2 py-1 font-medium"
                          style={{
                            fontSize: "12px",
                            backgroundColor: "#fee2e2",
                            color: "#b91c1c",
                          }}
                        >
                          Overdue
                        </span>
                      ) : (
                        <span
                          className="rounded-full px-2 py-1 font-medium"
                          style={{
                            fontSize: "12px",
                            backgroundColor: "#fef3c7",
                            color: "#b45309",
                          }}
                        >
                          Pending
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <TaskModal
          task={editTask}
          contacts={contacts}
          onSaved={onSaved}
          onDeleted={onDeleted}
          onClose={() => {
            setShowModal(false);
            setEditTask(null);
          }}
        />
      )}
    </div>
  );
}
