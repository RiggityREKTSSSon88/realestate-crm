"use client";

import { useState } from "react";
import { User, Building2, Loader2, CheckCircle2, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Contact, Property } from "@/types/database";

type ContactForm = {
  full_name: string;
  email: string;
  phone: string;
  type: Contact["type"];
  status: Contact["status"];
  seller_likelihood: Contact["seller_likelihood"];
  notes: string;
};

type PropertyForm = {
  address: string;
  suburb: string;
  state: string;
  postcode: string;
  property_type: Property["property_type"];
  bedrooms: string;
  bathrooms: string;
};

type SuccessResult = {
  contactId: string;
  contactName: string;
  propertyId: string;
  propertyAddress: string;
};

const CONTACT_DEFAULTS: ContactForm = {
  full_name: "",
  email: "",
  phone: "",
  type: "vendor",
  status: "warm",
  seller_likelihood: null,
  notes: "",
};

const PROPERTY_DEFAULTS: PropertyForm = {
  address: "",
  suburb: "",
  state: "",
  postcode: "",
  property_type: "house",
  bedrooms: "",
  bathrooms: "",
};

const labelStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 600,
  color: "var(--color-slate-500)",
  marginBottom: "6px",
  display: "block",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  fontSize: "14px",
  border: "1px solid var(--color-slate-200)",
  borderRadius: "8px",
  outline: "none",
  backgroundColor: "var(--color-slate-50)",
  color: "var(--color-slate-800)",
  boxSizing: "border-box",
};

function useInputFocus() {
  return {
    onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      (e.currentTarget as HTMLElement).style.borderColor = "var(--color-navy-800)";
    },
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      (e.currentTarget as HTMLElement).style.borderColor = "var(--color-slate-200)";
    },
  };
}

