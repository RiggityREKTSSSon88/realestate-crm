"use client";

import { useState } from "react";

type Plan = "starter" | "professional" | "enterprise";

type PlanConfig = {
  key: Plan;
  name: string;
  tagline: string;
  features: string[];
  ctaLabel: string;
  ctaStyle: "navy" | "gold" | "outline";
  popular: boolean;
};

const PLANS: PlanConfig[] = [
  {
    key: "starter",
    name: "Starter",
    tagline: "Perfect for small agencies",
    features: [
      "Up to 3 agents",
      "Contacts, Properties & Appraisals",
      "Pipeline management",
      "Email & SMS templates",
      "Basic reports",
    ],
    ctaLabel: "Start Free Trial",
    ctaStyle: "navy",
    popular: false,
  },
  {
    key: "professional",
    name: "Professional",
    tagline: "For growing agencies",
    features: [
      "Up to 10 agents",
      "Everything in Starter",
      "Digital proposals & signing",
      "KYC/AML compliance",
      "Advanced reports & exports",
      "Commission tracking",
    ],
    ctaLabel: "Start Free Trial",
    ctaStyle: "gold",
    popular: true,
  },
  {
    key: "enterprise",
    name: "Enterprise",
    tagline: "For large agencies & groups",
    features: [
      "Unlimited agents",
      "Everything in Professional",
      "White-label options",
      "Priority support",
      "Dedicated account manager",
    ],
    ctaLabel: "Contact Sales",
    ctaStyle: "outline",
    popular: false,
  },
];

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "Can I change plans later?",
    a: "Yes, upgrade or downgrade anytime from your account settings.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes, 14 days free on any plan. No credit card required to start.",
  },
  {
    q: "How does billing work?",
    a: "Monthly subscription billed on your start date. Cancel anytime with no penalty.",
  },
  {
    q: "Is my data secure?",
    a: "Enterprise-grade security with Australian data residency and full RLS isolation per agency.",
  },
];

function CheckIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      style={{ flexShrink: 0, marginTop: "1px" }}
    >
      <circle cx="7.5" cy="7.5" r="7.5" fill="#dcfce7" />
      <path d="M4.5 7.5L6.5 9.5L10.5 5.5" stroke="#15803d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ borderBottom: "1px solid var(--color-slate-200)" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "18px 0",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          gap: "16px",
        }}
      >
        <span style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-slate-900)" }}>
          {q}
        </span>
        <span
          style={{
            fontSize: "20px",
            color: "var(--color-slate-400)",
            lineHeight: 1,
            flexShrink: 0,
            transition: "transform 0.2s",
            display: "inline-block",
            transform: open ? "rotate(45deg)" : "rotate(0deg)",
          }}
        >
          +
        </span>
      </button>
      {open && (
        <div
          style={{
            paddingBottom: "18px",
            fontSize: "14px",
            color: "var(--color-slate-600)",
            lineHeight: 1.6,
          }}
        >
          {a}
        </div>
      )}
    </div>
  );
}

