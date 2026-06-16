import * as Yup from 'yup';
import { ICustomSection, IFormSection, IFormField } from '@models/company';

// ─── Canonical, data-driven Organisation form schema ───────────────────────────
// Single source of truth shared by the Organisation EDIT form
// (OrganisationProfileForm) and the read-only Organization Info page
// (OrganisationInfo). System fields map 1:1 to DB columns; custom fields store
// their value inline. `showOnInfoPage` (undefined/true = shown) controls whether
// a field/section appears on the Organization Info page.

interface BuiltinFieldConfig { name: string; label: string; required: boolean; }
interface BuiltinSectionConfig { title: string; fields: BuiltinFieldConfig[]; }

export const BUILTIN_SECTION_CONFIGS: Record<string, BuiltinSectionConfig> = {
    basic_info: { title: 'BASIC INFORMATION', fields: [
        { name: 'name', label: 'Organisation Name', required: true },
        { name: 'fiscalYear', label: 'Fiscal Year', required: true },
        { name: 'contactNumber', label: 'Contact Number', required: true },
        { name: 'websiteUrl', label: 'Website URL', required: true },
        { name: 'businessType', label: 'Business Type', required: false },
        { name: 'founder', label: 'Founder', required: false },
    ]},
    govt: { title: 'GOVERNMENT & STATUTORY DETAILS', fields: [
        { name: 'address', label: 'Organisation Address', required: true },
        { name: 'additionalplacesofbusiness', label: 'Additional Places of Business', required: true },
        { name: 'gstNumber', label: 'GST Number', required: true },
        { name: 'foundedIn', label: 'Founded In', required: true },
    ]},
    admin: { title: 'ADMIN & CERTIFICATES', fields: [
        { name: 'certificateOfIncorporation', label: 'Certificate of Incorporation', required: true },
        { name: 'panNo', label: 'Pan Number', required: true },
        { name: 'tanNo', label: 'Tan Number', required: true },
    ]},
    tax: { title: 'TAX & BUSINESS DETAILS', fields: [
        { name: 'ptecCertificate', label: 'PTEC Certificate', required: true },
        { name: 'hsnSacNo', label: 'HSN/SAC Number', required: true },
    ]},
    bank: { title: 'BANK DETAILS', fields: [
        { name: 'beneficiaryName', label: 'Beneficiary Name', required: true },
        { name: 'bankNameAndAddress', label: 'Bank Name and Address', required: true },
        { name: 'ifscCode', label: 'IFSC Code', required: true },
        { name: 'accountNo', label: 'Account Number', required: true },
        { name: 'micrCode', label: 'MICR Code', required: true },
        { name: 'contactPerson', label: 'Contact Person', required: true },
        { name: 'accountantNo', label: 'Accountant Number', required: true },
    ]},
};

// Built from BUILTIN_SECTION_CONFIGS — the factory-default layout used when no
// saved sectionConfig exists yet, and as the reference for forward-compat merges.
export const DEFAULT_FORM_SECTIONS: IFormSection[] = Object.entries(BUILTIN_SECTION_CONFIGS).map(([key, cfg]) => ({
    id: key,
    title: cfg.title,
    isSystem: true,
    fields: cfg.fields.map(f => ({ id: f.name, label: f.label, type: 'text' as const, required: f.required, isSystem: true })),
}));

export const cloneDefaults = (): IFormSection[] => DEFAULT_FORM_SECTIONS.map(s => ({ ...s, fields: s.fields.map(f => ({ ...f })) }));

const defaultField = (sectionId: string, fieldId: string) =>
    DEFAULT_FORM_SECTIONS.find(s => s.id === sectionId)?.fields.find(f => f.id === fieldId);

