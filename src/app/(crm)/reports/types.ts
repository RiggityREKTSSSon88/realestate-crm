import type { Listing, Appraisal, Commission, ScheduledReport } from "@/types/database";

export type ReportUser = {
  id: string;
  full_name: string;
  email: string;
  role: string;
};

export type ReportProperty = {
  id: string;
  address: string;
  suburb: string;
  state: string;
  postcode: string;
  property_type: string;
};

export type ReportListing = Listing & {
  properties: ReportProperty | null;
  users: ReportUser | null;
};

export type ReportAppraisal = Appraisal & {
  properties: ReportProperty | null;
  contacts: { id: string; full_name: string } | null;
};

export type ReportCommission = Commission & {
  listings: (Listing & { properties: ReportProperty | null }) | null;
  agents: ReportUser | null;
};

export type ReportData = {
  agents: ReportUser[];
  listings: ReportListing[];
  appraisals: ReportAppraisal[];
  commissions: ReportCommission[];
  scheduledReports: ScheduledReport[];
};
