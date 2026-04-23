"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { User, DollarSign, Calendar, TrendingUp, Loader2, KanbanSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// ─── Raw types from server ───────────────────────────────────────────────────

type RawProperty = {
  id: string;
  address: string;
  suburb: string;
  state: string;
  property_type: string;
  status: "appraisal" | "listed" | "under_offer" | "sold";
  appraisals: Array<{
    id: string;
    contact_id: string;
    estimated_value_low: number | null;
    estimated_value_high: number | null;
    status: "hot" | "warm" | "cold";
    appraisal_date: string;
    contacts: { id: string; full_name: string } | null;
  }>;
};

type RawListing = {
  id: string;
  property_id: string;
  contact_id: string | null;
  list_price: number | null;
  list_date: string;
  status: "active" | "under_offer" | "sold";
  enquiries_count: number;
  offers_received: number;
  contracts_out: number;
};

// ─── Normalised card for display ─────────────────────────────────────────────

type PipelineCard = {
  propertyId: string;
  address: string;
  suburb: string;
  state: string;
  propertyType: string;
  stage: "appraisal" | "listed" | "under_offer" | "sold";
  contactName: string | null;
  contactId: string | null;
  estimatedLow: number | null;
  estimatedHigh: number | null;
  appraisalStatus: "hot" | "warm" | "cold" | null;
  listingId: string | null;
  listPrice: number | null;
  listDate: string | null;
  daysOnMarket: number | null;
  enquiries: number;
  offers: number;
  contracts: number;
};

// ─── Stage config ─────────────────────────────────────────────────────────────