export default function PricingClient() {
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState<Plan | null>(null);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleSelectPlan(plan: string) {
    setLoading(plan as Plan);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = (await res.json()) as { placeholder?: boolean; url?: string };
      if (data.placeholder) {
        showToast("Billing coming soon — your trial has been activated.");
      } else if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      showToast("Billing coming soon — your trial has been activated.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f8fafc",
        fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)",
      }}
    >
      {toast !== null && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "#16a34a",
            color: "white",
            padding: "12px 20px",
            borderRadius: "10px",
            fontSize: "14px",
            fontWeight: 500,
            zIndex: 1000,
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            maxWidth: "90vw",
            textAlign: "center",
            whiteSpace: "nowrap",
          }}
        >
          {toast}
        </div>
      )}

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 24px" }}>
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 0",
            borderBottom: "1px solid var(--color-slate-200)",
          }}
        >
          <span style={{ fontSize: "22px", fontWeight: 800, color: "#0F2942", letterSpacing: "-0.02em" }}>
            Estate<span style={{ color: "#F5A623" }}>IQ</span>
          </span>
          <nav style={{ display: "flex", gap: "24px", alignItems: "center" }}>
            <a
              href="/login"
              style={{
                fontSize: "14px",
                fontWeight: 500,
                color: "var(--color-slate-600)",
                textDecoration: "none",
              }}
            >
              Login
            </a>
            <a
              href="/dashboard"
              style={{
                fontSize: "14px",
                fontWeight: 500,
                color: "#0F2942",
                textDecoration: "none",
              }}
            >
              Dashboard
            </a>
          </nav>
        </header>

        <section style={{ textAlign: "center", padding: "64px 0 48px 0" }}>
          <h1
            style={{
              fontSize: "48px",
              fontWeight: 700,
              color: "#0F2942",
              margin: "0 0 16px 0",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
            }}
          >
            Simple, transparent pricing
          </h1>
          <p style={{ fontSize: "18px", color: "var(--color-slate-500)", margin: 0 }}>
            Start your free trial — no credit card required.
          </p>
        </section>

        <div
          style={{
            backgroundColor: "#fef9c3",
            border: "1px solid #fcd34d",
            borderRadius: "10px",
            padding: "14px 18px",
            marginBottom: "48px",
            color: "#b45309",
            fontSize: "13px",
            fontWeight: 500,
            lineHeight: 1.5,
          }}
        >
          Pricing not yet finalised — amounts shown are placeholders. Final pricing will be confirmed before launch.
        </div>

        <div
          style={{
            display: "flex",
            gap: "24px",
            justifyContent: "center",
            maxWidth: "960px",
            margin: "0 auto 80px auto",
            alignItems: "stretch",
          }}
        >
          {PLANS.map((plan) => (
            <div
              key={plan.key}
              style={{
                backgroundColor: "white",
                border: plan.popular ? "2px solid #0F2942" : "1px solid var(--color-slate-200)",
                borderRadius: "16px",
                padding: "32px",
                display: "flex",
                flexDirection: "column",
                flex: 1,
                position: "relative",
                boxShadow: plan.popular ? "0 8px 32px rgba(15,41,66,0.12)" : "none",
              }}
            >
              {plan.popular && (
                <div
                  style={{
                    position: "absolute",
                    top: "-13px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    backgroundColor: "#F5A623",
                    color: "white",
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "4px 14px",
                    borderRadius: "999px",
                    whiteSpace: "nowrap",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  Most Popular
                </div>
              )}

              <div style={{ marginBottom: "24px" }}>
                <h2
                  style={{
                    fontSize: "20px",
                    fontWeight: 700,
                    color: "#0F2942",
                    margin: "0 0 6px 0",
                  }}
                >
                  {plan.name}
                </h2>
                <p style={{ fontSize: "13px", color: "var(--color-slate-500)", margin: "0 0 16px 0" }}>
                  {plan.tagline}
                </p>
                <div
                  style={{
                    fontSize: "28px",
                    fontWeight: 800,
                    color: "#0F2942",
                    letterSpacing: "-0.02em",
                  }}
                >
                  $— /month
                </div>
                <div style={{ fontSize: "11px", color: "var(--color-slate-400)", marginTop: "4px" }}>
                  TODO: STRIPE — price TBC
                </div>
              </div>

              <ul
                style={{
                  listStyle: "none",
                  margin: "0 0 32px 0",
                  padding: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  flex: 1,
                }}
              >
                {plan.features.map((f) => (
                  <li
                    key={f}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "8px",
                      fontSize: "14px",
                      color: "var(--color-slate-700)",
                    }}
                  >
                    <CheckIcon />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                disabled={loading === plan.key}
                onClick={() => {
                  if (plan.ctaStyle === "outline") {
                    window.location.href = "mailto:sales@estateiq.com.au";
                  } else {
                    void handleSelectPlan(plan.key);
                  }
                }}
                style={{
                  width: "100%",
                  padding: "13px",
                  borderRadius: "10px",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: loading === plan.key ? "not-allowed" : "pointer",
                  opacity: loading === plan.key ? 0.7 : 1,
                  transition: "opacity 0.15s",
                  ...(plan.ctaStyle === "navy"
                    ? {
                        backgroundColor: "#0F2942",
                        color: "white",
                        border: "none",
                      }
                    : plan.ctaStyle === "gold"
                    ? {
                        backgroundColor: "#F5A623",
                        color: "white",
                        border: "none",
                      }
                    : {
                        backgroundColor: "transparent",
                        color: "#0F2942",
                        border: "2px solid #0F2942",
                      }),
                }}
              >
                {loading === plan.key ? "Loading…" : plan.ctaLabel}
              </button>
            </div>
          ))}
        </div>

        <section style={{ maxWidth: "640px", margin: "0 auto 80px auto" }}>
          <div style={{ borderTop: "1px solid var(--color-slate-200)" }}>
            {FAQ_ITEMS.map((item) => (
              <FAQItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </section>

        <footer
          style={{
            textAlign: "center",
            padding: "24px 0 40px 0",
            fontSize: "13px",
            color: "var(--color-slate-400)",
            borderTop: "1px solid var(--color-slate-200)",
          }}
        >
          © 2026 EstateIQ · Built for Australian real estate agencies
        </footer>
      </div>
    </div>
  );
}
