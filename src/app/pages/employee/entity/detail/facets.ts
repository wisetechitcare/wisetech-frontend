import {
  fmtDate,
  fmtDateTime,
  fmtMoney,
  employeeUserName,
  sumLeadCommercials,
  sumProjectCommercials,
  DASH,
  type CommercialTotals,
} from './entityViewModel';
import type { DensityMode } from './density';

/**
 * Unified Entity view-model. There is ONE entity: the Lead is the master; the
 * Project is an extension that materialises when LeadStatus.isProjectTrigger is
 * true. This builder produces a SINGLE `EntityVM` where each business domain has
 * exactly one home — lead data is the foundation and project data is merged in
 * (never duplicated into a parallel structure). All `if (isProject)` branching
 * lives here so the section components stay pure presentation.
 */
export interface KV {
  label: string;
  value: any;
  minLevel?: DensityMode;
}
export interface ClientCompanyVM {
  name: string;
  type?: string;
  subCompany?: string;
  contact?: string;
  contactId?: string;
  phone?: string;
  email?: string;
  href?: string;
}
export interface ReferralVM {
  type: string;
  by: string;
  notes?: string;
}
export interface BranchVM {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  lat?: any;
  lng?: any;
}
export interface AddressVM {
  title?: string;
  full?: string;
  area?: string;
  zip?: string;
  lat?: any;
  lng?: any;
  /** Whether this address belongs to the lead itself or a project site. */
  kind?: 'lead' | 'project';
}
export interface PointVM {
  heading: string;
  description: string;
}
export interface CommercialLineVM {
  label: string;
  area: string;
  costType: string;
  rate?: any;
  cost: any;
}
export interface DocVM {
  name: string;
  template?: string;
  revision?: any;
  date?: string;
  by?: string;
  pdf?: string;
  docx?: string;
}

export interface EntityVM {
  isProject: boolean;
  client: {
    companies: ClientCompanyVM[];
    referrals: ReferralVM[];
    branches: BranchVM[];
    addresses: AddressVM[];
  };
  scope: {
    services: string[];
    categories: string[];
    subcategories: string[];
    areaRows: KV[];
    points: PointVM[];
  };
  commercials: {
    lead: { lines: CommercialLineVM[]; totals: CommercialTotals };
    project?: { lines: CommercialLineVM[]; totals: CommercialTotals };
  };
  documents: DocVM[];
  /** Narrative content captured on the lead — has no other home. */
  notes: { remarks?: string; description?: string };
  /** Where the source files for this record live (lead-level). */
  fileLocation: { path?: string; company?: string; companyType?: string };
  systemRows: KV[];
  projectSystemRows?: KV[];
}

const uniq = (arr: any[]): string[] => Array.from(new Set(arr.filter(Boolean)));
const areaText = (v?: string, unit?: string) => (v ? `${v}${unit ? ` ${unit}` : ''}` : undefined);

