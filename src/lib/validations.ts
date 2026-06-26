import { z } from "zod";

export const ApplicationStatusEnum = z.enum([
  "WISHLIST",
  "APPLIED",
  "SCREENING",
  "INTERVIEW",
  "TECHNICAL",
  "HR_ROUND",
  "OFFER",
  "REJECTED",
  "GHOSTED",
  "WITHDRAWN",
]);

export const PlatformEnum = z.enum([
  "LINKEDIN",
  "NAUKRI",
  "INDEED",
  "WELLFOUND",
  "REFERRAL",
  "DIRECT_EMAIL",
  "COMPANY_SITE",
  "OTHER",
]);

export const OutreachTypeEnum = z.enum([
  "COLD_EMAIL",
  "LINKEDIN_DM",
  "COVER_LETTER",
  "FOLLOW_UP",
]);

export const createApplicationSchema = z.object({
  company: z.string().min(1, "Company name is required"),
  role: z.string().min(1, "Role is required"),
  location: z.string().nullable().optional(),
  salaryMin: z.number().nullable().optional(),
  salaryMax: z.number().nullable().optional(),
  salaryCurrency: z.string().default("INR"),
  jobUrl: z.string().url().or(z.literal("")).nullable().optional(),
  status: ApplicationStatusEnum.default("APPLIED"),
  platform: PlatformEnum,
  notes: z.string().nullable().optional(),
  appliedDate: z.string().or(z.date()).optional(),
  lastActivity: z.string().or(z.date()).optional(),
});

export const updateApplicationSchema = createApplicationSchema.partial();

export const createContactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email().or(z.literal("")).nullable().optional(),
  linkedinUrl: z.string().url().or(z.literal("")).nullable().optional(),
  role: z.string().nullable().optional(),
  applicationId: z.string().min(1, "Application ID is required"),
});

export const createFollowUpSchema = z.object({
  dueDate: z.string().datetime().or(z.date()).or(z.string().min(1)),
  note: z.string().nullable().optional(),
  applicationId: z.string().min(1, "Application ID is required"),
});

export const updateFollowUpSchema = z.object({
  completed: z.boolean(),
});
