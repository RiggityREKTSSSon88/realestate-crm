import { createClient } from "@/lib/supabase/server";
import { Users, Building2, ClipboardList, ListChecks, AlertCircle, TrendingUp, CheckSquare, Star } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();

  const today = new Date().toISOString().slice(0, 10);

  const [
    contactsRes, propertiesRes, appraisalsRes, listingsRes,
    hotLeadsRes, overdueTasksRes, openTasksRes,
    recentAppraisalsRes, recentContactsRes, upcomingTasksRes,
  ] = await Promise.all([
    supabase.from("contacts").select("id", { count: "exact", head: true }),
    supabase.from("properties").select("id", { count: "exact", head: true }),
    supabase.from("appraisals").select("id", { count: "exact", head: true }),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("contacts").select("id", { count: "exact", head: true }).eq("status", "hot"),
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("completed", false).lt("due_date", today),
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("completed", false),
    supabase.from("appraisals").select(`
      id, appraisal_date, status, estimated_value_low, estimated_value_high,
      contacts ( full_name ),
      properties ( address, suburb )
    `).order("created_at", { ascending: false }).limit(5),
    supabase.from("contacts").select("id, full_name, type, status, created_at").order("created_at", { ascending: false }).limit(5),
    supabase.from("tasks").select("id, title, due_date, related_contact_id, contacts(lead_score, status)").eq("completed", false).gte("due_date", today).order("due_date", { ascending: true }).limit(10),
  ]);

  const stats = [
    { label: "Total Contacts", value: contactsRes.count ?? 0, icon: Users, color: "var(--color-navy-800)", href: "/contacts" },
    { label: "Active Listings", value: listingsRes.count ?? 0, icon: ListChecks, color: "#059669", href: "/listings" },
    { label: "Appraisals", value: appraisalsRes.count ?? 0, icon: ClipboardList, color: "#0891b2", href: "/appraisals" },
    { label: "Hot Leads", value: hotLeadsRes.count ?? 0, icon: Star, color: "#b91c1c", href: "/contacts?status=hot" },
  ];

  const alerts = [
    overdueTasksRes.count ? { label: `${overdueTasksRes.count} overdue task${overdueTasksRes.count !== 1 ? "s" : ""}`, href: "/tasks", color: "#b91c1c" } : null,
    openTasksRes.count ? { label: `${openTasksRes.count} open task${openTasksRes.count !== 1 ? "s" : ""}`, href: "/tasks", color: "#b45309" } : null,
  ].filter(Boolean) as { label: string; href: string; color: string }[];

  const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    hot: { bg: "#fee2e2", text: "#b91c1c" },
    warm: { bg: "#fef3c7", text: "#b45309" },
    cold: { bg: "#dbeafe", text: "#1d4ed8" },
  };

  const APPRAISAL_COLORS: Record<string, { bg: string; text: string }> = {
    hot: { bg: "#fee2e2", text: "#b91c1c" },
    warm: { bg: "#fef3c7", text: "#b45309" },
    cold: { bg: "#dbeafe", text: "#1d4ed8" },
  };

  const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
    buyer: { bg: "#ede9fe", text: "#6d28d9" },
    vendor: { bg: "#d1fae5", text: "#065f46" },
    tenant: { bg: "#fce7f3", text: "#9d174d" },
    landlord: { bg: "#e0f2fe", text: "#0369a1" },
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recentAppraisals = (recentAppraisalsRes.data ?? []) as any[];
  const recentContacts = recentContactsRes.data ?? [];
  // Smart task prioritisation: sort by contact lead_score (desc), then by due_date (asc)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const upcomingTasks = ((upcomingTasksRes.data ?? []) as any[])
    .sort((a, b) => {
      const scoreA = (a.contacts as any)?.lead_score ?? 0;
      const scoreB = (b.contacts as any)?.lead_score ?? 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return (a.due_date ?? "").localeCompare(b.due_date ?? "");
    })
    .slice(0, 5);

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 style={{ fontSize: "24px", fontWeight: 700, color: "var(--color-navy-800)" }}>Dashboard</h1>
        <p style={{ fontSize: "14px", color: "var(--color-slate-500)", marginTop: "2px" }}>
          {new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Alert bar */}
      {alerts.length > 0 && (
        <div className="flex items-center gap-3 mb-6 rounded-xl px-4 py-3" style={{ backgroundColor: "#fffbeb", border: "1px solid #fcd34d" }}>
          <AlertCircle size={16} style={{ color: "#b45309", flexShrink: 0 }} />
          <div className="flex items-center gap-4 flex-wrap">
            {alerts.map((a) => (
              <Link key={a.href + a.label} href={a.href} style={{ fontSize: "13px", fontWeight: 500, color: a.color }}>
                {a.label} →
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        {stats.map(({ label, value, icon: Icon, color, href }) => (
          <Link key={label} href={href}
            className="rounded-xl p-5 block transition-shadow"
            style={{ backgroundColor: "white", border: "1px solid var(--color-slate-200)" }}
            onMouseEnter={undefined}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center justify-center rounded-lg"
                style={{ width: "40px", height: "40px", backgroundColor: color + "18" }}>
                <Icon size={20} style={{ color }} />
              </div>
              <TrendingUp size={14} style={{ color: "var(--color-slate-300)" }} />
            </div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "var(--color-slate-900)" }}>
              {value.toLocaleString()}
            </div>
            <div style={{ fontSize: "13px", color: "var(--color-slate-500)", marginTop: "2px" }}>{label}</div>
          </Link>
        ))}
      </div>

      {/* Bottom 3-column layout */}
      <div className="grid gap-6" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
        {/* Recent Appraisals */}
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "white", border: "1px solid var(--color-slate-200)" }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--color-slate-200)" }}>
            <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-navy-800)" }}>Recent Appraisals</span>
            <Link href="/appraisals" style={{ fontSize: "12px", color: "var(--color-slate-400)" }}>View all →</Link>
          </div>
          {recentAppraisals.length === 0 ? (
            <p style={{ fontSize: "13px", color: "var(--color-slate-400)", textAlign: "center", padding: "24px 0" }}>None yet</p>
          ) : recentAppraisals.map((a) => (
            <div key={a.id} className="flex items-start gap-3 px-5 py-3" style={{ borderBottom: "1px solid var(--color-slate-100)" }}>
              <div className="flex-1 min-w-0">
                <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-slate-800)" }} className="truncate">
                  {a.properties?.address ?? "—"}
                </div>
                <div style={{ fontSize: "12px", color: "var(--color-slate-400)" }}>{a.contacts?.full_name ?? "—"}</div>
              </div>
              <span className="rounded-full px-2 py-0.5 font-medium capitalize shrink-0"
                style={{ fontSize: "11px", backgroundColor: APPRAISAL_COLORS[a.status]?.bg, color: APPRAISAL_COLORS[a.status]?.text }}>
                {a.status}
              </span>
            </div>
          ))}
        </div>

        {/* New Contacts */}
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "white", border: "1px solid var(--color-slate-200)" }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--color-slate-200)" }}>
            <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-navy-800)" }}>New Contacts</span>
            <Link href="/contacts" style={{ fontSize: "12px", color: "var(--color-slate-400)" }}>View all →</Link>
          </div>
          {recentContacts.length === 0 ? (
            <p style={{ fontSize: "13px", color: "var(--color-slate-400)", textAlign: "center", padding: "24px 0" }}>None yet</p>
          ) : recentContacts.map((c) => (
            <Link key={c.id} href={`/contacts/${c.id}`}
              className="flex items-center gap-3 px-5 py-3 block transition-colors"
              style={{ borderBottom: "1px solid var(--color-slate-100)" }}
            >
              <div className="flex items-center justify-center rounded-full shrink-0"
                style={{ width: 28, height: 28, backgroundColor: "var(--color-navy-100)", color: "var(--color-navy-800)", fontSize: "11px", fontWeight: 600 }}>
                {c.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-slate-800)" }}>{c.full_name}</div>
              </div>
              <div className="flex items-center gap-1">
                <span className="rounded-full px-1.5 py-0.5 font-medium capitalize"
                  style={{ fontSize: "10px", backgroundColor: TYPE_COLORS[c.type]?.bg, color: TYPE_COLORS[c.type]?.text }}>
                  {c.type}
                </span>
                <span className="rounded-full px-1.5 py-0.5 font-medium capitalize"
                  style={{ fontSize: "10px", backgroundColor: STATUS_COLORS[c.status]?.bg, color: STATUS_COLORS[c.status]?.text }}>
                  {c.status}
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* Upcoming Tasks */}
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "white", border: "1px solid var(--color-slate-200)" }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--color-slate-200)" }}>
            <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-navy-800)" }}>Upcoming Tasks</span>
            <Link href="/tasks" style={{ fontSize: "12px", color: "var(--color-slate-400)" }}>View all →</Link>
          </div>
          {upcomingTasks.length === 0 ? (
            <p style={{ fontSize: "13px", color: "var(--color-slate-400)", textAlign: "center", padding: "24px 0" }}>All clear</p>
          ) : upcomingTasks.map((t) => {
            const leadScore = (t.contacts as any)?.lead_score as number | null;
            const priority = leadScore !== null && leadScore !== undefined
              ? leadScore >= 70 ? { label: "High", bg: "#fee2e2", text: "#b91c1c" }
              : leadScore >= 40 ? { label: "Med", bg: "#fef3c7", text: "#b45309" }
              : null
              : null;
            return (
              <div key={t.id} className="flex items-start gap-3 px-5 py-3" style={{ borderBottom: "1px solid var(--color-slate-100)" }}>
                <CheckSquare size={14} style={{ color: "var(--color-slate-300)", marginTop: "2px", flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span style={{ fontSize: "13px", color: "var(--color-slate-700)" }} className="truncate">{t.title}</span>
                    {priority && (
                      <span className="rounded-full px-1.5 py-0.5 shrink-0"
                        style={{ fontSize: "10px", fontWeight: 600, backgroundColor: priority.bg, color: priority.text }}>
                        {priority.label}
                      </span>
                    )}
                  </div>
                  {t.due_date && (
                    <div style={{ fontSize: "11px", color: "var(--color-slate-400)", marginTop: "1px" }}>
                      {new Date(t.due_date).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
