"use client";

import { useEffect, useRef } from "react";
import type { Proposal, ProposalSection, AgentReview } from "@/types/database";

type Contact = {
  full_name: string;
  email: string | null;
  phone: string | null;
};

type Property = {
  address: string;
  suburb: string;
  state: string;
  postcode: string;
};

type Agent = {
  full_name: string;
  email: string;
  avatar_url: string | null;
};

type ProposalPreviewProps = {
  proposal: Proposal;
  contact: Contact | null;
  property: Property | null;
  agent: Agent | null;
  reviews: AgentReview[];
};

function formatPrice(value: unknown): string {
  const n = Number(value);
  if (!isFinite(n) || n === 0) return "—";
  return "$" + n.toLocaleString("en-AU");
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function CoverSection({ section, contact, property, agent }: {
  section: ProposalSection;
  contact: Contact | null;
  property: Property | null;
  agent: Agent | null;
}) {
  const addr = property
    ? `${property.address}, ${property.suburb} ${property.state} ${property.postcode}`
    : null;

  return (
    <div
      data-section-id={section.id}
      style={{
        background: "#0F2942",
        borderRadius: "12px",
        padding: "56px 48px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "320px",
          height: "320px",
          background: "radial-gradient(circle at top right, rgba(245,166,35,0.18) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div style={{ marginBottom: "12px" }}>
        <span
          style={{
            background: "#F5A623",
            color: "#0F2942",
            fontWeight: 700,
            fontSize: "11px",
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            padding: "4px 12px",
            borderRadius: "4px",
          }}
        >
          EstateIQ — Proposal
        </span>
      </div>
      {addr && (
        <h1
          style={{
            color: "#ffffff",
            fontSize: "clamp(22px, 4vw, 36px)",
            fontWeight: 800,
            margin: "20px 0 8px",
            lineHeight: 1.2,
          }}
        >
          {addr}
        </h1>
      )}
      {section.title && !addr && (
        <h1 style={{ color: "#ffffff", fontSize: "32px", fontWeight: 800, margin: "20px 0 8px" }}>
          {section.title}
        </h1>
      )}
      {contact && (
        <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "16px", margin: "0 0 4px" }}>
          Prepared exclusively for{" "}
          <span style={{ color: "#F5A623", fontWeight: 600 }}>{contact.full_name}</span>
        </p>
      )}
      {agent && (
        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "14px", margin: 0 }}>
          By {agent.full_name}
        </p>
      )}
    </div>
  );
}

