"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Phone, Mail, User, Calendar, CheckSquare, Home,
  TrendingUp, Loader2, Save, DollarSign,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Listing, Task, OpenHome, Commission } from "@/types/database";
import CommissionModal from "./CommissionModal";

type ListingFull = Listing & {
  properties: {
    id: string;
    address: string;
    suburb: string;
    state: string;
    postcode: string;
    property_type: string;
    bedrooms: number | null;
    bathrooms: number | null;
  } | null;
  contacts: { id: string; full_name: string; phone: string | null; email: string | null } | null;
  agents: { id: string; full_name: string } | null;
};

type Props = {
  listing: ListingFull;
  openHomes: OpenHome[];
  tasks: Task[];
  commission: Commission | null;
  agents: { id: string; full_name: string }[];
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: "#d1fae5", text: "#065f46" },
  under_offer: { bg: "#fef3c7", text: "#b45309" },
  sold: { bg: "#fee2e2", text: "#b91c1c" },
  withdrawn: { bg: "#f1f5f9", text: "#64748b" },
  leased: { bg: "#ede9fe", text: "#6d28d9" },
};

const PROPERTY_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  house: { bg: "#dbeafe", text: "#1d4ed8" },
  unit: { bg: "#ede9fe", text: "#6d28d9" },
  townhouse: { bg: "#d1fae5", text: "#065f46" },
  land: { bg: "#fef3c7", text: "#b45309" },
  commercial: { bg: "#fee2e2", text: "#b91c1c" },
  rural: { bg: "#f0f9ff", text: "#0369a1" },
};

function daysOnMarket(listDate: string): number {
  return Math.floor((Date.now() - new Date(listDate).getTime()) / 86400000);
}

function domColor(dom: number): string {
  if (dom < 30) return "#065f46";
  if (dom <= 60) return "#b45309";
  return "#b91c1c";
}

function domBg(dom: number): string {
  if (dom < 30) return "#d1fae5";
  if (dom <= 60) return "#fef3c7";
  return "#fee2e2";
}

const COMMISSION_STATUS_COLORS: Record<Commission["status"], { bg: string; text: string }> = {
  paid: { bg: "#d1fae5", text: "#065f46" },
  invoiced: { bg: "#dbeafe", text: "#1d4ed8" },
  pending: { bg: "#fef3c7", text: "#b45309" },
};

