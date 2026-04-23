"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  userId: string;
  userEmail: string;
  existingAgencyId?: string | null;
  existingFullName?: string | null;
};

type Plan = "starter" | "professional" | "enterprise";

type SentInvite = {
  email: string;
  role: "admin" | "agent";
};

const NAVY = "#0F2942";
const GOLD = "#F5A623";
const GREEN = "#059669";

const STEPS = ["Agency Setup", "Your Profile", "Invite Agent", "Go Live"] as const;

const PLANS: { id: Plan; name: string; features: string[] }[] = [
  {
    id: "starter",
    name: "Starter",
    features: ["1–3 agents", "Core CRM features", "Email & SMS templates"],
  },
  {
    id: "professional",
    name: "Professional",
    features: [
      "Up to 10 agents",
      "All Starter features",
      "Proposals & KYC",
      "Reports",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    features: [
      "Unlimited agents",
      "All Pro features",
      "White-label",
      "Priority support",
    ],
  },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 0,
        marginBottom: "32px",
      }}
    >
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div
            key={label}
            style={{ display: "flex", alignItems: "center" }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "13px",
                  fontWeight: 600,
                  backgroundColor: done ? GREEN : active ? NAVY : "#e2e8f0",
                  color: done || active ? "white" : "#94a3b8",
                  border: active ? `2px solid ${NAVY}` : "none",
                  flexShrink: 0,
                  transition: "all 0.2s",
                }}
              >
                {done ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2.5 7L5.5 10L11.5 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: active ? 600 : 400,
                  color: active ? NAVY : done ? GREEN : "#94a3b8",
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                style={{
                  width: "60px",
                  height: "2px",
                  backgroundColor: i < current ? GREEN : "#e2e8f0",
                  marginBottom: "18px",
                  marginLeft: "4px",
                  marginRight: "4px",
                  flexShrink: 0,
                  transition: "background-color 0.2s",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Logo() {
  return (
    <div
      style={{
        textAlign: "center",
        marginBottom: "28px",
        fontSize: "28px",
        fontWeight: 800,
        letterSpacing: "-0.5px",
        color: NAVY,
      }}
    >
      Estate<span style={{ color: GOLD }}>IQ</span>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <label
        style={{
          display: "block",
          fontSize: "13px",
          fontWeight: 600,
          color: "#374151",
          marginBottom: "6px",
        }}
      >
        {label}
        {required && <span style={{ color: "#ef4444", marginLeft: "3px" }}>*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "10px 14px",
          border: "1px solid #d1d5db",
          borderRadius: "8px",
          fontSize: "14px",
          color: "#111827",
          outline: "none",
          boxSizing: "border-box",
          backgroundColor: "white",
        }}
        onFocus={(e) => {
          e.target.style.borderColor = NAVY;
          e.target.style.boxShadow = `0 0 0 3px ${NAVY}20`;
        }}
        onBlur={(e) => {
          e.target.style.borderColor = "#d1d5db";
          e.target.style.boxShadow = "none";
        }}
      />
    </div>
  );
}

function PrimaryButton({
  onClick,
  disabled,
  loading,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        backgroundColor: disabled || loading ? "#94a3b8" : NAVY,
        color: "white",
        border: "none",
        borderRadius: "8px",
        padding: "11px 28px",
        fontSize: "14px",
        fontWeight: 600,
        cursor: disabled || loading ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        transition: "background-color 0.15s",
      }}
    >
      {loading && (
        <span
          style={{
            width: "14px",
            height: "14px",
            border: "2px solid white",
            borderTopColor: "transparent",
            borderRadius: "50%",
            display: "inline-block",
            animation: "spin 0.7s linear infinite",
          }}
        />
      )}
      {children}
    </button>
  );
}

function SecondaryButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        backgroundColor: "transparent",
        color: "#6b7280",
        border: "1px solid #d1d5db",
        borderRadius: "8px",
        padding: "11px 20px",
        fontSize: "14px",
        fontWeight: 500,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      style={{
        backgroundColor: "#fef2f2",
        border: "1px solid #fca5a5",
        borderRadius: "8px",
        padding: "10px 14px",
        fontSize: "13px",
        color: "#b91c1c",
        marginBottom: "16px",
      }}
    >
      {message}
    </div>
  );
}