export default function NewClientForm() {
  const [contact, setContact] = useState<ContactForm>(CONTACT_DEFAULTS);
  const [property, setProperty] = useState<PropertyForm>(PROPERTY_DEFAULTS);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessResult | null>(null);

  const focusHandlers = useInputFocus();

  function setC<K extends keyof ContactForm>(key: K, value: ContactForm[K]) {
    setContact((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }

  function setP<K extends keyof PropertyForm>(key: K, value: PropertyForm[K]) {
    setProperty((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!contact.full_name.trim()) {
      setError("Contact full name is required.");
      return;
    }
    if (!property.address.trim()) {
      setError("Property address is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const supabase = createClient();

    const { data: authUser } = await supabase.auth.getUser();
    if (!authUser.user) {
      setError("Not authenticated.");
      setSubmitting(false);
      return;
    }

    const { data: userProfile } = await supabase
      .from("users")
      .select("agency_id")
      .eq("id", authUser.user.id)
      .single();

    if (!userProfile?.agency_id) {
      setError("Could not determine agency. Please try again.");
      setSubmitting(false);
      return;
    }

    const agencyId = userProfile.agency_id;

    const { data: newContact, error: contactErr } = await supabase
      .from("contacts")
      .insert({
        agency_id: agencyId,
        created_by: authUser.user.id,
        full_name: contact.full_name.trim(),
        email: contact.email.trim() || null,
        phone: contact.phone.trim() || null,
        type: contact.type,
        status: contact.status,
        seller_likelihood: contact.seller_likelihood,
        notes: contact.notes.trim() || null,
        last_contacted_at: null,
      })
      .select()
      .single();

    if (contactErr || !newContact) {
      if (contactErr?.code === "23505") {
        setError(
          contactErr.message.includes("email")
            ? "A contact with this email already exists in your agency."
            : "A contact with this phone number already exists in your agency."
        );
      } else {
        setError("Failed to create contact. Please try again.");
      }
      setSubmitting(false);
      return;
    }

    const { data: newProperty, error: propertyErr } = await supabase
      .from("properties")
      .insert({
        agency_id: agencyId,
        address: property.address.trim(),
        suburb: property.suburb.trim(),
        state: property.state.trim(),
        postcode: property.postcode.trim(),
        property_type: property.property_type,
        bedrooms: property.bedrooms !== "" ? Number(property.bedrooms) : null,
        bathrooms: property.bathrooms !== "" ? Number(property.bathrooms) : null,
        parking: null,
        land_size: null,
        status: "appraisal",
        notes: null,
        photo_urls: [],
      })
      .select()
      .single();

    if (propertyErr || !newProperty) {
      setError("Contact was created but property creation failed. Please add the property manually.");
      setSubmitting(false);
      return;
    }

    setSuccess({
      contactId: newContact.id,
      contactName: newContact.full_name,
      propertyId: newProperty.id,
      propertyAddress: newProperty.address,
    });
    setSubmitting(false);
  }

  function handleAddAnother() {
    setContact(CONTACT_DEFAULTS);
    setProperty(PROPERTY_DEFAULTS);
    setSuccess(null);
    setError(null);
  }

  if (success) {
    return (
      <div
        className="rounded-xl p-8 flex flex-col items-center gap-6 text-center"
        style={{
          backgroundColor: "white",
          border: "1px solid var(--color-slate-200)",
          maxWidth: "480px",
          margin: "0 auto",
        }}
      >
        <CheckCircle2
          size={48}
          style={{ color: "var(--color-gold-500)" }}
        />
        <div>
          <h2
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: "var(--color-navy-800)",
              marginBottom: "8px",
            }}
          >
            Client Created Successfully
          </h2>
          <p style={{ fontSize: "14px", color: "var(--color-slate-500)" }}>
            Contact and property have been added to your CRM.
          </p>
        </div>

        <div
          className="w-full flex flex-col gap-3 pt-4"
          style={{ borderTop: "1px solid var(--color-slate-100)" }}
        >
          <a
            href={`/contacts/${success.contactId}`}
            className="flex items-center justify-between rounded-lg px-4 py-3 transition-colors"
            style={{
              border: "1px solid var(--color-slate-200)",
              textDecoration: "none",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-slate-50)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.backgroundColor = "transparent")
            }
          >
            <div className="text-left">
              <p
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "var(--color-slate-400)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "2px",
                }}
              >
                Contact
              </p>
              <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--color-navy-800)" }}>
                {success.contactName}
              </p>
            </div>
            <ExternalLink size={14} style={{ color: "var(--color-slate-400)" }} />
          </a>

          <a
            href={`/properties`}
            className="flex items-center justify-between rounded-lg px-4 py-3 transition-colors"
            style={{
              border: "1px solid var(--color-slate-200)",
              textDecoration: "none",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-slate-50)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.backgroundColor = "transparent")
            }
          >
            <div className="text-left">
              <p
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "var(--color-slate-400)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "2px",
                }}
              >
                Property
              </p>
              <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--color-navy-800)" }}>
                {success.propertyAddress}
              </p>
            </div>
            <ExternalLink size={14} style={{ color: "var(--color-slate-400)" }} />
          </a>
        </div>

        <button
          onClick={handleAddAnother}
          className="rounded-lg px-5 py-2.5 transition-colors"
          style={{
            fontSize: "14px",
            fontWeight: 500,
            backgroundColor: "var(--color-navy-800)",
            color: "white",
            border: "none",
            cursor: "pointer",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-navy-700)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-navy-800)")
          }
        >
          Add Another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div
          className="rounded-lg px-4 py-3 mb-6"
          style={{ backgroundColor: "#fee2e2", color: "#b91c1c", fontSize: "13px" }}
        >
          {error}
        </div>
      )}

      <div className="grid gap-6 mb-6" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div
          className="rounded-xl p-6 flex flex-col gap-5"
          style={{ backgroundColor: "white", border: "1px solid var(--color-slate-200)" }}
        >
          <div className="flex items-center gap-2">
            <User size={16} style={{ color: "var(--color-slate-400)" }} />
            <h2
              style={{
                fontSize: "15px",
                fontWeight: 600,
                color: "var(--color-navy-800)",
              }}
            >
              Contact Details
            </h2>
          </div>

          <div>
            <label style={labelStyle}>Full Name *</label>
            <input
              type="text"
              value={contact.full_name}
              onChange={(e) => setC("full_name", e.target.value)}
              placeholder="e.g. Sarah Johnson"
              style={inputStyle}
              {...focusHandlers}
            />
          </div>

          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={contact.email}
              onChange={(e) => setC("email", e.target.value)}
              placeholder="email@example.com"
              style={inputStyle}
              {...focusHandlers}
            />
          </div>

          <div>
            <label style={labelStyle}>Phone</label>
            <input
              type="tel"
              value={contact.phone}
              onChange={(e) => setC("phone", e.target.value)}
              placeholder="04XX XXX XXX"
              style={inputStyle}
              {...focusHandlers}
            />
          </div>

          <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div>
              <label style={labelStyle}>Type</label>
              <select
                value={contact.type}
                onChange={(e) => setC("type", e.target.value as Contact["type"])}
                style={inputStyle}
                {...focusHandlers}
              >
                <option value="vendor">Vendor</option>
                <option value="buyer">Buyer</option>
                <option value="tenant">Tenant</option>
                <option value="landlord">Landlord</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select
                value={contact.status}
                onChange={(e) => setC("status", e.target.value as Contact["status"])}
                style={inputStyle}
                {...focusHandlers}
              >
                <option value="warm">Warm</option>
                <option value="hot">Hot</option>
                <option value="cold">Cold</option>
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Seller Likelihood</label>
            <select
              value={contact.seller_likelihood ?? ""}
              onChange={(e) =>
                setC(
                  "seller_likelihood",
                  (e.target.value as Contact["seller_likelihood"]) || null
                )
              }
              style={inputStyle}
              {...focusHandlers}
            >
              <option value="">— Not set —</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Notes</label>
            <textarea
              value={contact.notes}
              onChange={(e) => setC("notes", e.target.value)}
              placeholder="Any relevant notes about this contact…"
              rows={3}
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
              onFocus={(e) =>
                ((e.currentTarget as HTMLElement).style.borderColor = "var(--color-navy-800)")
              }
              onBlur={(e) =>
                ((e.currentTarget as HTMLElement).style.borderColor = "var(--color-slate-200)")
              }
            />
          </div>
        </div>

        <div
          className="rounded-xl p-6 flex flex-col gap-5"
          style={{ backgroundColor: "white", border: "1px solid var(--color-slate-200)" }}
        >
          <div className="flex items-center gap-2">
            <Building2 size={16} style={{ color: "var(--color-slate-400)" }} />
            <h2
              style={{
                fontSize: "15px",
                fontWeight: 600,
                color: "var(--color-navy-800)",
              }}
            >
              Property Details
            </h2>
          </div>

          <div>
            <label style={labelStyle}>Address *</label>
            <input
              type="text"
              value={property.address}
              onChange={(e) => setP("address", e.target.value)}
              placeholder="e.g. 42 Harbour Street"
              style={inputStyle}
              {...focusHandlers}
            />
          </div>

          <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div>
              <label style={labelStyle}>Suburb</label>
              <input
                type="text"
                value={property.suburb}
                onChange={(e) => setP("suburb", e.target.value)}
                placeholder="e.g. Newtown"
                style={inputStyle}
                {...focusHandlers}
              />
            </div>
            <div>
              <label style={labelStyle}>State</label>
              <input
                type="text"
                value={property.state}
                onChange={(e) => setP("state", e.target.value)}
                placeholder="e.g. NSW"
                style={inputStyle}
                {...focusHandlers}
              />
            </div>
          </div>

          <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div>
              <label style={labelStyle}>Postcode</label>
              <input
                type="text"
                value={property.postcode}
                onChange={(e) => setP("postcode", e.target.value)}
                placeholder="2000"
                style={inputStyle}
                {...focusHandlers}
              />
            </div>
            <div>
              <label style={labelStyle}>Property Type</label>
              <select
                value={property.property_type}
                onChange={(e) => setP("property_type", e.target.value as Property["property_type"])}
                style={inputStyle}
                {...focusHandlers}
              >
                <option value="house">House</option>
                <option value="unit">Unit</option>
                <option value="townhouse">Townhouse</option>
                <option value="land">Land</option>
                <option value="commercial">Commercial</option>
                <option value="rural">Rural</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div>
              <label style={labelStyle}>Bedrooms</label>
              <input
                type="number"
                min={0}
                value={property.bedrooms}
                onChange={(e) => setP("bedrooms", e.target.value)}
                placeholder="e.g. 3"
                style={inputStyle}
                {...focusHandlers}
              />
            </div>
            <div>
              <label style={labelStyle}>Bathrooms</label>
              <input
                type="number"
                min={0}
                value={property.bathrooms}
                onChange={(e) => setP("bathrooms", e.target.value)}
                placeholder="e.g. 2"
                style={inputStyle}
                {...focusHandlers}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-2 rounded-lg px-6 py-3"
          style={{
            fontSize: "14px",
            fontWeight: 600,
            backgroundColor: "var(--color-navy-800)",
            color: "white",
            border: "none",
            cursor: submitting ? "not-allowed" : "pointer",
            opacity: submitting ? 0.7 : 1,
          }}
          onMouseEnter={(e) => {
            if (!submitting)
              (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-navy-700)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-navy-800)";
          }}
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          Create Contact &amp; Property
        </button>
      </div>
    </form>
  );
}
