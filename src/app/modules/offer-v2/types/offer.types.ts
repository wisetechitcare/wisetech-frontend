export interface OfferData {
  proposalTemplateId?: string;
  // Contact & Project Info
  contactPerson: string;
  contactTitle: string;
  projectName: string;
  submittedBy: string;
  inquiryNumber: string;
  revisionNumber: string;
  offerDate: string;

  // Company Details
  companyName: string;
  companyAddress: string;
  companyArea: string;
  companyCity: string;
  companyZipcode: string;
  companyState: string;
  companyCountry: string;

  // Project Details
  services: string;
  projectLocation: string;
  totalProjectArea: string;
  totalProjectCost: string;
  completionDate: string;

  // Financials
  feeBreakup: string; // Could be an array of objects if needed, string for now
  paymentSchedule: string; // Could be an array of objects
  stagePercentages: string;
  paymentData: string;

  // Meetings
  meetingSchedule: string;
  meetingCounts: string;

  // Additional
  notes: string;
  clauses: string;
  projectSpecificParagraphs: string;
}
