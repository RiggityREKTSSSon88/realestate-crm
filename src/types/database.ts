export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// Row types
export type Agency = {
  id: string;
  name: string;
  logo_url: string | null;
  subscription_plan: "trial" | "starter" | "professional" | "enterprise";
  subscription_status: "active" | "past_due" | "cancelled";
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  onboarding_completed: boolean;
  trial_ends_at: string | null;
  created_at: string;
}

export type Invitation = {
  id: string;
  agency_id: string;
  email: string;
  role: "admin" | "agent";
  token: string;
  invited_by: string | null;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
}

export type User = {
  id: string;
  email: string;
  full_name: string;
  role: "super_admin" | "admin" | "agent";
  agency_id: string | null;
  avatar_url: string | null;
  created_at: string;
}

export type Contact = {
  id: string;
  agency_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  type: "buyer" | "vendor" | "tenant" | "landlord";
  status: "cold" | "warm" | "hot";
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  last_contacted_at: string | null;
  seller_likelihood: "low" | "medium" | "high" | null;
  kyc_status: "unverified" | "pending" | "verified";
  kyc_verified_at: string | null;
  aml_risk_level: "low" | "medium" | "high" | null;
  aml_notes: string | null;
  aml_assessed_at: string | null;
  aml_assessed_by: string | null;
  lead_score: number | null;
}

export type KYCDocument = {
  id: string;
  agency_id: string;
  contact_id: string;
  document_type: "passport" | "drivers_licence" | "birth_certificate" | "proof_of_address" | "other";
  file_name: string;
  file_path: string;
  uploaded_by: string | null;
  expiry_date: string | null;
  status: "active" | "expired" | "superseded";
  notes: string | null;
  created_at: string;
}

export type ComplianceAuditLog = {
  id: string;
  agency_id: string;
  contact_id: string | null;
  performed_by: string | null;
  action_type: "kyc_document_uploaded" | "kyc_document_deleted" | "kyc_status_changed" | "aml_risk_updated";
  previous_value: Json;
  new_value: Json;
  notes: string | null;
  created_at: string;
}

export type Property = {
  id: string;
  agency_id: string;
  address: string;
  suburb: string;
  state: string;
  postcode: string;
  bedrooms: number | null;
  bathrooms: number | null;
  parking: number | null;
  land_size: number | null;
  property_type: "house" | "unit" | "townhouse" | "land" | "commercial" | "rural";
  status: "appraisal" | "listed" | "under_offer" | "sold" | "leased" | "withdrawn";
  notes: string | null;
  photo_urls: string[];
  created_at: string;
  updated_at: string;
}

export type ComparableSale = {
  address: string;
  sale_price: number | null;
  sale_date: string;
}

export type Appraisal = {
  id: string;
  agency_id: string;
  contact_id: string;
  property_id: string;
  appraised_by: string | null;
  appraisal_date: string;
  estimated_value_low: number | null;
  estimated_value_high: number | null;
  status: "hot" | "warm" | "cold";
  notes: string | null;
  follow_up_date: string | null;
  comparable_sales: ComparableSale[];
  created_at: string;
  updated_at: string;
}

export type Listing = {
  id: string;
  agency_id: string;
  property_id: string;
  contact_id: string | null;
  listed_by: string | null;
  list_price: number | null;
  list_date: string;
  days_on_market: number | null;
  status: "active" | "under_offer" | "sold" | "withdrawn" | "leased";
  marketing_budget: number | null;
  enquiries_count: number;
  open_home_count: number;
  price_feedback: string | null;
  offers_received: number;
  contracts_out: number;
  vendor_notes: string | null;
  sold_price: number | null;
  created_at: string;
  updated_at: string;
}

export type Task = {
  id: string;
  agency_id: string;
  assigned_to: string | null;
  related_contact_id: string | null;
  related_property_id: string | null;
  title: string;
  due_date: string | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
}

export type Communication = {
  id: string;
  agency_id: string;
  contact_id: string;
  type: "email" | "sms" | "call" | "note";
  subject: string | null;
  body: string | null;
  sent_by: string | null;
  sent_at: string;
  sentiment: "positive" | "neutral" | "negative" | "urgent" | null;
}

