"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function SuperAdminSignOut() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <button
      onClick={handleSignOut}
      style={{
        backgroundColor: "transparent",
        border: "1px solid rgba(255,255,255,0.25)",
        color: "rgba(255,255,255,0.8)",
        borderRadius: "6px",
        padding: "6px 14px",
        fontSize: "13px",
        fontWeight: 500,
        cursor: "pointer",
      }}
    >
      Sign out
    </button>
  );
}
