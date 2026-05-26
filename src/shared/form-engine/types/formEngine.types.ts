import React from "react";

// ─── Navigation & Summary ────────────────────────────────────────────────────

export interface NavigationSection {
  id: string;
  label: string;
  fields: string[];
  icon?: React.ReactNode;
}

export interface SummaryRow {
  label: string;
  value: React.ReactNode;
  isStrong?: boolean;
}

// ─── Company Hierarchy ───────────────────────────────────────────────────────

export interface CompanyHierarchyEntry {
  companyTypeId: string;
  companyId: string;
  subCompanyId: string;
  contactPersonId: string;
}

export interface CompanyHierarchyState {
  filteredCompanies: Record<number, any[]>;
  filteredSubCompanies: Record<number, any[]>;
  filteredContacts: Record<number, any[]>;
  handleCompanyTypeChange: (index: number, typeId: string) => void;
  handleCompanyChange: (index: number, companyId: string) => Promise<void>;
  handleSubCompanyChange: (index: number, subCompanyId: string, companyId: string) => Promise<void>;
  preloadCascades: (entries: Array<{ companyTypeId?: string; companyId?: string; subCompanyId?: string }>) => Promise<void>;
}

// ─── Address Cascade ─────────────────────────────────────────────────────────

export interface AddressEntry {
  country: string;
  state: string;
  city: string;
  fullAddress?: string;
  zipcode?: string;
  locality?: string;
  latitude?: string;
  longitude?: string;
  gmbLink?: string;
  googleMapLink?: string;
  isActive?: boolean;
  isPrimary?: boolean;
}

export interface AddressCascadeState {
  statesByIndex: Record<number, any[]>;
  citiesByIndex: Record<number, any[]>;
  handleCountryChange: (index: number, countryId: string) => Promise<void>;
  handleStateChange: (index: number, stateId: string, countryId: string) => Promise<void>;
}

// ─── Commercial Rows ─────────────────────────────────────────────────────────

export type CostType = "RATE" | "LUMPSUM";

export interface CommercialEntry {
  label: string;
  area: string;
  costType: CostType | "1" | "2";
  rate: string;
  rateCost?: string;
  lumpsumCost?: string;
  lumpsum?: string;
  cost?: string;
}

// ─── Prefix Generation ───────────────────────────────────────────────────────

export interface PrefixState {
  editablePrefix: string;
  setEditablePrefix: (val: string) => void;
}

// ─── Form Engine Config ──────────────────────────────────────────────────────

export interface FormEngineConfig<TValues = any> {
  module: string;
  sections: NavigationSection[];
  getSummaryRows?: (values: TValues, options: Record<string, any>) => SummaryRow[];
  submitText?: string;
  createText?: string;
  editText?: string;
}

export interface EnterpriseWizardStep<TProps = any> extends NavigationSection {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  hidden?: boolean;
  component?: React.ComponentType<TProps>;
  render?: (props: TProps) => React.ReactNode;
}

export interface WizardSummaryConfig<TValues = any> {
  title: string;
  rows: SummaryRow[] | ((values: TValues) => SummaryRow[]);
  warningMessage?: string;
}

export interface WizardActionConfig {
  isSubmitting?: boolean;
  isEditMode?: boolean;
  onCancel: () => void;
  exportPdf?: () => void;
  exportDocx?: () => void;
  submitDisabled?: boolean;
  submitText?: string;
  onSaveUpdate?: () => void;
  onSaveRevision?: () => void;
  /** Last-step Save: opens update/revision choice then submits (edit mode) */
  onFinalSave?: () => void;
  onSaveDraft?: () => void;
  isSavingDraft?: boolean;
}