function AgentBioSection({ section, agent }: { section: ProposalSection; agent: Agent | null }) {
  const yearsExp = section.data["years_experience"];
  const salesYear = section.data["sales_this_year"];
  const name = agent?.full_name ?? "Agent";
  const initials = getInitials(name);

  return (
    <div data-section-id={section.id} style={{ padding: "8px 0" }}>
      <h2
        style={{
          color: "#0F2942",
          fontSize: "22px",
          fontWeight: 700,
          marginBottom: "24px",
        }}
      >
        {section.title || "About Your Agent"}
      </h2>
      <div style={{ display: "flex", gap: "24px", alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flexShrink: 0 }}>
          {agent?.avatar_url ? (
            <img
              src={agent.avatar_url}
              alt={name}
              style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: "3px solid #F5A623" }}
            />
          ) : (
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "#0F2942",
                color: "#F5A623",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                fontWeight: 700,
                border: "3px solid #F5A623",
              }}
            >
              {initials}
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: "200px" }}>
          <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: "18px", color: "#0F2942" }}>
            {name}
          </p>
          {agent?.email && (
            <p style={{ margin: "0 0 12px", color: "#666", fontSize: "14px" }}>{agent.email}</p>
          )}
          {section.body && (
            <p style={{ margin: "0 0 20px", color: "#444", lineHeight: 1.7, fontSize: "15px" }}>
              {section.body}
            </p>
          )}
          {(yearsExp !== undefined || salesYear !== undefined) && (
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
              {yearsExp !== undefined && (
                <div
                  style={{
                    background: "#f8f9fa",
                    border: "1px solid #e9ecef",
                    borderRadius: "8px",
                    padding: "12px 20px",
                    textAlign: "center",
                    minWidth: "100px",
                  }}
                >
                  <div style={{ fontSize: "28px", fontWeight: 800, color: "#0F2942" }}>
                    {String(yearsExp)}
                  </div>
                  <div style={{ fontSize: "12px", color: "#888", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Years Experience
                  </div>
                </div>
              )}
              {salesYear !== undefined && (
                <div
                  style={{
                    background: "#f8f9fa",
                    border: "1px solid #e9ecef",
                    borderRadius: "8px",
                    padding: "12px 20px",
                    textAlign: "center",
                    minWidth: "100px",
                  }}
                >
                  <div style={{ fontSize: "28px", fontWeight: 800, color: "#F5A623" }}>
                    {String(salesYear)}
                  </div>
                  <div style={{ fontSize: "12px", color: "#888", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Sales This Year
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type Comparable = {
  address: string;
  sale_price: number | string | null;
  sale_date: string | null;
};

function ComparableSalesSection({ section }: { section: ProposalSection }) {
  const comps = (section.data["comparables"] ?? []) as Comparable[];

  return (
    <div data-section-id={section.id} style={{ padding: "8px 0" }}>
      <h2 style={{ color: "#0F2942", fontSize: "22px", fontWeight: 700, marginBottom: "20px" }}>
        {section.title || "Comparable Sales"}
      </h2>
      {comps.length === 0 ? (
        <p style={{ color: "#888", fontStyle: "italic" }}>No comparable sales data available.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr style={{ background: "#0F2942", color: "#ffffff" }}>
                <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, borderRadius: "0" }}>
                  Address
                </th>
                <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600 }}>
                  Sale Price
                </th>
                <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600 }}>
                  Sale Date
                </th>
              </tr>
            </thead>
            <tbody>
              {comps.map((c, i) => (
                <tr
                  key={i}
                  style={{ background: i % 2 === 0 ? "#ffffff" : "#f8f9fa", borderBottom: "1px solid #e9ecef" }}
                >
                  <td style={{ padding: "12px 16px", color: "#333" }}>{c.address}</td>
                  <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600, color: "#0F2942" }}>
                    {formatPrice(c.sale_price)}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right", color: "#666" }}>
                    {formatDate(c.sale_date)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PricingSection({ section }: { section: ProposalSection }) {
  const low = section.data["estimated_value_low"];
  const high = section.data["estimated_value_high"];
  const commission = section.data["commission_rate"];
  const budget = section.data["marketing_budget"];

  return (
    <div data-section-id={section.id} style={{ padding: "8px 0" }}>
      <h2 style={{ color: "#0F2942", fontSize: "22px", fontWeight: 700, marginBottom: "20px" }}>
        {section.title || "Pricing Strategy"}
      </h2>
      <div
        style={{
          border: "2px solid #0F2942",
          borderRadius: "12px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            background: "#0F2942",
            padding: "16px 24px",
            color: "#F5A623",
            fontWeight: 700,
            fontSize: "13px",
            letterSpacing: "1px",
            textTransform: "uppercase",
          }}
        >
          Estimated Value Range
        </div>
        <div
          style={{
            padding: "24px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "20px",
          }}
        >
          {(low !== undefined || high !== undefined) && (
            <div style={{ borderRight: "1px solid #e9ecef", paddingRight: "20px" }}>
              <div style={{ fontSize: "12px", color: "#888", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Estimated Range
              </div>
              <div style={{ fontSize: "20px", fontWeight: 800, color: "#0F2942" }}>
                {formatPrice(low)} — {formatPrice(high)}
              </div>
            </div>
          )}
          {commission !== undefined && (
            <div style={{ borderRight: "1px solid #e9ecef", paddingRight: "20px" }}>
              <div style={{ fontSize: "12px", color: "#888", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Commission Rate
              </div>
              <div style={{ fontSize: "20px", fontWeight: 800, color: "#0F2942" }}>
                {String(commission)}%
              </div>
            </div>
          )}
          {budget !== undefined && (
            <div>
              <div style={{ fontSize: "12px", color: "#888", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Marketing Budget
              </div>
              <div style={{ fontSize: "20px", fontWeight: 800, color: "#0F2942" }}>
                {formatPrice(budget)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MarketingSection({ section }: { section: ProposalSection }) {
  const paragraphs = section.body.split("\n").filter((l) => l.trim().length > 0);

  return (
    <div data-section-id={section.id} style={{ padding: "8px 0" }}>
      <h2 style={{ color: "#0F2942", fontSize: "22px", fontWeight: 700, marginBottom: "16px" }}>
        {section.title || "Marketing Plan"}
      </h2>
      <div style={{ color: "#444", lineHeight: 1.8, fontSize: "15px" }}>
        {paragraphs.map((p, i) => (
          <p key={i} style={{ marginBottom: "12px" }}>{p}</p>
        ))}
      </div>
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  const stars = Math.round(Math.max(1, Math.min(5, rating)));
  return (
    <span>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ color: i < stars ? "#F5A623" : "#ddd", fontSize: "16px" }}>★</span>
      ))}
    </span>
  );
}

function SocialProofSection({ section, reviews }: { section: ProposalSection; reviews: AgentReview[] }) {
  return (
    <div data-section-id={section.id} style={{ padding: "8px 0" }}>
      <h2 style={{ color: "#0F2942", fontSize: "22px", fontWeight: 700, marginBottom: "20px" }}>
        {section.title || "What Clients Say"}
      </h2>
      {reviews.length === 0 ? (
        <p style={{ color: "#888", fontStyle: "italic" }}>No reviews yet.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "16px",
          }}
        >
          {reviews.map((r) => (
            <div
              key={r.id}
              style={{
                background: "#ffffff",
                border: "1px solid #e9ecef",
                borderRadius: "10px",
                padding: "20px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                <StarRating rating={r.rating} />
                <span
                  style={{
                    background: "#0F2942",
                    color: "#F5A623",
                    fontSize: "10px",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "12px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  {r.source === "ratemyagent" ? "RateMyAgent" : r.source === "google" ? "Google" : "Other"}
                </span>
              </div>
              <p style={{ color: "#333", fontSize: "14px", lineHeight: 1.6, margin: "0 0 12px", fontStyle: "italic" }}>
                "{r.review_text}"
              </p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600, color: "#0F2942", fontSize: "13px" }}>{r.reviewer_name}</span>
                <span style={{ color: "#aaa", fontSize: "12px" }}>{formatDate(r.review_date)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BookingSection({ section, agentId, proposalId }: {
  section: ProposalSection;
  agentId: string;
  proposalId: string;
}) {
  const href = `/book/${agentId}?proposalId=${proposalId}`;

  return (
    <div data-section-id={section.id} style={{ padding: "8px 0" }}>
      <div
        style={{
          background: "linear-gradient(135deg, #f8f9fa 0%, #fff8ed 100%)",
          border: "2px solid #F5A623",
          borderRadius: "12px",
          padding: "40px",
          textAlign: "center",
        }}
      >
        <h2 style={{ color: "#0F2942", fontSize: "26px", fontWeight: 800, marginBottom: "8px" }}>
          {section.title || "Book a Free Consultation"}
        </h2>
        {section.body && (
          <p style={{ color: "#555", fontSize: "15px", marginBottom: "24px", lineHeight: 1.6 }}>
            {section.body}
          </p>
        )}
        <a
          href={href}
          style={{
            display: "inline-block",
            background: "#F5A623",
            color: "#0F2942",
            fontWeight: 700,
            fontSize: "16px",
            padding: "14px 32px",
            borderRadius: "8px",
            textDecoration: "none",
            letterSpacing: "0.3px",
          }}
        >
          Choose a time →
        </a>
      </div>
    </div>
  );
}

function CustomSection({ section }: { section: ProposalSection }) {
  const paragraphs = section.body.split("\n").filter((l) => l.trim().length > 0);

  return (
    <div data-section-id={section.id} style={{ padding: "8px 0" }}>
      <h2 style={{ color: "#0F2942", fontSize: "22px", fontWeight: 700, marginBottom: "16px" }}>
        {section.title}
      </h2>
      <div style={{ color: "#444", lineHeight: 1.8, fontSize: "15px" }}>
        {paragraphs.map((p, i) => (
          <p key={i} style={{ marginBottom: "12px" }}>{p}</p>
        ))}
      </div>
    </div>
  );
}

function Divider() {
  return <div style={{ borderTop: "1px solid #e9ecef", margin: "8px 0" }} />;
}

export default function ProposalPreview({
  proposal,
  contact,
  property,
  agent,
  reviews,
}: ProposalPreviewProps) {
  const proposalId = proposal.id;
  const startTimeRef = useRef<number>(Date.now());
  const viewedSections = useRef<Set<string>>(new Set());

  useEffect(() => {
    startTimeRef.current = Date.now();

    fetch("/api/proposals/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proposalId, eventType: "opened" }),
    }).catch(() => undefined);

    return () => {
      const seconds = Math.round((Date.now() - startTimeRef.current) / 1000);
      if (seconds > 2) {
        navigator.sendBeacon(
          "/api/proposals/track",
          JSON.stringify({ proposalId, eventType: "time_spent", durationSeconds: seconds })
        );
      }
    };
  }, [proposalId]);

  useEffect(() => {
    const sectionEls = document.querySelectorAll<HTMLElement>("[data-section-id]");
    if (sectionEls.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const sectionId = (entry.target as HTMLElement).dataset["sectionId"];
          if (!sectionId || viewedSections.current.has(sectionId)) return;
          viewedSections.current.add(sectionId);
          fetch("/api/proposals/track", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ proposalId, eventType: "section_viewed", sectionId }),
          }).catch(() => undefined);
        });
      },
      { threshold: 0.3 }
    );

    sectionEls.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [proposalId]);

  const visibleSections = proposal.sections
    .filter((s) => s.visible && !s.adminOnly)
    .sort((a, b) => a.order - b.order);

  const agentId = (proposal as Proposal & { created_by: string | null }).created_by ?? "";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f0f2f5",
        padding: "40px 16px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          background: "#ffffff",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 4px 32px rgba(0,0,0,0.10)",
        }}
      >
        <div style={{ padding: "0" }}>
          {visibleSections.map((section, idx) => (
            <div key={section.id}>
              <div
                style={{
                  padding: section.type === "cover" ? "0" : "32px 40px",
                }}
              >
                {section.type === "cover" && (
                  <div style={{ padding: "40px 40px 0" }}>
                    <CoverSection section={section} contact={contact} property={property} agent={agent} />
                  </div>
                )}
                {section.type === "agent_bio" && (
                  <AgentBioSection section={section} agent={agent} />
                )}
                {section.type === "comparable_sales" && (
                  <ComparableSalesSection section={section} />
                )}
                {section.type === "pricing" && (
                  <PricingSection section={section} />
                )}
                {section.type === "marketing" && (
                  <MarketingSection section={section} />
                )}
                {section.type === "social_proof" && (
                  <SocialProofSection section={section} reviews={reviews} />
                )}
                {section.type === "booking" && agentId && (
                  <BookingSection section={section} agentId={agentId} proposalId={proposalId} />
                )}
                {section.type === "custom" && (
                  <CustomSection section={section} />
                )}
              </div>
              {idx < visibleSections.length - 1 && (
                <div style={{ padding: "0 40px" }}>
                  <Divider />
                </div>
              )}
            </div>
          ))}
        </div>

        {proposal.docuseal_signing_url && (
          <div
            style={{
              background: "#0F2942",
              padding: "40px",
              textAlign: "center",
              marginTop: "8px",
            }}
          >
            <p style={{ color: "rgba(255,255,255,0.8)", marginBottom: "16px", fontSize: "15px" }}>
              Ready to proceed?
            </p>
            <a
              href={proposal.docuseal_signing_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block",
                background: "#F5A623",
                color: "#0F2942",
                fontWeight: 700,
                fontSize: "16px",
                padding: "14px 32px",
                borderRadius: "8px",
                textDecoration: "none",
              }}
            >
              Sign your engagement agreement →
            </a>
          </div>
        )}

        <div
          style={{
            background: "#f8f9fa",
            borderTop: "1px solid #e9ecef",
            padding: "20px 40px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <span style={{ color: "#0F2942", fontWeight: 700, fontSize: "14px" }}>
            Estate<span style={{ color: "#F5A623" }}>IQ</span>
          </span>
          <span style={{ color: "#aaa", fontSize: "12px" }}>
            Created {formatDate(proposal.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}