export const buildEntityVM = (lead: any): EntityVM => {
  const isProject = !!lead?.status?.isProjectTrigger || !!lead?.project || !!lead?.projectId;
  const p = lead?.project || {};
  const ad = lead?.additionalDetails || {};

  // ── CLIENT (lead is master; project branches/addresses merged, deduped) ──
  const companies: ClientCompanyVM[] = (lead?.leadTeams || []).map((t: any) => ({
    name: t?.company?.companyName || t?.subCompany?.subCompanyName || DASH,
    type: t?.companyType?.name,
    subCompany: t?.subCompany?.subCompanyName,
    contact: t?.contact?.fullName,
    contactId: t?.contact?.id,
    phone: t?.contact?.phone || t?.company?.phone,
    email: t?.contact?.email || t?.company?.email,
    href: t?.company?.id ? `/companies/${t.company.id}` : undefined,
  }));
  if (companies.length === 0 && (lead?.company || p?.company)) {
    const c = lead?.company || p?.company;
    companies.push({
      name: c?.companyName || DASH,
      contact: lead?.contact?.fullName || p?.contactPerson?.fullName,
      phone: lead?.contact?.phone || c?.phone,
      email: lead?.contact?.email || c?.email,
      href: c?.id ? `/companies/${c.id}` : undefined,
    });
  }

  const referrals: ReferralVM[] = (lead?.referrals || []).map((r: any) => ({
    type: r?.referralType?.name || 'Referral',
    by:
      employeeUserName(r?.referredByEmployee) ||
      r?.referredByContact?.fullName ||
      r?.referringCompany?.companyName ||
      r?.companyName ||
      DASH,
    notes: r?.notes,
  }));

  const branchMap = new Map<string, BranchVM>();
  [...(lead?.branchMappings || []), ...(p?.branchMappings || [])]
    .map((m: any) => m?.branch)
    .filter(Boolean)
    .forEach((b: any) => {
      const key = b?.id || b?.name;
      if (key && !branchMap.has(key))
        branchMap.set(key, {
          name: b?.name || DASH,
          phone: b?.phone,
          email: b?.email,
          address: [b?.address, b?.city, b?.state].filter(Boolean).join(', '),
          lat: b?.latitude,
          lng: b?.longitude,
        });
    });

  const addresses: AddressVM[] = [];
  if (ad.city || ad.projectAddress || ad.locality) {
    addresses.push({
      title: 'Lead Address',
      full: ad.projectAddress,
      area: [ad.locality, ad.city, ad.state, ad.country].filter(Boolean).join(', '),
      zip: ad.zipCode,
      lat: ad.latitude,
      lng: ad.longitude,
      kind: 'lead',
    });
  }
  (p?.addresses || []).forEach((a: any) => {
    addresses.push({
      title: a?.isPrimary ? 'Project Site (Primary)' : 'Project Site',
      full: a?.fullAddress,
      area: [a?.locality, a?.city, a?.state, a?.country].filter(Boolean).join(', '),
      zip: a?.zipcode,
      lat: a?.latitude,
      lng: a?.longitude,
      kind: 'project',
    });
  });
  // dedup identical lead/project addresses
  const seenAddr = new Set<string>();
  const dedupAddresses = addresses.filter(a => {
    const k = `${a.full || ''}|${a.area || ''}`;
    if (seenAddr.has(k)) return false;
    seenAddr.add(k);
    return true;
  });

  // ── SCOPE (union of lead + project mappings, single home) ──
  const services = uniq([
    ...(lead?.services || []).map((s: any) => s?.service?.name),
    ...(p?.projectServiceMappings || []).map((s: any) => s?.service?.name),
    p?.service?.name,
  ]);
  const categories = uniq([
    ...(lead?.leadCategories || []).map((c: any) => c?.category?.name),
    ...(p?.projectCategoryMappings || []).map((c: any) => c?.category?.name),
    p?.category?.name,
  ]);
  const subcategories = uniq([
    ...(lead?.leadSubCategories || []).map((c: any) => c?.subcategory?.name),
    ...(p?.projectSubCategoryMappings || []).map((c: any) => c?.subcategory?.name),
    p?.subCategory?.name,
  ]);

  const areaRows: KV[] = [
    { label: 'Plot Area', value: areaText(ad.plotArea || p.plotArea, ad.plotAreaUnit || p.plotAreaUnit) },
    { label: 'Built-Up Area', value: areaText(ad.builtUpArea || p.builtUpArea, ad.builtUpAreaUnit || p.builtUpAreaUnit) },
    { label: 'Building Detail', value: ad.buildingDetail || p.buildingDetail },
    { label: 'Project Area', value: ad.projectArea || p.projectArea },
    { label: 'Type', value: ad.type, minLevel: 'detailed' },
    { label: 'No. of Pages', value: ad.numberOfPages, minLevel: 'detailed' },
  ];

  const pointMap = new Map<string, PointVM>();
  [...(lead?.projectPointValues || []), ...(p?.projectPointValues || [])]
    .filter((pt: any) => pt?.heading || pt?.description)
    .forEach((pt: any) => {
      const key = `${pt.heading || ''}|${pt.description || ''}`;
      if (!pointMap.has(key)) pointMap.set(key, { heading: pt.heading || 'Point', description: pt.description || DASH });
    });

  // ── COMMERCIALS (lead quote + project contract, both visible, no dup card) ──
  const leadLines: CommercialLineVM[] = (lead?.commercials || []).map((c: any) => ({
    label: c.label || DASH,
    area: c.area || DASH,
    costType: c.costType || 'RATE',
    rate: c.rate,
    cost: c.cost,
  }));
  const projectLines: CommercialLineVM[] = (p?.projectCommercialMappings || []).map((c: any) => ({
    label: c.label || DASH,
    area: c.area || DASH,
    costType: c.costType || 'RATE',
    rate: c.rate,
    cost: c.totalCost ?? c.rateCost ?? c.lumpsumCost,
  }));

  // ── DOCUMENTS (lead lineage; single home) ──
  const documents: DocVM[] = (lead?.generatedProposals || []).map((d: any) => ({
    name: d.fileName || 'Proposal',
    template: d.template?.templateName,
    revision: d.revisionNumber,
    date: d.createdAt ? fmtDate(d.createdAt) : undefined,
    by: employeeUserName(d.creator) || undefined,
    pdf: d.generatedPdfUrl,
    docx: d.generatedDocxUrl,
  }));

  // ── NOTES & FILE LOCATION (lead-level narrative + where files live) ──
  const notes = {
    remarks: lead?.remarks || undefined,
    description: lead?.description || undefined,
  };
  const fileLocation = {
    path: lead?.fileLocation || undefined,
    company: lead?.fileLocationCompany || undefined,
    companyType: lead?.fileLocationCompanyType || undefined,
  };

  // ── SYSTEM (pure record metadata only — operational flags live in Execution,
  //    file location lives in Documents, so they are NOT duplicated here) ──
  const systemRows: KV[] = [
    { label: 'Lead Number', value: lead?.prefix, minLevel: 'detailed' },
    { label: 'Created By', value: employeeUserName(lead?.createdBy), minLevel: 'detailed' },
    { label: 'Created', value: fmtDateTime(lead?.createdAt), minLevel: 'detailed' },
    { label: 'Last Edited By', value: employeeUserName(lead?.updatedBy), minLevel: 'detailed' },
    { label: 'Last Edited', value: fmtDateTime(lead?.updatedAt), minLevel: 'detailed' },
    { label: 'Lead ID', value: lead?.id, minLevel: 'advanced' },
    { label: 'Active', value: lead?.isActive ? 'Yes' : 'No', minLevel: 'advanced' },
    { label: 'Location Flag', value: lead?.isLocationIncorrect ? 'Marked incorrect' : 'OK', minLevel: 'advanced' },
  ];

  // Project edits flow through the lead (Lead-as-master), so the project's own
  // editedBy is not stamped — "Last Edited By" is omitted here and authorship is
  // read from the Lead Record. createdBy is stamped on auto-create, so it stays.
  const projectSystemRows: KV[] | undefined = isProject
    ? [
        { label: 'Project Number', value: lead?.originalProjectPrefix ?? p?.prefix, minLevel: 'detailed' },
        { label: 'Created By', value: employeeUserName(p?.createdBy), minLevel: 'detailed' },
        { label: 'Created', value: fmtDateTime(p?.createdAt), minLevel: 'detailed' },
        { label: 'Last Edited', value: fmtDateTime(p?.updatedAt), minLevel: 'detailed' },
        { label: 'Project ID', value: lead?.projectId ?? p?.id, minLevel: 'advanced' },
        { label: 'Location Flag', value: p?.isLocationIncorrect ? 'Marked incorrect' : 'OK', minLevel: 'advanced' },
      ]
    : undefined;

  return {
    isProject,
    client: { companies, referrals, branches: Array.from(branchMap.values()), addresses: dedupAddresses },
    scope: { services, categories, subcategories, areaRows, points: Array.from(pointMap.values()) },
    commercials: {
      lead: { lines: leadLines, totals: sumLeadCommercials(lead) },
      ...(isProject && projectLines.length ? { project: { lines: projectLines, totals: sumProjectCommercials(p) } } : {}),
    },
    documents,
    notes,
    fileLocation,
    systemRows,
    projectSystemRows,
  };
};

