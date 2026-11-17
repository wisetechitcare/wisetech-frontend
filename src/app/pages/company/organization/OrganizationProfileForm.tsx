import { resolveActiveOrg, resolveActiveOrgId } from '@utils/activeOrg';
import { useState, useEffect } from 'react';
import { Formik, FormikProps } from 'formik';
import { parseDate } from '@internationalized/date';
import { Image as ImageIcon, Landmark, Settings } from 'lucide-react';
import { Button } from '@/ds/ui/button';
import { DatePicker } from '@/ds/ui/date-picker';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/ds/ui/field';
import { Input } from '@/ds/ui/input';
import { Textarea } from '@/ds/ui/textarea';
import { FormDialog } from '@/ds/patterns/form-dialog';
import { ImageField } from '@/ds/patterns/image-field';
import { createCompanyOverview, fetchCompanyOverview, fetchOrganizationById, updateCompanyOverview } from '@services/company';
import { uploadCompanyAsset } from '@services/uploader';
import { successConfirmation, errorConfirmation } from '@utils/modal';
import { ICompanyOverview, IFormSection, IFormField } from "@models/company";
import { cloneDefaults, resolveFormSchema, buildValidationSchema, deriveCustomSections } from './formSchema';
import OrganizationInfo, { isWideOrgField, orgSectionLook } from './OrganizationInfo';
import FormSchemaManager from '@app/modules/common/components/FormSchemaManager';
import DragDropFileField from '@app/modules/common/components/DragDropFileField';
import eventBus from '@utils/EventBus';
import { FiscalYearRangeField } from '@app/modules/common/components/ui';
import { toCanonicalFiscalYearRange } from '@utils/fiscalYearRange';
import { loadAllEmployeesIfNeeded } from '@redux/slices/allEmployees';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@redux/store';
import { saveCurrentCompanyInfo } from '@redux/slices/company';
import { canSection } from '@utils/can';

// The canonical form-schema helpers (defaults, merge, validation, legacy derive)
// live in ./formSchema so the Organization Info page renders from the same source.

// Safety-net default for the Super Admin Email. This field used to be editable on
// the standalone Admin Settings page; it now lives here as a built-in field. The main
// organization already has it configured, so this default only kicks in if an org's
// value is ever blank — keeping admin notifications/working from silently losing a recipient.
export const DEFAULT_SUPER_ADMIN_EMAIL = 'wisetechandassociates@gmail.com';

const initialValues: ICompanyOverview = {
    name: "",
    fiscalYear: "",
    logo: "",
    salaryStamp: "",
    contactNumber: "",
    foundedIn: "",
    gstNumber: "",
    numberOfEmployees: "",
    websiteUrl: "",
    address: "",
    superAdminEmail: "",
    certificateOfIncorporation: "",
    panNo: "",
    tanNo: "",
    ptecCertificate: "",
    hsnSacNo: "",
    beneficiaryName: '',
    bankNameAndAddress: '',
    ifscCode: '',
    accountNo: '',
    micrCode: '',
    contactPerson: '',
    accountantNo: '',
    additionalplacesofbusiness: '',
    businessType: '',
    founder: '',
};

const FORM_ID = 'organization-profile';
/** Section descriptions in the editor (the info page has its own, shorter subtitles). */
const SECTION_DESCRIPTION: Record<string, string> = {
    basic_info: 'Who the organization is and how to reach it',
    govt: 'Registered and business addresses',
    admin: 'Registrations and certificates',
    tax: 'Tax identifiers used on documents',
    bank: 'Where payments are made to',
};
/** Logo and stamp go into the react-pdf profile, which renders PNG and JPEG only. */
const ASSET_TYPES = ['image/png', 'image/jpeg'];
const titleCase = (s: string) => s.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
const numericOnly = (v: string) => v.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
const uploadImage = async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    const { data: { path } } = await uploadCompanyAsset(fd);
    return path as string;
};
/** A stored ISO date as the kit picker's value; anything unreadable shows empty. */
const toCalendarDate = (v: string) => {
    try { return v ? parseDate(v.slice(0, 10)) : null; } catch { return null; }
};

