import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SuperAdminSignOut from "./SuperAdminSignOut";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "super_admin") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f8fafc",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: "72px",
              fontWeight: 800,
              color: "#0F2942",
              lineHeight: 1,
              marginBottom: "12px",
            }}
          >
            403
          </div>
          <p style={{ fontSize: "16px", color: "var(--color-slate-500)", margin: 0 }}>
            You do not have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc" }}>
      <header
        style={{
          backgroundColor: "#0F2942",
          height: "64px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <span
          style={{
            color: "white",
            fontSize: "16px",
            fontWeight: 700,
            letterSpacing: "-0.01em",
          }}
        >
          EstateIQ Super Admin
        </span>
        <SuperAdminSignOut />
      </header>
      <main style={{ backgroundColor: "white", minHeight: "calc(100vh - 64px)" }}>
        {children}
      </main>
    </div>
  );
}
