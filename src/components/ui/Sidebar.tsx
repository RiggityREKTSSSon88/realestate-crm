"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  ClipboardList,
  ListChecks,
  CheckSquare,
  MessageSquare,
  BarChart3,
  KanbanSquare,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Home,
  FileText,
  UserPlus,
  ShieldCheck,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useIsMobile } from "@/hooks/useIsMobile";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/properties", label: "Properties", icon: Building2 },
  { href: "/appraisals", label: "Appraisals", icon: ClipboardList },
  { href: "/listings", label: "Listings", icon: ListChecks },
  { href: "/proposals", label: "Proposals", icon: FileText },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/communications", label: "Communications", icon: MessageSquare },
  { href: "/templates", label: "Templates", icon: FileText },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/compliance", label: "Compliance", icon: ShieldCheck },
  { href: "/new-client", label: "New Client", icon: UserPlus },
];

type BottomNavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
};

const bottomNavItems: BottomNavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/listings", label: "Listings", icon: ListChecks },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (isMobile) {
    const drawerItems = navItems.filter(
      (item) => !bottomNavItems.some((b) => b.href === item.href)
    );

    return (
      <>
        <nav
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            height: "60px",
            backgroundColor: "white",
            borderTop: "1px solid var(--color-slate-200)",
            zIndex: 50,
            display: "flex",
            alignItems: "stretch",
          }}
        >
          {bottomNavItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "2px",
                  color: active ? "var(--color-navy-800)" : "var(--color-slate-400)",
                  textDecoration: "none",
                  position: "relative",
                }}
              >
                <Icon size={20} />
                <span style={{ fontSize: "10px", fontWeight: 500 }}>{label}</span>
                {active && (
                  <span
                    style={{
                      position: "absolute",
                      bottom: "6px",
                      width: "4px",
                      height: "4px",
                      borderRadius: "50%",
                      backgroundColor: "var(--color-gold-500)",
                    }}
                  />
                )}
              </Link>
            );
          })}

          <button
            onClick={(e) => {
              e.preventDefault();
              setDrawerOpen(true);
            }}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "2px",
              color: drawerOpen ? "var(--color-navy-800)" : "var(--color-slate-400)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            <Menu size={20} />
            <span style={{ fontSize: "10px", fontWeight: 500 }}>More</span>
          </button>
        </nav>

        {drawerOpen && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 60,
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundColor: "rgba(0,0,0,0.5)",
              }}
              onClick={() => setDrawerOpen(false)}
            />

            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: "white",
                borderRadius: "16px 16px 0 0",
                maxHeight: "85vh",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 20px",
                  borderBottom: "1px solid var(--color-slate-200)",
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: "16px", fontWeight: 600, color: "var(--color-navy-800)" }}>
                  Navigation
                </span>
                <button
                  onClick={() => setDrawerOpen(false)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    border: "1px solid var(--color-slate-200)",
                    background: "none",
                    cursor: "pointer",
                    color: "var(--color-slate-700)",
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              <div
                style={{
                  overflowY: "auto",
                  padding: "16px 20px",
                  flex: 1,
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "8px",
                  }}
                >
                  {drawerItems.map(({ href, label, icon: Icon }) => {
                    const active = pathname === href || pathname.startsWith(href + "/");
                    return (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setDrawerOpen(false)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          padding: "12px 14px",
                          borderRadius: "10px",
                          backgroundColor: active ? "var(--color-navy-50)" : "var(--color-slate-50)",
                          color: active ? "var(--color-navy-800)" : "var(--color-slate-700)",
                          fontWeight: active ? 600 : 500,
                          fontSize: "14px",
                          textDecoration: "none",
                          border: active ? "1px solid var(--color-navy-100)" : "1px solid transparent",
                        }}
                      >
                        <Icon size={18} />
                        {label}
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div
                style={{
                  borderTop: "1px solid var(--color-slate-200)",
                  padding: "12px 20px",
                  display: "flex",
                  gap: "8px",
                  flexShrink: 0,
                }}
              >
                <Link
                  href="/settings"
                  onClick={() => setDrawerOpen(false)}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    padding: "12px",
                    borderRadius: "10px",
                    backgroundColor: "var(--color-slate-50)",
                    color: "var(--color-slate-700)",
                    fontSize: "14px",
                    fontWeight: 500,
                    textDecoration: "none",
                    border: "1px solid var(--color-slate-200)",
                  }}
                >
                  <Settings size={18} />
                  Settings
                </Link>
                <button
                  onClick={() => {
                    setDrawerOpen(false);
                    handleSignOut();
                  }}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    padding: "12px",
                    borderRadius: "10px",
                    backgroundColor: "rgba(239,68,68,0.06)",
                    color: "#dc2626",
                    fontSize: "14px",
                    fontWeight: 500,
                    border: "1px solid rgba(239,68,68,0.15)",
                    cursor: "pointer",
                  }}
                >
                  <LogOut size={18} />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <aside
      className="flex flex-col h-screen sticky top-0 transition-all duration-300 shrink-0"
      style={{
        width: collapsed ? "64px" : "240px",
        backgroundColor: "var(--color-navy-800)",
      }}
    >
      <div
        className="flex items-center gap-3 px-4 border-b shrink-0"
        style={{
          height: "64px",
          borderColor: "var(--color-navy-700)",
        }}
      >
        <div
          className="flex items-center justify-center rounded-lg shrink-0"
          style={{
            width: "32px",
            height: "32px",
            backgroundColor: "var(--color-gold-500)",
          }}
        >
          <Home size={18} color="white" />
        </div>
        {!collapsed && (
          <span
            className="font-bold text-white truncate"
            style={{ fontSize: "16px" }}
          >
            EstateIQ
          </span>
        )}
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className="flex items-center gap-3 mx-2 mb-1 rounded-lg transition-colors"
              style={{
                padding: collapsed ? "10px 0" : "10px 12px",
                justifyContent: collapsed ? "center" : "flex-start",
                backgroundColor: active
                  ? "var(--color-navy-700)"
                  : "transparent",
                color: active ? "white" : "rgba(255,255,255,0.65)",
              }}
              onMouseEnter={(e) => {
                if (!active)
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    "var(--color-navy-700)";
                (e.currentTarget as HTMLElement).style.color = "white";
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    "transparent";
                  (e.currentTarget as HTMLElement).style.color =
                    "rgba(255,255,255,0.65)";
                }
              }}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && (
                <span style={{ fontSize: "14px", fontWeight: 500 }}>
                  {label}
                </span>
              )}
              {active && !collapsed && (
                <span
                  className="ml-auto rounded-full"
                  style={{
                    width: "6px",
                    height: "6px",
                    backgroundColor: "var(--color-gold-500)",
                  }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      <div
        className="border-t pb-4"
        style={{ borderColor: "var(--color-navy-700)" }}
      >
        <Link
          href="/settings"
          title={collapsed ? "Settings" : undefined}
          className="flex items-center gap-3 mx-2 mt-2 rounded-lg transition-colors"
          style={{
            padding: collapsed ? "10px 0" : "10px 12px",
            justifyContent: collapsed ? "center" : "flex-start",
            color: "rgba(255,255,255,0.65)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor =
              "var(--color-navy-700)";
            (e.currentTarget as HTMLElement).style.color = "white";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor =
              "transparent";
            (e.currentTarget as HTMLElement).style.color =
              "rgba(255,255,255,0.65)";
          }}
        >
          <Settings size={18} className="shrink-0" />
          {!collapsed && (
            <span style={{ fontSize: "14px", fontWeight: 500 }}>Settings</span>
          )}
        </Link>

        <button
          onClick={handleSignOut}
          title={collapsed ? "Sign out" : undefined}
          className="w-full flex items-center gap-3 mx-2 rounded-lg transition-colors"
          style={{
            padding: collapsed ? "10px 0" : "10px 12px",
            justifyContent: collapsed ? "center" : "flex-start",
            color: "rgba(255,255,255,0.65)",
            width: "calc(100% - 16px)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor =
              "rgba(239,68,68,0.15)";
            (e.currentTarget as HTMLElement).style.color = "#fca5a5";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor =
              "transparent";
            (e.currentTarget as HTMLElement).style.color =
              "rgba(255,255,255,0.65)";
          }}
        >
          <LogOut size={18} className="shrink-0" />
          {!collapsed && (
            <span style={{ fontSize: "14px", fontWeight: 500 }}>Sign out</span>
          )}
        </button>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center mt-2 rounded-lg transition-colors"
          style={{
            padding: "8px",
            color: "rgba(255,255,255,0.4)",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.color = "white")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.color =
              "rgba(255,255,255,0.4)")
          }
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  );
}
