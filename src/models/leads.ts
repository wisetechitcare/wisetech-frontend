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