// ── ONE tab set. Summary is the comprehensive "everything" page (lead → project
//    → company/contact → scope → commercials → docs → system). The operational
//    project modules (Tasks / Timesheet / Reimbursement) are promoted to their
//    own top-level tabs and only appear once the lead is a project. Audit is
//    always present. ─────────────────────────────────────────────────────────

export interface TabDef {
  key: string;
  label: string;
  icon: string;
  projectOnly?: boolean;
}

export const ENTITY_TABS: TabDef[] = [
  { key: 'summary', label: 'Summary', icon: 'bi bi-grid-1x2' },
  { key: 'tasks', label: 'Tasks', icon: 'bi bi-check2-square', projectOnly: true },
  { key: 'timesheet', label: 'Timesheet', icon: 'bi bi-stopwatch', projectOnly: true },
  { key: 'reimbursement', label: 'Reimbursement', icon: 'bi bi-wallet2', projectOnly: true },
  { key: 'documents', label: 'Documents', icon: 'bi bi-file-earmark-text' },
  { key: 'audit', label: 'Audit', icon: 'bi bi-file-earmark-diff' },
  { key: 'teams', label: 'Teams', icon: 'bi bi-people', projectOnly: true },
  { key: 'billing', label: 'Billing', icon: 'bi bi-receipt', projectOnly: true },
];
