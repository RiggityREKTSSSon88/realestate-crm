"use client";

import { useState, useEffect } from "react";
import { Sparkles, Loader2, AlertCircle, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";

type Insights = {
  configured: boolean;
  summary: string | null;
  recommendation: string | null;
  followUp: string | null;
  engagementLevel: "low" | "medium" | "high" | null;
};

const ENGAGEMENT_CONFIG = {
  high: { bg: "#dcfce7", text: "#166534", label: "High Engagement" },
  medium: { bg: "#fef3c7", text: "#b45309", label: "Medium Engagement" },
  low: { bg: "#f1f5f9", text: "#475569", label: "Low Engagement" },
};

export default function AIInsightsPanel({ contactId }: { contactId: string }) {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [loaded, setLoaded] = useState(false);

  async function fetchInsights() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId }),
      });
      if (!res.ok) throw new Error("Failed to load insights");
      const data = await res.json();
      setInsights(data);
      setLoaded(true);
    } catch {
      setError("Could not load AI insights. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchInsights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId]);

  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "white", border: "1px solid var(--color-slate-200)" }}>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-5 py-4"
        style={{ borderBottom: expanded ? "1px solid var(--color-slate-200)" : "none", cursor: "pointer", background: "none", textAlign: "left" }}
      >
        <Sparkles size={16} style={{ color: "#7c3aed" }} />
        <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-navy-800)", flex: 1 }}>AI Insights</span>
        {loaded && !loading && (
          <button
            onClick={(e) => { e.stopPropagation(); fetchInsights(); }}
            className="flex items-center justify-center rounded p-1 transition-colors"
            style={{ color: "var(--color-slate-400)" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#7c3aed")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--color-slate-400)")}
            title="Refresh insights"
          >
            <RefreshCw size={13} />
          </button>
        )}
        {expanded ? <ChevronUp size={14} style={{ color: "var(--color-slate-400)" }} /> : <ChevronDown size={14} style={{ color: "var(--color-slate-400)" }} />}
      </button>

      {expanded && (
        <div className="px-5 py-4">
          {loading && (
            <div className="flex items-center gap-2" style={{ color: "var(--color-slate-400)" }}>
              <Loader2 size={14} className="animate-spin" />
              <span style={{ fontSize: "13px" }}>Analysing contact history…</span>
            </div>
          )}

          {error && !loading && (
            <div className="flex items-start gap-2">
              <AlertCircle size={14} style={{ color: "#b91c1c", marginTop: "2px", flexShrink: 0 }} />
              <span style={{ fontSize: "13px", color: "#b91c1c" }}>{error}</span>
            </div>
          )}

          {insights && !loading && !insights.configured && (
            <div className="flex items-start gap-2 rounded-lg px-3 py-2.5" style={{ backgroundColor: "#f8fafc", border: "1px dashed var(--color-slate-300)" }}>
              <Sparkles size={14} style={{ color: "var(--color-slate-400)", marginTop: "1px", flexShrink: 0 }} />
              <p style={{ fontSize: "13px", color: "var(--color-slate-500)", lineHeight: 1.5 }}>
                AI insights are not yet configured. Ask your administrator to add the API key.
              </p>
            </div>
          )}

          {insights && !loading && insights.configured && (
            <div className="flex flex-col gap-3">
              {insights.engagementLevel && (
                <div>
                  <span className="rounded-full px-2.5 py-1 font-medium"
                    style={{ fontSize: "11px", backgroundColor: ENGAGEMENT_CONFIG[insights.engagementLevel].bg, color: ENGAGEMENT_CONFIG[insights.engagementLevel].text }}>
                    {ENGAGEMENT_CONFIG[insights.engagementLevel].label}
                  </span>
                </div>
              )}

              {insights.summary && (
                <div>
                  <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-slate-500)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Summary</p>
                  <p style={{ fontSize: "13px", color: "var(--color-slate-700)", lineHeight: 1.6 }}>{insights.summary}</p>
                </div>
              )}

              {insights.recommendation && (
                <div className="rounded-lg px-3 py-2.5" style={{ backgroundColor: "#f5f3ff", border: "1px solid #ede9fe" }}>
                  <p style={{ fontSize: "12px", fontWeight: 600, color: "#7c3aed", marginBottom: "3px" }}>Recommended Action</p>
                  <p style={{ fontSize: "13px", color: "#5b21b6", lineHeight: 1.5 }}>{insights.recommendation}</p>
                </div>
              )}

              {insights.followUp && (
                <div>
                  <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-slate-500)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Talking Point</p>
                  <p style={{ fontSize: "13px", color: "var(--color-slate-600)", lineHeight: 1.6, fontStyle: "italic" }}>&ldquo;{insights.followUp}&rdquo;</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