// Merge a saved sectionConfig onto the current defaults so renamed sections, custom
// fields, reordering and type/required overrides survive, while any newly-shipped
// built-in field/section is still appended automatically (no migration needed).
export function mergeSavedSchema(saved: IFormSection[]): IFormSection[] {
    // Built-in fields are matched by global id (not by section), so admins can move
    // a built-in field into a different section and have it persist. A built-in that
    // was hidden stays in the config (flagged hidden) so it is NOT re-appended below.
    const validBuiltinIds = new Set<string>();
    const builtinDefaultSection = new Map<string, string>();
    DEFAULT_FORM_SECTIONS.forEach(s => s.fields.forEach(f => { validBuiltinIds.add(f.id); builtinDefaultSection.set(f.id, s.id); }));

    const result: IFormSection[] = [];
    const usedSectionIds = new Set<string>();
    const seenBuiltinIds = new Set<string>();

    saved.forEach(savedSec => {
        const base = DEFAULT_FORM_SECTIONS.find(d => d.id === savedSec.id);
        const fields: IFormField[] = [];
        savedSec.fields.forEach(sf => {
            if (sf.isSystem) {
                // keep any system field that still maps to a real column, wherever it now lives
                if (validBuiltinIds.has(sf.id) && !seenBuiltinIds.has(sf.id)) {
                    seenBuiltinIds.add(sf.id);
                    fields.push({ ...sf, isSystem: true });
                }
            } else {
                fields.push({ ...sf, isSystem: false, value: sf.value ?? '' });
            }
        });
        if (base) {
            usedSectionIds.add(base.id);
            result.push({ id: base.id, title: savedSec.title || base.title, isSystem: true, fields, showOnInfoPage: savedSec.showOnInfoPage });
        } else {
            result.push({ id: savedSec.id, title: savedSec.title, isSystem: false, fields, showOnInfoPage: savedSec.showOnInfoPage });
        }
    });

    // append any built-in section the saved config didn't know about, in default order
    DEFAULT_FORM_SECTIONS.forEach(d => { if (!usedSectionIds.has(d.id)) result.push({ ...d, fields: d.fields.map(f => ({ ...f })) }); });

    // append genuinely-new built-in fields (never seen in the saved config) into their
    // default section. Hidden built-ins were seen above, so they are not re-added here.
    DEFAULT_FORM_SECTIONS.forEach(d => d.fields.forEach(bf => {
        if (!seenBuiltinIds.has(bf.id)) {
            const target = result.find(r => r.id === (builtinDefaultSection.get(bf.id) ?? d.id));
            if (target) { target.fields.push({ ...bf }); seenBuiltinIds.add(bf.id); }
        }
    }));

    return result;
}

// One-time migration from the older `customSections` shape onto the defaults.
export function migrateLegacyCustomSections(legacy: ICustomSection[]): IFormSection[] {
    const sections = cloneDefaults();
    legacy.filter(cs => cs.builtinKey).forEach(cs => {
        const sec = sections.find(s => s.id === cs.builtinKey);
        if (!sec) return;
        (cs.systemOverrides ?? []).forEach(ov => {
            const f = sec.fields.find(ff => ff.id === ov.id);
            if (f) { f.type = (ov.type as any) ?? 'text'; f.required = ov.required; }
        });
        (cs.fields ?? []).forEach(cf => sec.fields.push({ id: cf.id, label: cf.label, type: (cf.type ?? 'text') as any, required: cf.required, isSystem: false, value: cf.value ?? '' }));
    });
    legacy.filter(cs => !cs.builtinKey).forEach(cs => {
        sections.push({ id: cs.id, title: cs.title, isSystem: false, fields: (cs.fields ?? []).map(cf => ({ id: cf.id, label: cf.label, type: (cf.type ?? 'text') as any, required: cf.required, isSystem: false, value: cf.value ?? '' })) });
    });
    return sections;
}

// Resolve the initial form schema for an existing company record.
export function resolveFormSchema(record: any): IFormSection[] {
    if (Array.isArray(record?.sectionConfig) && record.sectionConfig.length) return mergeSavedSchema(record.sectionConfig);
    if (Array.isArray(record?.customSections) && record.customSections.length) return migrateLegacyCustomSections(record.customSections);
    return cloneDefaults();
}

// Build a Yup schema dynamically so admin-toggled "required" flags are enforced.
export function buildValidationSchema(formSchema: IFormSection[]) {
    const shape: Record<string, any> = {
        // Logo & stamp are optional for now — the upload flow is being reworked and
        // organizations can be created/edited without them.
        logo: Yup.string(),
        salaryStamp: Yup.string(),
        superAdminEmail: Yup.string(),
        numberOfEmployees: Yup.string(),
    };
    formSchema.forEach(sec => sec.fields.forEach(f => {
        // Hidden built-in fields are not rendered, so they must not be validated/required.
        if (f.isSystem && !f.hidden) {
            let s = Yup.string();
            // Date fields must hold a valid date (the calendar picker enforces format,
            // this guards any stray/typed value too).
            if (f.type === 'date') s = s.test('valid-date', `${f.label} must be a valid date`, v => !v || !isNaN(Date.parse(v)));
            shape[f.id] = f.required ? s.required(`${f.label} is required`) : s;
        }
    }));
    return Yup.object(shape);
}

// Back-compat: derive the legacy `customSections` shape so any other reader keeps working.
export function deriveCustomSections(formSchema: IFormSection[]): ICustomSection[] {
    const out: ICustomSection[] = [];
    formSchema.forEach(sec => {
        const custom = sec.fields.filter(f => !f.isSystem).map(f => ({ id: f.id, label: f.label, type: f.type, required: f.required, value: f.value ?? '' }));
        if (sec.isSystem) {
            const overrides = sec.fields.filter(f => f.isSystem).filter(f => {
                const d = defaultField(sec.id, f.id);
                return d && (f.type !== 'text' || f.required !== d.required || f.label !== d.label);
            }).map(f => ({ id: f.id, type: f.type, required: f.required }));
            if (custom.length || overrides.length) out.push({ id: sec.id, title: sec.title, builtinKey: sec.id, fields: custom, systemOverrides: overrides.length ? overrides : undefined });
        } else if (sec.fields.length) {
            out.push({ id: sec.id, title: sec.title, fields: custom });
        }
    });
    return out;
}
