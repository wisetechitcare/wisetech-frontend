export interface LeadStatus {
  id: string;
  name: string;
  color: string;
  isDefault?: boolean;
  /** Leads in this status are treated as Projects (unified entity rule). */
  isProjectTrigger?: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LeadReferralType {
  id?: string;
  name: string;
  color: string;
  isInternal?: boolean; // Added: Field to distinguish internal vs external referral types
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeadDirectSource {
  id?: string;
  name: string;
  color: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeadCancellationReason {
  id?: string;
  reason: string;
  color: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** A single stage within a payment plan (e.g. "Advance", 30%). */
export interface PaymentPlanStage {
  id?: string;
  name: string;
  /** Percentage of the total commercial cost. All stages in a plan sum to 100. */
  percentage: number | string;
  sortOrder?: number;
}

/** A reusable, stage-wise fee break-up plan ("payment method"). */
export interface PaymentPlan {
  id?: string;
  name: string;
  description?: string | null;
  isDefault?: boolean;
  isActive?: boolean;
  stages: PaymentPlanStage[];
  createdAt?: string;
  updatedAt?: string;
}

/** A single meeting row within a bracket. `value` is free text (count / "NA" / …). */
export interface MeetingScheduleItem {
  id?: string;
  name: string;
  value?: string | number | null;
  sortOrder?: number;
}

/** An area band within a meeting-schedule type. */
export interface MeetingScheduleBracket {
  id?: string;
  minArea: number | string;
  maxArea: number | string;
  completionYear?: number | string;
  completionMonth?: number | string;
  sortOrder?: number;
  items: MeetingScheduleItem[];
}

/** A reusable meeting-schedule master keyed to a project type. */
export interface MeetingScheduleType {
  id?: string;
  name: string;
  description?: string | null;
  isDefault?: boolean;
  isActive?: boolean;
  brackets: MeetingScheduleBracket[];
  createdAt?: string;
  updatedAt?: string;
}
