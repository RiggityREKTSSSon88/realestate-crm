import Link from "next/link";
import { Star, Plug } from "lucide-react";

const sections = [
  {
    href: "/settings/reviews",
    icon: Star,
    color: "#b45309",
    title: "Reviews",
    description: "Manage your RateMyAgent reviews and agent profile ratings.",
  },
  {
    href: "/settings/integrations",
    icon: Plug,
    color: "#7c3aed",
    title: "Integrations",
    description: "Connect CoreLogic, Domain, Zapier, and more third-party platforms.",
  },
];

export default function SettingsPage() {
  return (
    <div className="p-6 max-w-screen-md mx-auto">
      <div className="mb-6">
        <h1 style={{ fontSize: "24px", fontWeight: 700, color: "var(--color-navy-800)" }}>Settings</h1>
        <p style={{ fontSize: "14px", color: "var(--color-slate-500)", marginTop: "2px" }}>Manage your account and agency configuration.</p>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
        {sections.map(({ href, icon: Icon, color, title, description }) => (
          <Link key={href} href={href}
            className="rounded-xl p-5 flex items-start gap-4 transition-shadow block"
            style={{ backgroundColor: "white", border: "1px solid var(--color-slate-200)", textDecoration: "none" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.boxShadow = "none")}
          >
            <div className="flex items-center justify-center rounded-xl shrink-0"
              style={{ width: 44, height: 44, backgroundColor: color + "18" }}>
              <Icon size={20} style={{ color }} />
            </div>
            <div>
              <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-navy-800)" }}>{title}</div>
              <p style={{ fontSize: "13px", color: "var(--color-slate-500)", marginTop: "2px", lineHeight: 1.5 }}>{description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
