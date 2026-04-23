"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Search, User, Building2, ClipboardList, X } from "lucide-react";
import { useRouter } from "next/navigation";
import type { SearchResult } from "@/app/api/search/route";

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results ?? []);
      setOpen(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(query), 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query, search]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected((s) => Math.min(s + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
    else if (e.key === "Enter" && selected >= 0) { navigate(results[selected]); }
    else if (e.key === "Escape") { setOpen(false); inputRef.current?.blur(); }
  }

  function navigate(result: SearchResult) {
    router.push(result.href);
    setQuery("");
    setOpen(false);
    setSelected(-1);
  }

  const typeIcon = (type: SearchResult["type"]) => {
    if (type === "contact") return <User size={14} />;
    if (type === "property") return <Building2 size={14} />;
    return <ClipboardList size={14} />;
  };

  const typeColor = (type: SearchResult["type"]) => {
    if (type === "contact") return { bg: "#eff6ff", color: "#1d4ed8" };
    if (type === "property") return { bg: "#f0fdf4", color: "#166534" };
    return { bg: "#fefce8", color: "#854d0e" };
  };

  return (
    <div ref={containerRef} className="relative" style={{ width: "420px" }}>
      <div
        className="flex items-center gap-2 rounded-xl px-3"
        style={{
          border: "1px solid var(--color-slate-200)",
          backgroundColor: "var(--color-slate-50)",
          height: "40px",
        }}
      >
        <Search size={16} style={{ color: "var(--color-slate-400)", flexShrink: 0 }} />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelected(-1); }}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          placeholder="Search contacts, properties, appraisals…"
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            background: "transparent",
            fontSize: "14px",
            color: "var(--color-slate-800)",
          }}
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setResults([]); setOpen(false); }}
            style={{ color: "var(--color-slate-400)", flexShrink: 0 }}
          >
            <X size={14} />
          </button>
        )}
        {loading && (
          <div
            style={{
              width: "14px",
              height: "14px",
              border: "2px solid var(--color-slate-200)",
              borderTopColor: "var(--color-navy-800)",
              borderRadius: "50%",
              animation: "spin 0.6s linear infinite",
              flexShrink: 0,
            }}
          />
        )}
      </div>

      {open && results.length > 0 && (
        <div
          className="absolute top-full left-0 right-0 mt-2 rounded-xl overflow-hidden"
          style={{
            backgroundColor: "white",
            border: "1px solid var(--color-slate-200)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            zIndex: 100,
          }}
        >
          {results.map((result, i) => {
            const tc = typeColor(result.type);
            return (
              <button
                key={result.id}
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                style={{
                  backgroundColor: i === selected ? "var(--color-slate-50)" : "white",
                  borderBottom: i < results.length - 1 ? "1px solid var(--color-slate-100)" : "none",
                }}
                onMouseEnter={() => setSelected(i)}
                onClick={() => navigate(result)}
              >
                <span
                  className="flex items-center justify-center rounded-md shrink-0"
                  style={{ width: "28px", height: "28px", backgroundColor: tc.bg, color: tc.color }}
                >
                  {typeIcon(result.type)}
                </span>
                <div className="min-w-0">
                  <div style={{ fontSize: "14px", fontWeight: 500, color: "var(--color-slate-800)" }} className="truncate">
                    {result.title}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--color-slate-400)" }} className="truncate">
                    {result.subtitle}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {open && results.length === 0 && query.length >= 2 && !loading && (
        <div
          className="absolute top-full left-0 right-0 mt-2 rounded-xl px-4 py-3"
          style={{
            backgroundColor: "white",
            border: "1px solid var(--color-slate-200)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            zIndex: 100,
            fontSize: "14px",
            color: "var(--color-slate-400)",
          }}
        >
          No results for &ldquo;{query}&rdquo;
        </div>
      )}
    </div>
  );
}