export default function VendorReportClient({ listing, openHomes, tasks, commission: initialCommission, agents }: Props) {
  const router = useRouter();

  const dom = daysOnMarket(listing.list_date);

  // Editable counters
  const [enquiries, setEnquiries] = useState(listing.enquiries_count);
  const [openHomeCount, setOpenHomeCount] = useState(listing.open_home_count);
  const [offersReceived, setOffersReceived] = useState(listing.offers_received);
  const [contractsOut, setContractsOut] = useState(listing.contracts_out);

  // Editable fields
  const [listPrice, setListPrice] = useState<string>(
    listing.list_price != null ? String(listing.list_price) : ""
  );
  const [soldPrice, setSoldPrice] = useState<string>(
    listing.sold_price != null ? String(listing.sold_price) : ""
  );
  const [priceFeedback, setPriceFeedback] = useState(listing.price_feedback ?? "");
  const [vendorNotes, setVendorNotes] = useState(listing.vendor_notes ?? "");

  // Save state
  const [savingCounters, setSavingCounters] = useState(false);
  const [savingFields, setSavingFields] = useState(false);
  const [savedFields, setSavedFields] = useState(false);

  // Counters dirty check
  const countersDirty =
    enquiries !== listing.enquiries_count ||
    openHomeCount !== listing.open_home_count ||
    offersReceived !== listing.offers_received ||
    contractsOut !== listing.contracts_out;

  // Tasks
  const [localTasks, setLocalTasks] = useState(tasks);
  const [taskUpdating, setTaskUpdating] = useState<string | null>(null);

  // Commission
  const [localCommission, setLocalCommission] = useState<Commission | null>(initialCommission);
  const [commissionModalOpen, setCommissionModalOpen] = useState(false);

  async function saveCounters() {
    setSavingCounters(true);
    const supabase = createClient();
    await supabase
      .from("listings")
      .update({
        enquiries_count: enquiries,
        open_home_count: openHomeCount,
        offers_received: offersReceived,
        contracts_out: contractsOut,
      })
      .eq("id", listing.id);
    setSavingCounters(false);
  }

  async function saveFields() {
    setSavingFields(true);
    const supabase = createClient();
    await supabase
      .from("listings")
      .update({
        list_price: listPrice !== "" ? Number(listPrice) : null,
        sold_price: soldPrice !== "" ? Number(soldPrice) : null,
        price_feedback: priceFeedback || null,
        vendor_notes: vendorNotes || null,
      })
      .eq("id", listing.id);
    setSavingFields(false);
    setSavedFields(true);
    setTimeout(() => setSavedFields(false), 2000);
  }

  async function toggleTask(task: Task) {
    setTaskUpdating(task.id);
    const completed = !task.completed;
    setLocalTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? { ...t, completed, completed_at: completed ? new Date().toISOString() : null }
          : t
      )
    );
    const supabase = createClient();
    await supabase
      .from("tasks")
      .update({ completed, completed_at: completed ? new Date().toISOString() : null })
      .eq("id", task.id);
    setTaskUpdating(null);
  }

  const prop = listing.properties;
  const contact = listing.contacts;
  const agent = listing.agents;

  const statusColors = STATUS_COLORS[listing.status] ?? { bg: "#f1f5f9", text: "#64748b" };
  const propTypeKey = prop?.property_type ?? "";
  const propTypeColors = PROPERTY_TYPE_COLORS[propTypeKey] ?? { bg: "#f1f5f9", text: "#64748b" };

  const address = prop?.address ?? "Unknown address";
  const suburbLine = prop ? `${prop.suburb}, ${prop.state} ${prop.postcode}` : "";

  function fmtCurrency(val: string): string {
    const n = Number(val);
    if (!val || isNaN(n)) return "";
    return `$${n.toLocaleString("en-AU")}`;
  }

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      {/* Back */}
      <button
        onClick={() => router.push("/listings")}
        className="flex items-center gap-2 mb-6 transition-colors"
        style={{ fontSize: "14px", color: "var(--color-slate-500)" }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--color-navy-800)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--color-slate-500)")}
      >
        <ArrowLeft size={16} /> Back to Listings
      </button>

      {/* Page header */}
      <div
        className="rounded-xl p-6 mb-6"
        style={{ backgroundColor: "white", border: "1px solid var(--color-slate-200)" }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--color-navy-800)" }}>
                {address}
              </h1>
              {propTypeKey && (
                <span
                  className="rounded-full px-2 py-0.5 font-medium capitalize"
                  style={{ fontSize: "11px", backgroundColor: propTypeColors.bg, color: propTypeColors.text }}
                >
                  {propTypeKey}
                </span>
              )}
              <span
                className="rounded-full px-2 py-0.5 font-medium capitalize"
                style={{
                  fontSize: "11px",
                  backgroundColor: statusColors.bg,
                  color: statusColors.text,
                }}
              >
                {listing.status.replace("_", " ")}
              </span>
            </div>
            {suburbLine && (
              <p style={{ fontSize: "14px", color: "var(--color-slate-500)" }}>{suburbLine}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5 text-right shrink-0">
            {contact && (
              <div className="flex items-center justify-end gap-1.5">
                <User size={13} style={{ color: "var(--color-slate-400)" }} />
                <span style={{ fontSize: "13px", color: "var(--color-slate-700)", fontWeight: 500 }}>
                  {contact.full_name}
                </span>
                {contact.phone && (
                  <a
                    href={`tel:${contact.phone}`}
                    className="flex items-center gap-1"
                    style={{ fontSize: "13px", color: "var(--color-slate-500)" }}
                  >
                    <Phone size={12} style={{ color: "var(--color-slate-400)" }} />
                    {contact.phone}
                  </a>
                )}
                {contact.email && (
                  <a
                    href={`mailto:${contact.email}`}
                    className="flex items-center gap-1"
                    style={{ fontSize: "13px", color: "var(--color-slate-500)" }}
                  >
                    <Mail size={12} style={{ color: "var(--color-slate-400)" }} />
                    {contact.email}
                  </a>
                )}
              </div>
            )}
            {agent && (
              <p style={{ fontSize: "12px", color: "var(--color-slate-400)" }}>
                Listed by{" "}
                <span style={{ fontWeight: 500, color: "var(--color-slate-600)" }}>
                  {agent.full_name}
                </span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Activity Dashboard — metric cards */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={16} style={{ color: "var(--color-slate-400)" }} />
          <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-navy-800)" }}>
            Activity Dashboard
          </span>
        </div>

        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
          {/* Days on Market — read-only */}
          <div
            className="rounded-xl p-5 flex flex-col items-center gap-1"
            style={{ backgroundColor: "white", border: "1px solid var(--color-slate-200)" }}
          >
            <span
              style={{
                fontSize: "40px",
                fontWeight: 700,
                lineHeight: 1,
                color: domColor(dom),
              }}
            >
              {dom}
            </span>
            <span
              style={{ fontSize: "12px", color: "var(--color-slate-500)", textAlign: "center" }}
            >
              Days on Market
            </span>
            <span
              className="rounded-full px-2 py-0.5 mt-1"
              style={{
                fontSize: "10px",
                fontWeight: 500,
                backgroundColor: domBg(dom),
                color: domColor(dom),
              }}
            >
              {dom < 30 ? "On track" : dom <= 60 ? "Watch" : "Review"}
            </span>
          </div>

          {/* Enquiries */}
          <MetricCard
            label="Enquiries"
            value={enquiries}
            onChange={setEnquiries}
          />

          {/* Open Homes */}
          <MetricCard
            label="Open Homes"
            value={openHomeCount}
            onChange={setOpenHomeCount}
          />

          {/* Offers Received */}
          <MetricCard
            label="Offers Received"
            value={offersReceived}
            onChange={setOffersReceived}
          />

          {/* Contracts Out */}
          <MetricCard
            label="Contracts Out"
            value={contractsOut}
            onChange={setContractsOut}
          />
        </div>

        {/* Counter save button */}
        {countersDirty && (
          <div className="flex justify-end mt-3">
            <button
              onClick={saveCounters}
              disabled={savingCounters}
              className="flex items-center gap-2 rounded-lg px-4 py-2 transition-opacity"
              style={{
                fontSize: "13px",
                fontWeight: 500,
                backgroundColor: "var(--color-navy-800)",
                color: "white",
                opacity: savingCounters ? 0.7 : 1,
              }}
            >
              {savingCounters ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              Save Activity
            </button>
          </div>
        )}
      </div>

      {/* Editable fields + open homes + tasks — two column layout */}
      <div className="grid gap-6" style={{ gridTemplateColumns: "1fr 380px" }}>
        {/* Left: editable fields */}
        <div className="flex flex-col gap-6">
          {/* Pricing & feedback */}
          <div
            className="rounded-xl p-6"
            style={{ backgroundColor: "white", border: "1px solid var(--color-slate-200)" }}
          >
            <h2
              className="mb-4"
              style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-navy-800)" }}
            >
              Pricing & Feedback
            </h2>

            <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
              {/* List Price */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "var(--color-slate-500)",
                    marginBottom: "6px",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  List Price
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type="number"
                    value={listPrice}
                    onChange={(e) => setListPrice(e.target.value)}
                    placeholder="850000"
                    className="w-full rounded-lg px-3 py-2"
                    style={{
                      fontSize: "14px",
                      border: "1px solid var(--color-slate-200)",
                      color: "var(--color-slate-800)",
                      outline: "none",
                    }}
                    onFocus={(e) =>
                      ((e.currentTarget as HTMLElement).style.borderColor =
                        "var(--color-navy-800)")
                    }
                    onBlur={(e) =>
                      ((e.currentTarget as HTMLElement).style.borderColor =
                        "var(--color-slate-200)")
                    }
                  />
                  {listPrice && (
                    <span
                      style={{
                        position: "absolute",
                        right: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        fontSize: "12px",
                        color: "var(--color-slate-400)",
                        pointerEvents: "none",
                      }}
                    >
                      {fmtCurrency(listPrice)}
                    </span>
                  )}
                </div>
              </div>

              {/* Sold Price — only shown when status is sold */}
              {listing.status === "sold" && (
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "var(--color-slate-500)",
                      marginBottom: "6px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Sold Price
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="number"
                      value={soldPrice}
                      onChange={(e) => setSoldPrice(e.target.value)}
                      placeholder="845000"
                      className="w-full rounded-lg px-3 py-2"
                      style={{
                        fontSize: "14px",
                        border: "1px solid var(--color-slate-200)",
                        color: "var(--color-slate-800)",
                        outline: "none",
                      }}
                      onFocus={(e) =>
                        ((e.currentTarget as HTMLElement).style.borderColor =
                          "var(--color-navy-800)")
                      }
                      onBlur={(e) =>
                        ((e.currentTarget as HTMLElement).style.borderColor =
                          "var(--color-slate-200)")
                      }
                    />
                    {soldPrice && (
                      <span
                        style={{
                          position: "absolute",
                          right: "10px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          fontSize: "12px",
                          color: "var(--color-slate-400)",
                          pointerEvents: "none",
                        }}
                      >
                        {fmtCurrency(soldPrice)}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Price Feedback */}
            <div className="mt-4">
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--color-slate-500)",
                  marginBottom: "6px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Price Feedback
              </label>
              <textarea
                value={priceFeedback}
                onChange={(e) => setPriceFeedback(e.target.value)}
                rows={3}
                placeholder="Buyers commenting $820K range…"
                className="w-full rounded-lg px-3 py-2 resize-none"
                style={{
                  fontSize: "14px",
                  border: "1px solid var(--color-slate-200)",
                  color: "var(--color-slate-800)",
                  outline: "none",
                  lineHeight: 1.5,
                }}
                onFocus={(e) =>
                  ((e.currentTarget as HTMLElement).style.borderColor = "var(--color-navy-800)")
                }
                onBlur={(e) =>
                  ((e.currentTarget as HTMLElement).style.borderColor = "var(--color-slate-200)")
                }
              />
            </div>

            {/* Vendor Notes */}
            <div className="mt-4">
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--color-slate-500)",
                  marginBottom: "6px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Vendor Notes
              </label>
              <textarea
                value={vendorNotes}
                onChange={(e) => setVendorNotes(e.target.value)}
                rows={3}
                placeholder="Vendor motivated, flexible on settlement…"
                className="w-full rounded-lg px-3 py-2 resize-none"
                style={{
                  fontSize: "14px",
                  border: "1px solid var(--color-slate-200)",
                  color: "var(--color-slate-800)",
                  outline: "none",
                  lineHeight: 1.5,
                }}
                onFocus={(e) =>
                  ((e.currentTarget as HTMLElement).style.borderColor = "var(--color-navy-800)")
                }
                onBlur={(e) =>
                  ((e.currentTarget as HTMLElement).style.borderColor = "var(--color-slate-200)")
                }
              />
            </div>

            {/* Save Changes */}
            <div className="flex items-center justify-end gap-3 mt-5">
              {savedFields && (
                <span style={{ fontSize: "13px", color: "#065f46" }}>Saved</span>
              )}
              <button
                onClick={saveFields}
                disabled={savingFields}
                className="flex items-center gap-2 rounded-lg px-4 py-2 transition-opacity"
                style={{
                  fontSize: "13px",
                  fontWeight: 500,
                  backgroundColor: "var(--color-navy-800)",
                  color: "white",
                  opacity: savingFields ? 0.7 : 1,
                }}
              >
                {savingFields ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                Save Changes
              </button>
            </div>
          </div>

          {/* Open Homes */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ backgroundColor: "white", border: "1px solid var(--color-slate-200)" }}
          >
            <div
              className="flex items-center gap-2 px-5 py-4"
              style={{ borderBottom: "1px solid var(--color-slate-200)" }}
            >
              <Home size={16} style={{ color: "var(--color-slate-400)" }} />
              <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-navy-800)" }}>
                Open Homes
              </span>
              <span
                className="ml-auto rounded-full px-2 py-0.5"
                style={{
                  fontSize: "11px",
                  backgroundColor: "var(--color-slate-100)",
                  color: "var(--color-slate-500)",
                }}
              >
                {openHomes.length}
              </span>
            </div>

            {openHomes.length === 0 ? (
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--color-slate-400)",
                  textAlign: "center",
                  padding: "32px 0",
                }}
              >
                No open homes scheduled yet
              </p>
            ) : (
              <div>
                {openHomes.map((oh, idx) => {
                  const date = new Date(oh.scheduled_at);
                  const dateStr = date.toLocaleDateString("en-AU", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  });
                  const timeStr = date.toLocaleTimeString("en-AU", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  });
                  const attendeeCount = Array.isArray(oh.attendees)
                    ? oh.attendees.length
                    : 0;

                  return (
                    <div
                      key={oh.id}
                      className="flex items-center gap-4 px-5 py-4"
                      style={{
                        borderBottom:
                          idx < openHomes.length - 1
                            ? "1px solid var(--color-slate-100)"
                            : "none",
                      }}
                    >
                      <div
                        className="flex items-center justify-center rounded-lg shrink-0"
                        style={{
                          width: 40,
                          height: 40,
                          backgroundColor: "var(--color-navy-100)",
                        }}
                      >
                        <Calendar size={16} style={{ color: "var(--color-navy-800)" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          style={{
                            fontSize: "14px",
                            fontWeight: 500,
                            color: "var(--color-slate-800)",
                          }}
                        >
                          {dateStr}
                        </p>
                        <p style={{ fontSize: "12px", color: "var(--color-slate-400)", marginTop: "1px" }}>
                          {timeStr}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span
                          style={{
                            fontSize: "20px",
                            fontWeight: 700,
                            color: "var(--color-navy-800)",
                            lineHeight: 1,
                            display: "block",
                          }}
                        >
                          {attendeeCount}
                        </span>
                        <span
                          style={{ fontSize: "11px", color: "var(--color-slate-400)" }}
                        >
                          {attendeeCount === 1 ? "attendee" : "attendees"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: tasks */}
        <div>
          <div
            className="rounded-xl p-5"
            style={{ backgroundColor: "white", border: "1px solid var(--color-slate-200)" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <CheckSquare size={16} style={{ color: "var(--color-slate-400)" }} />
              <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-navy-800)" }}>
                Tasks
              </span>
              <span
                className="ml-auto rounded-full px-2 py-0.5"
                style={{
                  fontSize: "11px",
                  backgroundColor: "var(--color-slate-100)",
                  color: "var(--color-slate-500)",
                }}
              >
                {localTasks.filter((t) => !t.completed).length} open
              </span>
            </div>

            {localTasks.length === 0 ? (
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--color-slate-400)",
                  textAlign: "center",
                  padding: "12px 0",
                }}
              >
                No tasks for this property
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {localTasks.map((task) => (
                  <div key={task.id} className="flex items-start gap-3">
                    <button
                      onClick={() => toggleTask(task)}
                      disabled={taskUpdating === task.id}
                      className="mt-0.5 shrink-0 flex items-center justify-center rounded transition-colors"
                      style={{
                        width: 18,
                        height: 18,
                        border: `2px solid ${task.completed ? "var(--color-navy-800)" : "var(--color-slate-300)"}`,
                        backgroundColor: task.completed ? "var(--color-navy-800)" : "transparent",
                        color: "white",
                      }}
                    >
                      {taskUpdating === task.id ? (
                        <Loader2 size={10} className="animate-spin" />
                      ) : task.completed ? (
                        "✓"
                      ) : null}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p
                        style={{
                          fontSize: "13px",
                          color: task.completed
                            ? "var(--color-slate-400)"
                            : "var(--color-slate-700)",
                          textDecoration: task.completed ? "line-through" : "none",
                        }}
                      >
                        {task.title}
                      </p>
                      {task.due_date && (
                        <p
                          style={{
                            fontSize: "11px",
                            color: "var(--color-slate-400)",
                            marginTop: "1px",
                          }}
                        >
                          <Calendar
                            size={10}
                            style={{ display: "inline", marginRight: "3px" }}
                          />
                          {new Date(task.due_date).toLocaleDateString("en-AU", {
                            day: "numeric",
                            month: "short",
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Commission */}
      <div
        className="rounded-xl mt-6"
        style={{ backgroundColor: "white", border: "1px solid var(--color-slate-200)" }}
      >
        <div
          className="flex items-center gap-2 px-5 py-4"
          style={{ borderBottom: "1px solid var(--color-slate-200)" }}
        >
          <DollarSign size={16} style={{ color: "var(--color-slate-400)" }} />
          <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-navy-800)" }}>
            Commission
          </span>
          <div className="ml-auto">
            <button
              onClick={() => setCommissionModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors"
              style={{
                fontSize: "13px",
                fontWeight: 500,
                backgroundColor: "var(--color-navy-800)",
                color: "white",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.opacity = "0.85")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.opacity = "1")
              }
            >
              {localCommission ? "Edit Commission" : "Log Commission"}
            </button>
          </div>
        </div>

        {localCommission ? (
          <div className="px-5 py-4 flex flex-wrap gap-6">
            <div className="flex flex-col gap-1">
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--color-slate-400)",
                }}
              >
                Expected
              </span>
              <span style={{ fontSize: "20px", fontWeight: 700, color: "var(--color-navy-800)", lineHeight: 1 }}>
                {localCommission.expected_amount != null
                  ? `$${localCommission.expected_amount.toLocaleString("en-AU")}`
                  : "—"}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--color-slate-400)",
                }}
              >
                Actual
              </span>
              <span style={{ fontSize: "20px", fontWeight: 700, color: "var(--color-navy-800)", lineHeight: 1 }}>
                {localCommission.actual_amount != null
                  ? `$${localCommission.actual_amount.toLocaleString("en-AU")}`
                  : "—"}
              </span>
            </div>

            <div className="flex flex-col gap-1 justify-center">
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--color-slate-400)",
                  marginBottom: "4px",
                }}
              >
                Status
              </span>
              <span
                className="rounded-full px-3 py-1 font-medium capitalize"
                style={{
                  fontSize: "12px",
                  backgroundColor: COMMISSION_STATUS_COLORS[localCommission.status].bg,
                  color: COMMISSION_STATUS_COLORS[localCommission.status].text,
                }}
              >
                {localCommission.status}
              </span>
            </div>

            {localCommission.notes && (
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "var(--color-slate-400)",
                  }}
                >
                  Notes
                </span>
                <p style={{ fontSize: "13px", color: "var(--color-slate-600)", lineHeight: 1.5 }}>
                  {localCommission.notes}
                </p>
              </div>
            )}
          </div>
        ) : (
          <p
            style={{
              fontSize: "13px",
              color: "var(--color-slate-400)",
              textAlign: "center",
              padding: "32px 0",
            }}
          >
            No commission logged yet
          </p>
        )}
      </div>

      {commissionModalOpen && (
        <CommissionModal
          listingId={listing.id}
          agencyId={listing.agency_id}
          agents={agents}
          commission={localCommission}
          onSaved={(c) => {
            setLocalCommission(c);
            setCommissionModalOpen(false);
          }}
          onDeleted={() => {
            setLocalCommission(null);
            setCommissionModalOpen(false);
          }}
          onClose={() => setCommissionModalOpen(false)}
        />
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div
      className="rounded-xl p-5 flex flex-col items-center gap-1"
      style={{ backgroundColor: "white", border: "1px solid var(--color-slate-200)" }}
    >
      <span
        style={{
          fontSize: "40px",
          fontWeight: 700,
          lineHeight: 1,
          color: "var(--color-navy-800)",
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontSize: "12px",
          color: "var(--color-slate-500)",
          textAlign: "center",
          marginBottom: "8px",
        }}
      >
        {label}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          className="flex items-center justify-center rounded-md transition-colors"
          style={{
            width: 28,
            height: 28,
            border: "1px solid var(--color-slate-200)",
            fontSize: "16px",
            fontWeight: 600,
            color: "var(--color-slate-500)",
            backgroundColor: "var(--color-slate-50)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--color-navy-800)";
            (e.currentTarget as HTMLElement).style.color = "var(--color-navy-800)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--color-slate-200)";
            (e.currentTarget as HTMLElement).style.color = "var(--color-slate-500)";
          }}
        >
          −
        </button>
        <button
          onClick={() => onChange(value + 1)}
          className="flex items-center justify-center rounded-md transition-colors"
          style={{
            width: 28,
            height: 28,
            border: "1px solid var(--color-slate-200)",
            fontSize: "16px",
            fontWeight: 600,
            color: "var(--color-slate-500)",
            backgroundColor: "var(--color-slate-50)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--color-navy-800)";
            (e.currentTarget as HTMLElement).style.color = "var(--color-navy-800)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--color-slate-200)";
            (e.currentTarget as HTMLElement).style.color = "var(--color-slate-500)";
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}
