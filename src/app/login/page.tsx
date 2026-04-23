"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2, Home } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });

    if (err) {
      setError("Invalid email or password.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  const inputStyle = {
    width: "100%",
    padding: "11px 14px",
    fontSize: "15px",
    border: "1px solid var(--color-slate-200)",
    borderRadius: "10px",
    outline: "none",
    backgroundColor: "white",
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: "var(--color-navy-800)" }}
    >
      <div
        className="w-full rounded-2xl p-8"
        style={{ maxWidth: "400px", backgroundColor: "white", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div
            className="flex items-center justify-center rounded-xl"
            style={{ width: "44px", height: "44px", backgroundColor: "var(--color-navy-800)" }}
          >
            <Home size={22} color="white" />
          </div>
          <div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--color-navy-800)" }}>
              EstateIQ
            </div>
            <div style={{ fontSize: "12px", color: "var(--color-slate-400)" }}>Real Estate CRM</div>
          </div>
        </div>

        <h1 style={{ fontSize: "22px", fontWeight: 600, color: "var(--color-slate-900)", marginBottom: "6px" }}>
          Sign in
        </h1>
        <p style={{ fontSize: "14px", color: "var(--color-slate-500)", marginBottom: "28px" }}>
          Welcome back. Enter your credentials to continue.
        </p>

        {error && (
          <div
            className="rounded-lg px-4 py-3 mb-4"
            style={{ backgroundColor: "#fee2e2", color: "#b91c1c", fontSize: "14px" }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label
              style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-slate-700)", marginBottom: "6px", display: "block" }}
            >
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@agency.com.au"
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label
              style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-slate-700)", marginBottom: "6px", display: "block" }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl font-semibold mt-2 transition-colors"
            style={{
              padding: "12px",
              fontSize: "15px",
              backgroundColor: "var(--color-navy-800)",
              color: "white",
              opacity: loading ? 0.8 : 1,
            }}
            onMouseEnter={(e) =>
              !loading && ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-navy-700)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-navy-800)")
            }
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
