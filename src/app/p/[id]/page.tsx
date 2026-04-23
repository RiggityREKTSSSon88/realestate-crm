import { createClient } from "@/lib/supabase/server";
import type { AgentReview } from "@/types/database";
import ProposalPreview from "./ProposalPreview";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProposalPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: proposalData } = await supabase
    .from("proposals")
    .select(
      "*, contacts(full_name, email, phone), properties(address, suburb, state, postcode), users:created_by(full_name, email, avatar_url)"
    )
    .eq("id", id)
    .single();

  if (!proposalData) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          background: "#f0f2f5",
        }}
      >
        <div style={{ textAlign: "center", padding: "40px" }}>
          <div
            style={{
              fontSize: "48px",
              color: "#0F2942",
              fontWeight: 800,
              marginBottom: "8px",
            }}
          >
            Estate<span style={{ color: "#F5A623" }}>IQ</span>
          </div>
          <p style={{ color: "#555", fontSize: "18px", marginBottom: "8px" }}>
            This proposal is no longer available.
          </p>
          <p style={{ color: "#aaa", fontSize: "14px" }}>
            Please contact your agent for an updated link.
          </p>
        </div>
      </div>
    );
  }

  type ProposalRow = typeof proposalData;

  type JoinedContact = {
    full_name: string;
    email: string | null;
    phone: string | null;
  } | null;

  type JoinedProperty = {
    address: string;
    suburb: string;
    state: string;
    postcode: string;
  } | null;

  type JoinedAgent = {
    full_name: string;
    email: string;
    avatar_url: string | null;
  } | null;

  const rawContact = (proposalData as ProposalRow & { contacts: JoinedContact }).contacts;
  const rawProperty = (proposalData as ProposalRow & { properties: JoinedProperty }).properties;
  const rawAgent = (proposalData as ProposalRow & { users: JoinedAgent }).users;

  const contact = Array.isArray(rawContact) ? (rawContact[0] ?? null) : rawContact;
  const property = Array.isArray(rawProperty) ? (rawProperty[0] ?? null) : rawProperty;
  const agent = Array.isArray(rawAgent) ? (rawAgent[0] ?? null) : rawAgent;

  const createdBy = proposalData.created_by;
  let reviews: AgentReview[] = [];
  if (createdBy) {
    const { data: reviewData } = await supabase
      .from("agent_reviews")
      .select("*")
      .eq("agent_id", createdBy);
    reviews = reviewData ?? [];
  }

  const proposal = {
    id: proposalData.id,
    title: proposalData.title,
    status: proposalData.status,
    sections: proposalData.sections,
    contact_id: proposalData.contact_id,
    property_id: proposalData.property_id,
    total_view_seconds: proposalData.total_view_seconds,
    first_opened_at: proposalData.first_opened_at,
    signed_at: proposalData.signed_at,
    docuseal_signing_url: proposalData.docuseal_signing_url,
    created_at: proposalData.created_at,
    created_by: proposalData.created_by,
    agency_id: proposalData.agency_id,
    updated_at: proposalData.updated_at,
    docuseal_submission_id: proposalData.docuseal_submission_id,
    sent_at: proposalData.sent_at,
  };

  return (
    <ProposalPreview
      proposal={proposal}
      contact={contact}
      property={property}
      agent={agent}
      reviews={reviews}
    />
  );
}
