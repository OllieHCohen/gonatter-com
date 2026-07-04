export type UserRole = "caller" | "listener" | "admin";
export type ProfileStatus = "active" | "suspended" | "banned";
export type ConversationState = "open" | "accepted" | "declined" | "closed";
export type CallState =
  | "authorising"
  | "active"
  | "completed"
  | "cancelled"
  | "failed";
export type CallEndReason =
  | "caller_left"
  | "listener_left"
  | "block_reached"
  | "no_show"
  | "error";
export type ReportCategory =
  | "distress_self_harm"
  | "sexual_adult"
  | "abuse_harassment"
  | "scam_fraud"
  | "csam"
  | "other";

export type Profile = {
  id: string;
  role: UserRole;
  display_name: string;
  country: string | null;
  languages: string[];
  phone: string | null;
  phone_verified: boolean;
  status: ProfileStatus;
  is_admin: boolean;
  created_at: string;
};

export type BugReportStatus = "new" | "in_progress" | "resolved" | "dismissed";

export type BugReport = {
  id: string;
  reporter_id: string | null;
  reporter_email: string | null;
  description: string;
  page_url: string;
  context: Record<string, unknown>;
  status: BugReportStatus;
  created_at: string;
};

export type ListenerProfile = {
  profile_id: string;
  bio: string | null;
  gender: string | null;
  dob: string | null;
  photo_url: string | null;
  per_minute_rate_minor: number;
  rate_currency: string;
  id_verified: boolean;
  stripe_account_id: string | null;
  stripe_identity_status: string;
  charges_enabled: boolean;
  available: boolean;
  available_updated_at: string | null;
  calls_count: number;
  rating_avg: number;
  rating_count: number;
};

export type CallerProfile = {
  profile_id: string;
  gender: string | null;
  dob: string | null;
  stripe_customer_id: string | null;
  interests: string[];
  seen_platonic_reminder: boolean;
};

export type Interest = { id: string; label: string; sort_order: number };

export type CrisisResource = {
  id: string;
  country_code: string | null;
  name: string;
  phone: string | null;
  url: string | null;
  notes: string | null;
  sort_order: number;
};