export type Template = {
  id: string;
  agency_id: string;
  name: string;
  type: "email" | "sms";
  subject: string | null;
  body: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type OpenHome = {
  id: string;
  agency_id: string;
  listing_id: string;
  scheduled_at: string;
  attendees: Json;
  created_at: string;
}

export type ProposalSection = {
  id: string;
  type: "cover" | "agent_bio" | "comparable_sales" | "pricing" | "marketing" | "social_proof" | "booking" | "custom";
  title: string;
  body: string;
  visible: boolean;
  order: number;
  adminOnly: boolean;
  data: Record<string, unknown>;
}

export type ProposalTemplate = {
  id: string;
  agency_id: string;
  name: string;
  sections: ProposalSection[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type Proposal = {
  id: string;
  agency_id: string;
  created_by: string | null;
  contact_id: string | null;
  property_id: string | null;
  title: string;
  status: "draft" | "sent" | "opened" | "signed" | "declined";
  sections: ProposalSection[];
  docuseal_submission_id: string | null;
  docuseal_signing_url: string | null;
  sent_at: string | null;
  first_opened_at: string | null;
  signed_at: string | null;
  total_view_seconds: number;
  created_at: string;
  updated_at: string;
}

export type DocumentEvent = {
  id: string;
  proposal_id: string;
  event_type: "opened" | "section_viewed" | "time_spent" | "signed" | "declined" | "booking_clicked";
  section_id: string | null;
  duration_seconds: number | null;
  metadata: Json;
  created_at: string;
}

export type AgentReview = {
  id: string;
  agency_id: string;
  agent_id: string;
  reviewer_name: string;
  rating: number;
  review_text: string;
  review_date: string;
  source: "ratemyagent" | "google" | "other";
  created_at: string;
}

export type BookingAvailability = {
  id: string;
  agency_id: string;
  agent_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  active: boolean;
  created_at: string;
}

export type BookingAppointment = {
  id: string;
  agency_id: string;
  agent_id: string;
  proposal_id: string | null;
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  scheduled_at: string;
  notes: string | null;
  status: "pending" | "confirmed" | "cancelled";
  created_at: string;
}

export type Commission = {
  id: string;
  agency_id: string;
  listing_id: string;
  agent_id: string | null;
  expected_amount: number | null;
  actual_amount: number | null;
  status: "pending" | "invoiced" | "paid";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type ScheduledReport = {
  id: string;
  agency_id: string;
  created_by: string | null;
  report_type: "agent_performance" | "kpi" | "stocklist" | "geo_breakdown" | "staff_comparison";
  frequency: "weekly" | "monthly";
  recipients: Json;
  active: boolean;
  next_run_at: string | null;
  last_run_at: string | null;
  created_at: string;
}

export type IntegrationSetting = {
  id: string;
  agency_id: string;
  integration_name: string;
  api_key: string | null;
  api_secret: string | null;
  config: Json;
  connected_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ZapierWebhook = {
  id: string;
  agency_id: string;
  name: string;
  url: string;
  events: string[];
  active: boolean;
  secret: string | null;
  created_at: string;
}

// Database type for Supabase client

export type Database = {
  public: {
    Tables: {
      agencies: {
        Row: Agency;
        Insert: Omit<Agency, "id" | "created_at" | "stripe_customer_id" | "stripe_subscription_id" | "onboarding_completed" | "trial_ends_at"> & { id?: string; created_at?: string; stripe_customer_id?: string | null; stripe_subscription_id?: string | null; onboarding_completed?: boolean; trial_ends_at?: string | null };
        Update: Partial<Omit<Agency, "id" | "created_at">>;
        Relationships: [];
      };
      invitations: {
        Row: Invitation;
        Insert: Omit<Invitation, "id" | "created_at" | "token"> & { id?: string; created_at?: string; token?: string };
        Update: Partial<Omit<Invitation, "id" | "created_at">>;
        Relationships: [];
      };
      users: {
        Row: User;
        Insert: Omit<User, "created_at"> & { created_at?: string };
        Update: Partial<Omit<User, "id" | "created_at">>;
        Relationships: [];
      };
      contacts: {
        Row: Contact;
        Insert: Omit<Contact, "id" | "created_at" | "updated_at" | "last_contacted_at" | "seller_likelihood" | "kyc_status" | "kyc_verified_at" | "aml_risk_level" | "aml_notes" | "aml_assessed_at" | "aml_assessed_by" | "lead_score"> & { id?: string; created_at?: string; updated_at?: string; last_contacted_at?: string | null; seller_likelihood?: Contact["seller_likelihood"]; kyc_status?: Contact["kyc_status"]; kyc_verified_at?: string | null; aml_risk_level?: Contact["aml_risk_level"]; aml_notes?: string | null; aml_assessed_at?: string | null; aml_assessed_by?: string | null; lead_score?: number | null };
        Update: Partial<Omit<Contact, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      kyc_documents: {
        Row: KYCDocument;
        Insert: Omit<KYCDocument, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<KYCDocument, "id" | "created_at">>;
        Relationships: [];
      };
      compliance_audit_log: {
        Row: ComplianceAuditLog;
        Insert: Omit<ComplianceAuditLog, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<ComplianceAuditLog, "id" | "created_at">>;
        Relationships: [];
      };
      properties: {
        Row: Property;
        Insert: Omit<Property, "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<Property, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      appraisals: {
        Row: Appraisal;
        Insert: Omit<Appraisal, "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string; comparable_sales?: ComparableSale[] };
        Update: Partial<Omit<Appraisal, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      listings: {
        Row: Listing;
        Insert: Omit<Listing, "id" | "created_at" | "updated_at" | "days_on_market"> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<Listing, "id" | "created_at" | "updated_at" | "days_on_market">>;
        Relationships: [];
      };
      tasks: {
        Row: Task;
        Insert: Omit<Task, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<Task, "id" | "created_at">>;
        Relationships: [];
      };
      communications: {
        Row: Communication;
        Insert: Omit<Communication, "id"> & { id?: string; sentiment?: Communication["sentiment"] };
        Update: Partial<Omit<Communication, "id">>;
        Relationships: [];
      };
      templates: {
        Row: Template;
        Insert: Omit<Template, "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<Template, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      open_homes: {
        Row: OpenHome;
        Insert: Omit<OpenHome, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<OpenHome, "id" | "created_at">>;
        Relationships: [];
      };
      commissions: {
        Row: Commission;
        Insert: Omit<Commission, "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<Commission, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      scheduled_reports: {
        Row: ScheduledReport;
        Insert: Omit<ScheduledReport, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<ScheduledReport, "id" | "created_at">>;
        Relationships: [];
      };
      proposal_templates: {
        Row: ProposalTemplate;
        Insert: Omit<ProposalTemplate, "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<ProposalTemplate, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      proposals: {
        Row: Proposal;
        Insert: Omit<Proposal, "id" | "created_at" | "updated_at" | "total_view_seconds"> & { id?: string; created_at?: string; updated_at?: string; total_view_seconds?: number };
        Update: Partial<Omit<Proposal, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      document_events: {
        Row: DocumentEvent;
        Insert: Omit<DocumentEvent, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<DocumentEvent, "id" | "created_at">>;
        Relationships: [];
      };
      agent_reviews: {
        Row: AgentReview;
        Insert: Omit<AgentReview, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<AgentReview, "id" | "created_at">>;
        Relationships: [];
      };
      booking_availability: {
        Row: BookingAvailability;
        Insert: Omit<BookingAvailability, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<BookingAvailability, "id" | "created_at">>;
        Relationships: [];
      };
      booking_appointments: {
        Row: BookingAppointment;
        Insert: Omit<BookingAppointment, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<BookingAppointment, "id" | "created_at">>;
        Relationships: [];
      };
      integration_settings: {
        Row: IntegrationSetting;
        Insert: Omit<IntegrationSetting, "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<IntegrationSetting, "id" | "created_at">>;
        Relationships: [];
      };
      zapier_webhooks: {
        Row: ZapierWebhook;
        Insert: Omit<ZapierWebhook, "id" | "created_at" | "secret"> & { id?: string; created_at?: string; secret?: string | null };
        Update: Partial<Omit<ZapierWebhook, "id" | "created_at">>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