interface OrganizationProfileFormProps {
    /** When provided, the form reads/edits this specific organization. */
    organizationId?: string;
    /** When provided, a back button is rendered inline with the info header. */
    onBack?: () => void;
    /** When provided, a "Branches" button is shown beside Download PDF. */
    onBranchesClick?: () => void;
}

const OrganizationProfileForm = ({ organizationId, onBack, onBranchesClick }: OrganizationProfileFormProps = {}) => {
    const dispatch = useDispatch<AppDispatch>();
    const [loading, setLoading] = useState(false);
    const [isCreate, setIsCreate] = useState<boolean>(true);
    const [companyId, setCompanyId] = useState('');
    const [showEditModal, setShowEditModal] = useState<boolean>(false);
    const [showSchemaManager, setShowSchemaManager] = useState(false);
    const [formSchema, setFormSchema] = useState<IFormSection[]>(cloneDefaults());
    const [schemaDirty, setSchemaDirty] = useState(false);
    const [customErrors, setCustomErrors] = useState<Record<string, string>>({});
    const [formInitialValues, setFormInitialValues] = useState<ICompanyOverview>(initialValues);

    const allEmployees = useSelector((state: RootState) => state.allEmployees?.list.length || 0);
    // Preserved verbatim on save — see the dispatch below.
    const storedCompany = useSelector((state: RootState) => (state as any)?.company?.currentCompany);

    useEffect(() => {
        dispatch(loadAllEmployeesIfNeeded());
    }, [dispatch]);

    // Load the record each time the editor opens, so it always starts from what is saved.
    useEffect(() => {
        if (!showEditModal) return;
        (async () => {
            try {
                const { data: { companyOverview } } = organizationId
                    ? await fetchOrganizationById(organizationId)
                    : await fetchCompanyOverview();
                const org = resolveActiveOrg(companyOverview);
                if (!org) return;
                setIsCreate(false);
                setCompanyId(resolveActiveOrgId(companyOverview) ?? '');
                // Resolve the data-driven form layout (saved config → legacy → defaults)
                setFormSchema(resolveFormSchema(org));
                setSchemaDirty(false);
                setCustomErrors({});

                const next: ICompanyOverview = { ...initialValues };
                (Object.keys(next) as Array<keyof ICompanyOverview>).forEach((key) => {
                    if (Object.prototype.hasOwnProperty.call(org, key) && key !== 'numberOfEmployees') {
                        next[key] = (org[key] || '') as any;
                        // Fall back to the default Super Admin Email if this org has none configured.
                        if (key === 'superAdminEmail' && !next[key]) next[key] = DEFAULT_SUPER_ADMIN_EMAIL as any;
                    }
                });
                next.numberOfEmployees = allEmployees.toString();
                setFormInitialValues(next);
            } catch {
                errorConfirmation('Failed to fetch company details');
            }
        })();
    }, [showEditModal, organizationId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Update a custom field's stored value (built-in field values live in Formik)
    function updateCustomValue(sectionId: string, fieldId: string, value: string) {
        setSchemaDirty(true);
        setFormSchema(prev => prev.map(s =>
            s.id === sectionId ? { ...s, fields: s.fields.map(f => f.id === fieldId ? { ...f, value } : f) } : s
        ));
        if (customErrors[fieldId]) setCustomErrors(prev => { const n = { ...prev }; delete n[fieldId]; return n; });
    }

    // Validate required custom fields (Formik only tracks built-in columns)
    function validateCustomFields(): boolean {
        const errs: Record<string, string> = {};
        formSchema.forEach(sec => sec.fields.forEach(f => {
            if (f.isSystem || f.hidden) return;
            const val = (f.value ?? '').trim();
            if (f.required && !val) errs[f.id] = `${f.label} is required`;
            else if (f.type === 'date' && val && isNaN(Date.parse(val))) errs[f.id] = `${f.label} must be a valid date`;
        }));
        setCustomErrors(errs);
        return Object.keys(errs).length === 0;
    }

    const handleSave = async (values: ICompanyOverview) => {
        if (!validateCustomFields()) return;
        setLoading(true);
        const payload = { ...values, sectionConfig: formSchema, customSections: deriveCustomSections(formSchema) };
        try {
            if (isCreate) {
                const res = await createCompanyOverview(payload as any);
                if (!res || res.hasError) throw new Error('Failed to create organization profile');
                successConfirmation('Successfully created organization profile');
                setSchemaDirty(false);
            } else {
                if (!companyId) throw new Error('Company ID is missing');
                const res = await updateCompanyOverview(companyId, payload as any);
                if (!res || res.hasError) throw new Error('Failed to update organization profile');
                successConfirmation('Successfully updated organization profile');
                setSchemaDirty(false);
                // This REPLACES currentCompany rather than merging, so anything
                // this form does not own has to be carried through explicitly.
                // The 12/24h flag is owned by Settings > Date & Time now — read it
                // back off the store instead of writing a stale form value over it.
                dispatch(saveCurrentCompanyInfo({ ...storedCompany, id: companyId, name: values.name, fiscalYear: values.fiscalYear }) as any);
                setShowEditModal(false);
                eventBus.emit('organizationProfileUpdated');
            }
        } catch {
            errorConfirmation('Failed to create/update organization profile');
        } finally {
            setLoading(false);
        }
    };

    /** One field, drawn from the schema. System fields bind to Formik; custom fields to the schema's own value. */
    const renderField = (field: IFormField, sectionId: string, f: FormikProps<ICompanyOverview>) => {
        const sys = field.isSystem;
        const value: string = sys ? ((f.values as any)[field.id] ?? '') : (field.value ?? '');
        const set = (v: string) => (sys ? f.setFieldValue(field.id, v) : updateCustomValue(sectionId, field.id, v));
        const formikError = (f.touched as any)[field.id] || f.submitCount > 0 ? (f.errors as any)[field.id] : undefined;
        const error: string | undefined = sys ? formikError : customErrors[field.id];
        const id = `org-field-${field.id}`;

        if (sys && field.id === 'fiscalYear') {
            return (
                <FiscalYearRangeField
                    value={toCanonicalFiscalYearRange(value) || value}
                    onChange={(next) => f.setFieldValue('fiscalYear', next)}
                    onBlur={() => f.setFieldTouched('fiscalYear', true)}
                    required={field.required}
                    error={Boolean(error)}
                    helperText={error || 'Pick the first and last day of the year.'}
                />
            );
        }
        if (field.type === 'file') {
            return (
                <DragDropFileField
                    label={field.label}
                    required={field.required}
                    currentFileUrl={value}
                    currentFileName={value ? String(value).split('/').pop() : ''}
                    uploadFn={uploadCompanyAsset}
                    onChange={(url) => set(url)}
                />
            );
        }
        if (field.type === 'date') {
            return (
                <DatePicker
                    label={field.label}
                    isRequired={field.required}
                    value={toCalendarDate(value)}
                    onChange={(d) => set(d ? d.toString() : '')}
                    isInvalid={Boolean(error)}
                    errorMessage={error}
                />
            );
        }
        const isNumber = field.type === 'number';
        const isEmail = /email/i.test(field.id);
        const wide = isWideOrgField(field);
        const common = {
            id,
            value,
            required: field.required,
            'aria-invalid': Boolean(error) || undefined,
            'aria-describedby': error ? `${id}-error` : undefined,
        };
        return (
            <Field data-invalid={Boolean(error) || undefined}>
                <FieldLabel htmlFor={id}>{field.label}</FieldLabel>
                {wide ? (
                    <Textarea {...common} rows={2} onChange={(e) => set(e.target.value)} />
                ) : (
                    <Input
                        {...common}
                        type={isEmail ? 'email' : 'text'}
                        inputMode={isNumber ? 'decimal' : isEmail ? 'email' : undefined}
                        onChange={(e) => set(isNumber ? numericOnly(e.target.value) : e.target.value)}
                    />
                )}
                {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
            </Field>
        );
    };

    // Read on Organization Profile shows it (editing stays behind Write, in OrganizationInfo). This was
    // a `readOthers` check, which means Write — a Read-only person got a blank page.
    const canRead = canSection('settings.profile', 'read');

    return (
        <>
            {canRead && <OrganizationInfo onEditClick={() => setShowEditModal(true)} organizationId={organizationId} onBack={onBack} onBranchesClick={onBranchesClick} />}

            <Formik
                initialValues={formInitialValues}
                enableReinitialize
                validationSchema={buildValidationSchema(formSchema)}
                onSubmit={handleSave}
            >
                {(f) => {
                    const visibleSections = formSchema;
                    const hasError = (s: IFormSection) => s.fields.some(fl =>
                        fl.isSystem ? f.submitCount > 0 && !!(f.errors as any)[fl.id] : !!customErrors[fl.id]);
                    return (
                        <FormDialog
                            open={showEditModal}
                            onOpenChange={(open) => { if (!open) setShowEditModal(false); }}
                            title={isCreate ? 'Set up organization profile' : 'Edit organization profile'}
                            description={f.values.name || undefined}
                            icon={<Landmark aria-hidden />}
                            size="xl"
                            sections={[
                                { id: 'org-assets', label: 'Logo & stamp', icon: <ImageIcon aria-hidden /> },
                                ...visibleSections.map(s => ({ id: `org-${s.id}`, label: titleCase(s.title), icon: orgSectionLook(s.id).icon, invalid: hasError(s) })),
                            ]}
                            formId={FORM_ID}
                            submitLabel={isCreate ? 'Create profile' : 'Save changes'}
                            submitting={loading}
                            dirty={f.dirty || schemaDirty}
                        >
                            <form id={FORM_ID} noValidate onSubmit={(e) => { e.preventDefault(); f.handleSubmit(); }} className="space-y-8">
                                {/* In the body (not the footer) so it is there on a phone too. */}
                                <div className="flex justify-end">
                                    <Button type="button" variant="inverted" size="sm" onClick={() => setShowSchemaManager(true)}>
                                        <Settings data-icon="inline-start" aria-hidden /> Manage fields
                                    </Button>
                                </div>

                                <section id="org-assets" className="scroll-mt-4">
                                    <FieldSet>
                                        <FieldLegend>Logo &amp; stamp</FieldLegend>
                                        <FieldDescription>Shown on payslips, letters and the PDF profile</FieldDescription>
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <ImageField
                                                id="org-logo"
                                                label="Organization logo"
                                                value={f.values.logo || null}
                                                onChange={(url) => f.setFieldValue('logo', url ?? '')}
                                                upload={uploadImage}
                                                accept={ASSET_TYPES}
                                                maxSizeMB={5}
                                            />
                                            <ImageField
                                                id="org-stamp"
                                                label="Stamp"
                                                value={f.values.salaryStamp || null}
                                                onChange={(url) => f.setFieldValue('salaryStamp', url ?? '')}
                                                upload={uploadImage}
                                                accept={ASSET_TYPES}
                                                maxSizeMB={5}
                                            />
                                        </div>
                                    </FieldSet>
                                </section>

                                {/* Data-driven sections: order, titles and fields all come from formSchema. */}
                                {visibleSections.map(section => {
                                    const fields = section.fields.filter(fl => !fl.hidden);
                                    const description = SECTION_DESCRIPTION[section.id];
                                    return (
                                        <section key={section.id} id={`org-${section.id}`} className="scroll-mt-4">
                                            <FieldSet>
                                                <FieldLegend>{titleCase(section.title)}</FieldLegend>
                                                {description && <FieldDescription>{description}</FieldDescription>}
                                                <FieldGroup className="grid gap-4 sm:grid-cols-2">
                                                    {fields.map(field => (
                                                        <div key={field.id} className={isWideOrgField(field) ? 'min-w-0 sm:col-span-2' : 'min-w-0'}>
                                                            {renderField(field, section.id, f)}
                                                        </div>
                                                    ))}
                                                    {!fields.length && (
                                                        <p className="text-sm text-muted-foreground sm:col-span-2">
                                                            No fields in this section yet. Use Manage fields to add some.
                                                        </p>
                                                    )}
                                                </FieldGroup>
                                            </FieldSet>
                                        </section>
                                    );
                                })}
                            </form>
                        </FormDialog>
                    );
                }}
            </Formik>

            <FormSchemaManager
                show={showSchemaManager}
                sections={formSchema}
                onSave={(sections) => {
                    setFormSchema(sections);
                    setSchemaDirty(true);
                    setShowSchemaManager(false);
                }}
                onClose={() => setShowSchemaManager(false)}
            />
        </>
    );
};

export default OrganizationProfileForm;
