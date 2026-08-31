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
  /** Send this back when saving an existing stage so the row — and the deliverables
   *  configured under it — survive the update instead of being recreated. */
  id?: string;
  name: string;
  /** Percentage of the total commercial cost. All stages in a plan sum to 100. */
  percentage: number | string;
  sortOrder?: number;
  /**
   * How many deliverables hang off this stage. Server-supplied on every read
   * (`PLAN_INCLUDE`), so the editor can show it for a CLOSED stage — the list itself is
   * still fetched lazily, one stage at a time, when a branch is opened.
   */
  _count?: { deliverables: number };
}

/**
 * A work item configured under a payment-plan stage (e.g. "Site Survey"). Pure
 * configuration — no status, owner or progress; a project takes a copy of these when a
 * lead converts. Deliberately NOT surfaced anywhere in the lead workflow.
 */
export interface PaymentPlanStageDeliverable {
  id: string;
  stageId: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** Create/update payload for a deliverable. PATCH honours only the keys present. */
export interface DeliverablePayload {
  name?: string;
  description?: string | null;
  isActive?: boolean;
}

/** A reusable, stage-wise fee break-up plan ("payment method"). */
export interface PaymentPlan {
  id?: string;
  /**
   * Derived by the server from the project category ("Bungalow & Duplex → Bungalow (SINGLE)").
   * Always present on a plan read from the API; never sent on a write — the category is the
   * plan's identity, so a client-supplied name would be a second source for the same label.
   */
  name?: string;
  description?: string | null;
  isDefault?: boolean;
  isActive?: boolean;
  stages: PaymentPlanStage[];
  /**
   * The project type this plan bills. `subCategoryId` null = the whole category; BOTH null =
   * an un-typed plan written before plans were scoped, which every lead is still offered.
   */
  categoryId?: string | null;
  subCategoryId?: string | null;
  category?: { id: string; name: string; color?: string | null } | null;
  subCategory?: { id: string; name: string; color?: string | null } | null;
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