export default function OnboardingFlow({
  userId,
  userEmail,
  existingAgencyId,
  existingFullName,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [agencyName, setAgencyName] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<Plan>("professional");
  const [agencyId, setAgencyId] = useState<string | null>(existingAgencyId ?? null);

  const [fullName, setFullName] = useState(existingFullName ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "agent">("agent");
  const [sentInvites, setSentInvites] = useState<SentInvite[]>([]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleStep1Next() {
    if (!agencyName.trim()) {
      setError("Agency name is required.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      if (existingAgencyId) {
        setAgencyId(existingAgencyId);
        setStep(1);
        return;
      }

      const { data: agency, error: agencyErr } = await supabase
        .from("agencies")
        .insert({
          name: agencyName.trim(),
          logo_url: null,
          subscription_plan: selectedPlan,
          subscription_status: "active",
          onboarding_completed: false,
        })
        .select("id")
        .single();

      if (agencyErr || !agency) {
        setError("Failed to create agency. Please try again.");
        return;
      }

      const { error: userErr } = await supabase.from("users").insert({
        id: userId,
        email: userEmail,
        full_name: "",
        role: "admin",
        agency_id: agency.id,
        avatar_url: null,
      });

      if (userErr) {
        setError("Failed to create user profile. Please try again.");
        return;
      }

      setAgencyId(agency.id);
      setStep(1);
    } finally {
      setLoading(false);
    }
  }

  async function handleStep2Next() {
    if (!fullName.trim()) {
      setError("Full name is required.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      let avatarUrl: string | null = null;

      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop() ?? "jpg";
        const path = `${userId}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("avatars")
          .upload(path, avatarFile, { upsert: true });

        if (!uploadErr) {
          const { data: urlData } = supabase.storage
            .from("avatars")
            .getPublicUrl(path);
          avatarUrl = urlData.publicUrl;
        }
      }

      const updatePayload: { full_name: string; avatar_url?: string } = {
        full_name: fullName.trim(),
      };
      if (avatarUrl) updatePayload.avatar_url = avatarUrl;

      const { error: updateErr } = await supabase
        .from("users")
        .update(updatePayload)
        .eq("id", userId);

      if (updateErr) {
        setError("Failed to update profile. Please try again.");
        return;
      }

      setStep(2);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendInvite() {
    if (!inviteEmail.trim()) {
      setInviteError("Please enter an email address.");
      return;
    }
    if (!agencyId) {
      setInviteError("Agency not set up. Please go back.");
      return;
    }
    setInviteError(null);
    setInviteLoading(true);

    try {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const { error: invErr } = await supabase.from("invitations").insert({
        agency_id: agencyId,
        email: inviteEmail.trim(),
        role: inviteRole,
        invited_by: userId,
        accepted_at: null,
        expires_at: expiresAt,
      });

      if (invErr) {
        setInviteError("Failed to send invite. Please try again.");
        return;
      }

      setSentInvites((prev) => [
        ...prev,
        { email: inviteEmail.trim(), role: inviteRole },
      ]);
      setInviteEmail("");
      setInviteRole("agent");
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleGoLive() {
    if (!agencyId) return;
    setLoading(true);

    try {
      await supabase
        .from("agencies")
        .update({ onboarding_completed: true })
        .eq("id", agencyId);

      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        * { box-sizing: border-box; }
      `}</style>
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#f8fafc",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "40px 16px 60px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "640px",
          }}
        >
          <Logo />

          <div
            style={{
              backgroundColor: "white",
              borderRadius: "16px",
              boxShadow: "0 4px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "32px 40px 0" }}>
              <StepIndicator current={step} />
            </div>

            <div style={{ padding: "8px 40px 32px" }}>
              {step === 0 && (
                <Step1
                  agencyName={agencyName}
                  setAgencyName={setAgencyName}
                  selectedPlan={selectedPlan}
                  setSelectedPlan={setSelectedPlan}
                  error={error}
                  loading={loading}
                  onNext={handleStep1Next}
                />
              )}

              {step === 1 && (
                <Step2
                  fullName={fullName}
                  setFullName={setFullName}
                  avatarPreview={avatarPreview}
                  avatarInputRef={avatarInputRef}
                  onAvatarChange={handleAvatarChange}
                  error={error}
                  loading={loading}
                  onBack={() => { setError(null); setStep(0); }}
                  onNext={handleStep2Next}
                />
              )}

              {step === 2 && (
                <Step3
                  inviteEmail={inviteEmail}
                  setInviteEmail={setInviteEmail}
                  inviteRole={inviteRole}
                  setInviteRole={setInviteRole}
                  sentInvites={sentInvites}
                  inviteLoading={inviteLoading}
                  inviteError={inviteError}
                  onSendInvite={handleSendInvite}
                  onBack={() => { setError(null); setStep(1); }}
                  onNext={() => setStep(3)}
                />
              )}

              {step === 3 && (
                <Step4
                  agencyName={agencyName}
                  selectedPlan={selectedPlan}
                  sentInvites={sentInvites}
                  loading={loading}
                  onGoLive={handleGoLive}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Step1({
  agencyName,
  setAgencyName,
  selectedPlan,
  setSelectedPlan,
  error,
  loading,
  onNext,
}: {
  agencyName: string;
  setAgencyName: (v: string) => void;
  selectedPlan: Plan;
  setSelectedPlan: (v: Plan) => void;
  error: string | null;
  loading: boolean;
  onNext: () => void;
}) {
  return (
    <div>
      <h2
        style={{
          fontSize: "20px",
          fontWeight: 700,
          color: NAVY,
          marginBottom: "4px",
          marginTop: 0,
        }}
      >
        Set up your agency
      </h2>
      <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "24px" }}>
        Tell us about your agency to get started.
      </p>

      {error && <ErrorBanner message={error} />}

      <InputField
        label="Agency Name"
        value={agencyName}
        onChange={setAgencyName}
        placeholder="e.g. Prestige Properties"
        required
      />

      <div style={{ marginBottom: "24px" }}>
        <label
          style={{
            display: "block",
            fontSize: "13px",
            fontWeight: 600,
            color: "#374151",
            marginBottom: "10px",
          }}
        >
          Subscription Plan
        </label>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "12px",
          }}
        >
          {PLANS.map((plan) => {
            const active = selectedPlan === plan.id;
            return (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                style={{
                  border: active ? `2px solid ${NAVY}` : "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "16px 14px",
                  backgroundColor: active ? `${NAVY}08` : "white",
                  cursor: "pointer",
                  textAlign: "left",
                  position: "relative",
                  transition: "border-color 0.15s, background-color 0.15s",
                }}
              >
                {active && (
                  <div
                    style={{
                      position: "absolute",
                      top: "10px",
                      right: "10px",
                      width: "18px",
                      height: "18px",
                      borderRadius: "50%",
                      backgroundColor: GOLD,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: NAVY,
                    marginBottom: "4px",
                  }}
                >
                  {plan.name}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: GOLD,
                    marginBottom: "10px",
                  }}
                >
                  $[TODO: PRICE]/month
                </div>
                <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      style={{
                        fontSize: "11px",
                        color: "#6b7280",
                        marginBottom: "3px",
                        paddingLeft: "12px",
                        position: "relative",
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          left: 0,
                          color: GREEN,
                          fontWeight: 700,
                        }}
                      >
                        ✓
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        <p
          style={{
            fontSize: "12px",
            color: "#6b7280",
            marginTop: "10px",
            padding: "8px 12px",
            backgroundColor: "#fffbeb",
            borderRadius: "6px",
            border: "1px solid #fde68a",
          }}
        >
          Pricing to be confirmed — your account will start on a free trial.
        </p>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <PrimaryButton onClick={onNext} loading={loading}>
          Next →
        </PrimaryButton>
      </div>
    </div>
  );
}

function Step2({
  fullName,
  setFullName,
  avatarPreview,
  avatarInputRef,
  onAvatarChange,
  error,
  loading,
  onBack,
  onNext,
}: {
  fullName: string;
  setFullName: (v: string) => void;
  avatarPreview: string | null;
  avatarInputRef: React.RefObject<HTMLInputElement | null>;
  onAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error: string | null;
  loading: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div>
      <h2
        style={{
          fontSize: "20px",
          fontWeight: 700,
          color: NAVY,
          marginBottom: "4px",
          marginTop: 0,
        }}
      >
        Your profile
      </h2>
      <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "24px" }}>
        Add your name and a photo so your team can recognise you.
      </p>

      {error && <ErrorBanner message={error} />}

      <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px" }}>
        <button
          onClick={() => avatarInputRef.current?.click()}
          title="Upload avatar"
          style={{
            width: "96px",
            height: "96px",
            borderRadius: "50%",
            border: `2px dashed ${NAVY}`,
            backgroundColor: "#f8fafc",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            padding: 0,
          }}
        >
          {avatarPreview ? (
            <img
              src={avatarPreview}
              alt="Avatar preview"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "24px", marginBottom: "2px" }}>📷</div>
              <div style={{ fontSize: "11px", color: "#94a3b8" }}>Upload photo</div>
            </div>
          )}
        </button>
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          onChange={onAvatarChange}
          style={{ display: "none" }}
        />
      </div>

      <InputField
        label="Full Name"
        value={fullName}
        onChange={setFullName}
        placeholder="e.g. Sarah Johnson"
        required
      />

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
        <SecondaryButton onClick={onBack}>← Back</SecondaryButton>
        <PrimaryButton onClick={onNext} loading={loading}>
          Next →
        </PrimaryButton>
      </div>
    </div>
  );
}

function Step3({
  inviteEmail,
  setInviteEmail,
  inviteRole,
  setInviteRole,
  sentInvites,
  inviteLoading,
  inviteError,
  onSendInvite,
  onBack,
  onNext,
}: {
  inviteEmail: string;
  setInviteEmail: (v: string) => void;
  inviteRole: "admin" | "agent";
  setInviteRole: (v: "admin" | "agent") => void;
  sentInvites: SentInvite[];
  inviteLoading: boolean;
  inviteError: string | null;
  onSendInvite: () => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div>
      <h2
        style={{
          fontSize: "20px",
          fontWeight: 700,
          color: NAVY,
          marginBottom: "4px",
          marginTop: 0,
        }}
      >
        Invite your team
      </h2>
      <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "24px" }}>
        Add your first agent — you can skip this and do it later.
      </p>

      <div
        style={{
          backgroundColor: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: "10px",
          padding: "20px",
          marginBottom: "16px",
        }}
      >
        <div style={{ marginBottom: "12px" }}>
          <label
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: 600,
              color: "#374151",
              marginBottom: "6px",
            }}
          >
            Email address
          </label>
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="agent@example.com"
            style={{
              width: "100%",
              padding: "10px 14px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              fontSize: "14px",
              color: "#111827",
              outline: "none",
              backgroundColor: "white",
              boxSizing: "border-box",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = NAVY;
              e.target.style.boxShadow = `0 0 0 3px ${NAVY}20`;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#d1d5db";
              e.target.style.boxShadow = "none";
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSendInvite();
            }}
          />
        </div>

        <div style={{ marginBottom: "14px" }}>
          <label
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: 600,
              color: "#374151",
              marginBottom: "6px",
            }}
          >
            Role
          </label>
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as "admin" | "agent")}
            style={{
              width: "100%",
              padding: "10px 14px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              fontSize: "14px",
              color: "#111827",
              outline: "none",
              backgroundColor: "white",
              cursor: "pointer",
              boxSizing: "border-box",
            }}
          >
            <option value="agent">Agent</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {inviteError && <ErrorBanner message={inviteError} />}

        <PrimaryButton onClick={onSendInvite} loading={inviteLoading}>
          Send Invite
        </PrimaryButton>
      </div>

      {sentInvites.length > 0 && (
        <div style={{ marginBottom: "16px" }}>
          {sentInvites.map((inv, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 12px",
                backgroundColor: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "8px",
                marginBottom: "6px",
                fontSize: "13px",
                color: "#065f46",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="7" fill={GREEN} />
                <path d="M4 7L6 9L10 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Invite sent to <strong>{inv.email}</strong>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: "11px",
                  padding: "2px 6px",
                  backgroundColor: "#dcfce7",
                  borderRadius: "4px",
                  color: "#166534",
                  textTransform: "capitalize",
                }}
              >
                {inv.role}
              </span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
        <SecondaryButton onClick={onBack}>← Back</SecondaryButton>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={onNext}
            style={{
              background: "none",
              border: "none",
              fontSize: "14px",
              color: "#6b7280",
              cursor: "pointer",
              textDecoration: "underline",
              padding: "4px",
            }}
          >
            Skip for now
          </button>
          {sentInvites.length > 0 && (
            <PrimaryButton onClick={onNext}>
              Next →
            </PrimaryButton>
          )}
        </div>
      </div>
    </div>
  );
}

function Step4({
  agencyName,
  selectedPlan,
  sentInvites,
  loading,
  onGoLive,
}: {
  agencyName: string;
  selectedPlan: Plan;
  sentInvites: SentInvite[];
  loading: boolean;
  onGoLive: () => void;
}) {
  const planLabels: Record<Plan, string> = {
    starter: "Starter",
    professional: "Professional",
    enterprise: "Enterprise",
  };

  return (
    <div
      style={{
        borderRadius: "12px",
        backgroundColor: NAVY,
        padding: "40px 32px",
        textAlign: "center",
        color: "white",
      }}
    >
      <div
        style={{
          width: "64px",
          height: "64px",
          borderRadius: "50%",
          backgroundColor: GREEN,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
        }}
      >
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <path d="M6 16L12 22L26 8" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <h2
        style={{
          fontSize: "26px",
          fontWeight: 800,
          color: "white",
          margin: "0 0 8px",
        }}
      >
        {"You're all set!"}
      </h2>
      <p style={{ fontSize: "15px", color: "#94a3b8", marginBottom: "28px" }}>
        Your EstateIQ workspace is ready.
      </p>

      <div
        style={{
          backgroundColor: "rgba(255,255,255,0.07)",
          borderRadius: "10px",
          padding: "20px",
          marginBottom: "28px",
          textAlign: "left",
        }}
      >
        <div
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: GOLD,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: "12px",
          }}
        >
          Your setup summary
        </div>

        <SummaryRow label="Agency" value={agencyName || "—"} />
        <SummaryRow label="Plan" value={`${planLabels[selectedPlan]} (free trial)`} />
        <SummaryRow
          label="Agents invited"
          value={sentInvites.length === 0 ? "None yet" : `${sentInvites.length} invite${sentInvites.length !== 1 ? "s" : ""} sent`}
        />
        {sentInvites.map((inv, i) => (
          <div
            key={i}
            style={{
              paddingLeft: "16px",
              fontSize: "12px",
              color: "#94a3b8",
              marginBottom: "2px",
            }}
          >
            → {inv.email} ({inv.role})
          </div>
        ))}
      </div>

      <button
        onClick={onGoLive}
        disabled={loading}
        style={{
          backgroundColor: loading ? "#94a3b8" : GOLD,
          color: loading ? "white" : "#0F2942",
          border: "none",
          borderRadius: "10px",
          padding: "14px 36px",
          fontSize: "16px",
          fontWeight: 700,
          cursor: loading ? "not-allowed" : "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          transition: "background-color 0.15s",
        }}
      >
        {loading && (
          <span
            style={{
              width: "16px",
              height: "16px",
              border: "2px solid rgba(0,0,0,0.3)",
              borderTopColor: "transparent",
              borderRadius: "50%",
              display: "inline-block",
              animation: "spin 0.7s linear infinite",
            }}
          />
        )}
        Go to Dashboard →
      </button>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: "13px",
        marginBottom: "8px",
        paddingBottom: "8px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <span style={{ color: "#94a3b8" }}>{label}</span>
      <span style={{ color: "white", fontWeight: 500 }}>{value}</span>
    </div>
  );
}