const STAGES = [
  { key: "appraisal",   label: "Appraisal",   color: "#1d4ed8", bg: "#dbeafe", headerBg: "#1d4ed8" },
  { key: "listed",      label: "Listed",      color: "#065f46", bg: "#d1fae5", headerBg: "#059669" },
  { key: "under_offer", label: "Under Offer", color: "#b45309", bg: "#fef3c7", headerBg: "#d97706" },
  { key: "sold",        label: "Sold",        color: "#b91c1c", bg: "#fee2e2", headerBg: "#dc2626" },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const APPRAISAL_STATUS_COLORS: Record<"hot" | "warm" | "cold", { bg: string; text: string }> = {
  hot:  { bg: "#fee2e2", text: "#b91c1c" },
  warm: { bg: "#fef3c7", text: "#b45309" },
  cold: { bg: "#dbeafe", text: "#1d4ed8" },
};

function fmt(val: number | null): string {
  if (val === null) return "—";
  return `$${val.toLocaleString("en-AU")}`;
}

function fmtPropertyType(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, " ");
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PipelineClient({
  properties,
  listings,
}: {
  properties: RawProperty[];
  listings: RawListing[];
}) {
  const router = useRouter();

  // Local copy so we can do optimistic updates
  const [localProperties, setLocalProperties] = useState<RawProperty[]>(properties);

  // DnD state
  const [dragging, setDragging] = useState<string | null>(null);   // propertyId
  const [dragOver, setDragOver] = useState<string | null>(null);   // stage key
  const [saving, setSaving] = useState<string | null>(null);       // propertyId being moved

  // ── Normalisation ──────────────────────────────────────────────────────────
  const cards = useMemo<PipelineCard[]>(() => {
    return localProperties.map((p): PipelineCard => {
      const appraisal = p.appraisals?.[0] ?? null;
      const listing = listings.find((l) => l.property_id === p.id) ?? null;
      const dom = listing?.list_date
        ? Math.floor((Date.now() - new Date(listing.list_date).getTime()) / 86400000)
        : null;
      return {
        propertyId:      p.id,
        address:         p.address,
        suburb:          p.suburb,
        state:           p.state,
        propertyType:    p.property_type,
        stage:           p.status as PipelineCard["stage"],
        contactName:     appraisal?.contacts?.full_name ?? null,
        contactId:       appraisal?.contact_id ?? null,
        estimatedLow:    appraisal?.estimated_value_low ?? null,
        estimatedHigh:   appraisal?.estimated_value_high ?? null,
        appraisalStatus: appraisal?.status ?? null,
        listingId:       listing?.id ?? null,
        listPrice:       listing?.list_price ?? null,
        listDate:        listing?.list_date ?? null,
        daysOnMarket:    dom,
        enquiries:       listing?.enquiries_count ?? 0,
        offers:          listing?.offers_received ?? 0,
        contracts:       listing?.contracts_out ?? 0,
      };
    });
  }, [localProperties, listings]);

  // ── Drag & drop handlers ───────────────────────────────────────────────────

  function handleDragStart(e: React.DragEvent, propertyId: string) {
    setDragging(propertyId);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent, stageKey: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(stageKey);
  }

  function handleDragLeave(e: React.DragEvent, stageKey: string) {
    // Only clear if we're leaving the column entirely (not entering a child)
    const related = e.relatedTarget as Node | null;
    if (related && (e.currentTarget as HTMLElement).contains(related)) return;
    if (dragOver === stageKey) setDragOver(null);
  }

  function handleDragEnd() {
    setDragging(null);
    setDragOver(null);
  }

  async function handleDrop(targetStage: string) {
    if (!dragging) return;

    const card = cards.find((c) => c.propertyId === dragging);
    if (!card || card.stage === targetStage) {
      setDragging(null);
      setDragOver(null);
      return;
    }

    setSaving(dragging);
    setDragging(null);
    setDragOver(null);

    const supabase = createClient();

    const listingStatusMap: Record<string, string> = {
      listed:      "active",
      under_offer: "under_offer",
      sold:        "sold",
    };

    await supabase
      .from("properties")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ status: targetStage as any })
      .eq("id", card.propertyId);

    if (card.listingId && listingStatusMap[targetStage]) {
      await supabase
        .from("listings")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({ status: listingStatusMap[targetStage] as any })
        .eq("id", card.listingId);
    }

    // Optimistic update
    setLocalProperties((prev) =>
      prev.map((p) =>
        p.id === card.propertyId
          ? { ...p, status: targetStage as RawProperty["status"] }
          : p
      )
    );

    setSaving(null);
  }

  // ── Card click ─────────────────────────────────────────────────────────────

  function handleCardClick(card: PipelineCard) {
    if (card.listingId) {
      router.push(`/listings/${card.listingId}`);
    } else if (card.contactId) {
      router.push(`/contacts/${card.contactId}`);
    }
  }

  // ── Column card list ───────────────────────────────────────────────────────
  const cardsByStage = useMemo(() => {
    const map: Record<string, PipelineCard[]> = {};
    for (const stage of STAGES) map[stage.key] = [];
    for (const card of cards) {
      if (map[card.stage]) map[card.stage].push(card);
    }
    return map;
  }, [cards]);

  const totalCards = cards.length;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        padding: "24px",
        gap: "20px",
      }}
    >
      {/* Page header */}
      <div style={{ flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <KanbanSquare size={22} style={{ color: "var(--color-navy-800)" }} />
          <h1
            style={{
              fontSize: "24px",
              fontWeight: 700,
              color: "var(--color-navy-800)",
              margin: 0,
            }}
          >
            Pipeline
          </h1>
        </div>
        <p
          style={{
            fontSize: "14px",
            color: "var(--color-slate-500)",
            marginTop: "2px",
          }}
        >
          {totalCards} {totalCards === 1 ? "property" : "properties"} across 4 stages
        </p>
      </div>

      {/* Kanban board */}
      <div
        style={{
          display: "flex",
          gap: "16px",
          flex: 1,
          minHeight: 0,
          overflowX: "auto",
          overflowY: "hidden",
          paddingBottom: "8px",
        }}
      >
        {STAGES.map((stage) => {
          const stageCards = cardsByStage[stage.key] ?? [];
          const isOver = dragOver === stage.key;

          return (
            <div
              key={stage.key}
              onDragOver={(e) => handleDragOver(e, stage.key)}
              onDragLeave={(e) => handleDragLeave(e, stage.key)}
              onDrop={() => handleDrop(stage.key)}
              style={{
                display: "flex",
                flexDirection: "column",
                minWidth: "280px",
                width: "280px",
                flexShrink: 0,
                borderRadius: "12px",
                overflow: "hidden",
                border: isOver
                  ? `2px solid ${stage.headerBg}`
                  : "2px solid transparent",
                transition: "border-color 0.15s ease",
                backgroundColor: isOver ? stage.bg : "transparent",
              }}
            >
              {/* Column header */}
              <div
                style={{
                  backgroundColor: stage.headerBg,
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    color: "white",
                    fontWeight: 600,
                    fontSize: "14px",
                    letterSpacing: "0.01em",
                  }}
                >
                  {stage.label}
                </span>
                <span
                  style={{
                    backgroundColor: "rgba(255,255,255,0.25)",
                    color: "white",
                    borderRadius: "999px",
                    padding: "2px 10px",
                    fontSize: "12px",
                    fontWeight: 600,
                    minWidth: "26px",
                    textAlign: "center",
                  }}
                >
                  {stageCards.length}
                </span>
              </div>

              {/* Cards area */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  backgroundColor: isOver ? stage.bg : "var(--color-slate-100)",
                  transition: "background-color 0.15s ease",
                  minHeight: 0,
                }}
              >
                {stageCards.length === 0 ? (
                  <div
                    style={{
                      border: `2px dashed ${stage.color}40`,
                      borderRadius: "10px",
                      padding: "32px 16px",
                      textAlign: "center",
                      color: stage.color,
                      fontSize: "13px",
                      opacity: 0.6,
                    }}
                  >
                    No properties
                  </div>
                ) : (
                  stageCards.map((card) => (
                    <KanbanCard
                      key={card.propertyId}
                      card={card}
                      stage={stage}
                      isDragging={dragging === card.propertyId}
                      isSaving={saving === card.propertyId}
                      onDragStart={(e) => handleDragStart(e, card.propertyId)}
                      onDragEnd={handleDragEnd}
                      onClick={() => handleCardClick(card)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── KanbanCard ───────────────────────────────────────────────────────────────

type StageConfig = (typeof STAGES)[number];

function KanbanCard({
  card,
  stage,
  isDragging,
  isSaving,
  onDragStart,
  onDragEnd,
  onClick,
}: {
  card: PipelineCard;
  stage: StageConfig;
  isDragging: boolean;
  isSaving: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onClick: () => void;
}) {
  const showStats =
    card.stage === "listed" ||
    card.stage === "under_offer" ||
    card.stage === "sold";

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      style={{
        position: "relative",
        backgroundColor: "white",
        borderRadius: "10px",
        boxShadow: isDragging
          ? "0 8px 24px rgba(0,0,0,0.18)"
          : "0 1px 4px rgba(0,0,0,0.07)",
        border: "1px solid var(--color-slate-200)",
        overflow: "hidden",
        cursor: isSaving ? "wait" : isDragging ? "grabbing" : "grab",
        opacity: isDragging ? 0.55 : 1,
        transition: "box-shadow 0.15s ease, opacity 0.15s ease",
        userSelect: "none",
      }}
      onMouseEnter={(e) => {
        if (!isDragging && !isSaving) {
          (e.currentTarget as HTMLElement).style.boxShadow =
            "0 4px 14px rgba(0,0,0,0.12)";
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow =
          isDragging
            ? "0 8px 24px rgba(0,0,0,0.18)"
            : "0 1px 4px rgba(0,0,0,0.07)";
      }}
    >
      {/* Left colour strip */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: "4px",
          backgroundColor: stage.color,
          borderRadius: "10px 0 0 10px",
        }}
      />

      {/* Saving spinner overlay */}
      {isSaving && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(255,255,255,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "10px",
            zIndex: 10,
          }}
        >
          <Loader2
            size={20}
            className="animate-spin"
            style={{ color: stage.color }}
          />
        </div>
      )}

      {/* Card body */}
      <div style={{ padding: "12px 12px 12px 18px" }}>
        {/* Address */}
        <div
          style={{
            fontWeight: 700,
            fontSize: "13px",
            color: "var(--color-navy-800)",
            lineHeight: "1.35",
            marginBottom: "2px",
          }}
        >
          {card.address}
        </div>

        {/* Suburb, State + property type */}
        <div
          style={{
            fontSize: "12px",
            color: "var(--color-slate-500)",
            marginBottom: "8px",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <span>
            {card.suburb}, {card.state}
          </span>
          <span style={{ color: "var(--color-slate-300)" }}>·</span>
          <span style={{ color: "var(--color-slate-400)" }}>
            {fmtPropertyType(card.propertyType)}
          </span>
        </div>

        {/* Contact */}
        {card.contactName && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              fontSize: "12px",
              color: "var(--color-slate-600)",
              marginBottom: "8px",
            }}
          >
            <User size={12} style={{ color: "var(--color-slate-400)", flexShrink: 0 }} />
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {card.contactName}
            </span>
          </div>
        )}

        {/* Price line */}
        <PriceLine card={card} />

        {/* Badges row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            flexWrap: "wrap",
            marginTop: "8px",
          }}
        >
          {/* Appraisal hot/warm/cold badge */}
          {card.stage === "appraisal" && card.appraisalStatus && (
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: "999px",
                backgroundColor: APPRAISAL_STATUS_COLORS[card.appraisalStatus].bg,
                color: APPRAISAL_STATUS_COLORS[card.appraisalStatus].text,
                textTransform: "capitalize",
              }}
            >
              {card.appraisalStatus}
            </span>
          )}

          {/* Days on market badge */}
          {(card.stage === "listed" || card.stage === "under_offer") &&
            card.daysOnMarket !== null && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                  fontSize: "11px",
                  fontWeight: 500,
                  padding: "2px 8px",
                  borderRadius: "999px",
                  backgroundColor: "var(--color-slate-100)",
                  color: "var(--color-slate-600)",
                }}
              >
                <Calendar size={10} />
                {card.daysOnMarket}d on market
              </span>
            )}
        </div>

        {/* Mini stats row */}
        {showStats && (card.enquiries > 0 || card.offers > 0 || card.contracts > 0) && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginTop: "10px",
              paddingTop: "8px",
              borderTop: "1px solid var(--color-slate-100)",
            }}
          >
            <StatPill label="Enq" value={card.enquiries} color={stage.color} />
            <StatPill label="Off" value={card.offers} color={stage.color} />
            <StatPill label="Con" value={card.contracts} color={stage.color} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Price line sub-component ──────────────────────────────────────────────────

function PriceLine({ card }: { card: PipelineCard }) {
  if (card.stage === "appraisal") {
    if (card.estimatedLow !== null || card.estimatedHigh !== null) {
      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            fontSize: "12px",
            color: "var(--color-slate-700)",
          }}
        >
          <DollarSign size={12} style={{ color: "var(--color-slate-400)", flexShrink: 0 }} />
          <span>
            {fmt(card.estimatedLow)} – {fmt(card.estimatedHigh)}
          </span>
        </div>
      );
    }
    return null;
  }

  if (card.listPrice !== null) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "5px",
          fontSize: "12px",
          color: "var(--color-slate-700)",
        }}
      >
        <TrendingUp size={12} style={{ color: "var(--color-slate-400)", flexShrink: 0 }} />
        <span style={{ fontWeight: 600 }}>{fmt(card.listPrice)}</span>
        {card.listDate && (
          <>
            <span style={{ color: "var(--color-slate-300)" }}>·</span>
            <span style={{ color: "var(--color-slate-400)" }}>
              Listed{" "}
              {new Date(card.listDate).toLocaleDateString("en-AU", {
                day: "numeric",
                month: "short",
              })}
            </span>
          </>
        )}
      </div>
    );
  }

  return null;
}

// ── Stat pill sub-component ───────────────────────────────────────────────────

function StatPill({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "3px",
        fontSize: "11px",
        color: "var(--color-slate-500)",
      }}
    >
      <span
        style={{
          fontWeight: 700,
          color,
          fontSize: "12px",
          lineHeight: 1,
        }}
      >
        {value}
      </span>
      <span>{label}</span>
    </div>
  );
}
