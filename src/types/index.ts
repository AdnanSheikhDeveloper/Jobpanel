export type ApplicationStatus =
  | "WISHLIST"
  | "APPLIED"
  | "SCREENING"
  | "INTERVIEW"
  | "TECHNICAL"
  | "HR_ROUND"
  | "OFFER"
  | "REJECTED"
  | "GHOSTED"
  | "WITHDRAWN";

export type Platform =
  | "LINKEDIN"
  | "NAUKRI"
  | "INDEED"
  | "WELLFOUND"
  | "REFERRAL"
  | "DIRECT_EMAIL"
  | "COMPANY_SITE"
  | "OTHER";

export type OutreachType = "COLD_EMAIL" | "LINKEDIN_DM" | "COVER_LETTER" | "FOLLOW_UP";

export interface Contact {
  id: string;
  name: string;
  email: string | null;
  linkedinUrl: string | null;
  role: string | null;
  applicationId: string;
  createdAt: string | Date;
}

export interface FollowUp {
  id: string;
  dueDate: string | Date;
  completed: boolean;
  note: string | null;
  applicationId: string;
  createdAt: string | Date;
}

export interface Application {
  id: string;
  company: string;
  role: string;
  location: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  jobUrl: string | null;
  status: ApplicationStatus;
  platform: Platform;
  appliedDate: string | Date;
  lastActivity: string | Date;
  notes: string | null;
  contacts?: Contact[];
  followUps?: FollowUp[];
  createdAt: string | Date;
  updatedAt: string | Date;
}
