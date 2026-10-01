import { resolveActiveOrg, resolveActiveOrgId } from '@utils/activeOrg';
import { useState, useEffect } from 'react';
import { Formik, FormikProps } from 'formik';
import { dateFormatter } from '@utils/date';
import Flatpickr from "react-flatpickr";
import { createCompanyOverview, fetchCompanyOverview, fetchOrganizationById, updateCompanyOverview } from '@services/company';
import { uploadCompanyAsset } from '@services/uploader';
import { successConfirmation, errorConfirmation } from '@utils/modal';
import { ICompanyOverview, IFormSection, IFormField } from "@models/company";
import { cloneDefaults, resolveFormSchema, buildValidationSchema, deriveCustomSections } from './formSchema';
import OrganisationInfo from './OrganisationInfo';
import FormSchemaManager from '@app/modules/common/components/FormSchemaManager';
import DragDropFileField from '@app/modules/common/components/DragDropFileField';
import { Box, Typography } from '@mui/material';
import eventBus from '@utils/EventBus';
import { WtDateField, WtField, WtButton, WtFormDialog, WtFormSection, WtFormSpan, WtImageField, AppIcon } from '@app/modules/common/components/ui';
import { KTIcon } from '@metronic/helpers';
import { loadAllEmployeesIfNeeded } from '@redux/slices/allEmployees';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@redux/store';
import { saveCurrentCompanyInfo } from '@redux/slices/company';
import { hasPermission } from '@utils/authAbac';
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from '@constants/statistics';

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

/** Per-section look, matching the Organization Info page's cards. Unknown (custom) sections fall back to blue. */
const SECTION_LOOK: Record<string, { icon: string; tone: string; description: string }> = {
    basic_info: { icon: 'bi bi-briefcase', tone: '#1E3A8A', description: 'Who the organization is and how to reach it' },
    govt: { icon: 'bi bi-file-earmark-text', tone: '#7C3AED', description: 'Registered and business addresses' },
    admin: { icon: 'bi bi-patch-check', tone: '#0D9488', description: 'Registrations and certificates' },
    tax: { icon: 'bi bi-receipt', tone: '#D97706', description: 'Tax identifiers used on documents' },
    bank: { icon: 'bi bi-bank', tone: '#16A34A', description: 'Where payments are made to' },
};
const lookOf = (id: string) => SECTION_LOOK[id] || { icon: 'bi bi-card-text', tone: '#2563EB', description: '' };
const titleCase = (s: string) => s.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
/** Long free-text fields take a full row. */
const isWide = (f: IFormField) => f.type === 'file' || /address|places/i.test(f.id) || /address/i.test(f.label);
const numericOnly = (v: string) => v.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
const uploadImage = async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    const { data: { path } } = await uploadCompanyAsset(fd);
    return path as string;
};

interface OrganisationProfileFormProps {
    /** When provided, the form reads/edits this specific organization. */
    organizationId?: string;
    /** When provided, a back button is rendered inline with the info header. */
    onBack?: () => void;
    /** When provided, a "Branches" button is shown beside Download PDF. */
    onBranchesClick?: () => void;
}

const OrganisationProfileForm = ({ organizationId, onBack, onBranchesClick }: OrganisationProfileFormProps = {}) => {
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
                if (!res || res.hasError) throw new Error('Failed to create organisation profile');
                successConfirmation('Successfully created organisation profile');
                setSchemaDirty(false);
            } else {
                if (!companyId) throw new Error('Company ID is missing');
                const res = await updateCompanyOverview(companyId, payload as any);
                if (!res || res.hasError) throw new Error('Failed to update organisation profile');
                successConfirmation('Successfully updated organisation profile');
                setSchemaDirty(false);
                // This REPLACES currentCompany rather than merging, so anything
                // this form does not own has to be carried through explicitly.
                // The 12/24h flag is owned by Settings > Date & Time now — read it
                // back off the store instead of writing a stale form value over it.
                dispatch(saveCurrentCompanyInfo({ ...storedCompany, id: companyId, name: values.name, fiscalYear: values.fiscalYear }) as any);
                setShowEditModal(false);
                eventBus.emit('organisationProfileUpdated');
            }
        } catch {
            errorConfirmation('Failed to create/update organisation profile');
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

        if (sys && field.id === 'fiscalYear') {
            const [from, to] = value ? value.split(' to ') : [];
            return (
                <WtField label={field.label} required={field.required} error={error} hint="Pick the first and last day of the year.">
                    {/* Styled to the same frame as the WtFields around it (Flatpickr renders its own input). */}
                    <Box sx={{
                        width: '100%',
                        '& input': {
                            width: '100%', height: 44, px: 1.75, fontSize: 14, fontFamily: 'inherit', color: 'text.primary',
                            bgcolor: 'background.paper', border: 1, borderColor: error ? 'error.main' : 'divider', borderRadius: '8px', outline: 'none',
                            transition: 'border-color .15s ease, box-shadow .15s ease',
                            '&:hover': { borderColor: 'text.primary' },
                            '&:focus': { borderColor: 'primary.main', boxShadow: (t: any) => `0 0 0 1px ${t.palette.primary.main}` },
                        },
                    }}>
                    <Flatpickr
                        value={from && to ? [new Date(from), new Date(to)] : []}
                        placeholder="Select a date range"
                        onChange={(d: Date[]) => {
                            if (d.length === 2) f.setFieldValue('fiscalYear', `${dateFormatter.format(d[0])} to ${dateFormatter.format(d[1])}`);
                        }}
                        onClose={() => f.setFieldTouched('fiscalYear', true)}
                        options={{ dateFormat: "Y-m-d", altInput: true, altFormat: "F j, Y", enableTime: false, mode: 'range' }}
                    />
                    </Box>
                </WtField>
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
                <Box>
                    <WtDateField label={field.label + (field.required ? ' *' : '')} value={value} onChange={set} />
                    {error && <Typography sx={{ fontSize: 12, color: 'error.main', mt: 0.5, ml: 1.75 }}>{error}</Typography>}
                </Box>
            );
        }
        const isNumber = field.type === 'number';
        const isEmail = /email/i.test(field.id);
        return (
            <WtField
                label={field.label}
                required={field.required}
                value={value}
                onChange={(v) => set(isNumber ? numericOnly(v) : v)}
                error={error}
                size="md"
                fullWidth
                type={isEmail ? 'email' : 'text'}
                inputMode={isNumber ? 'decimal' : isEmail ? 'email' : undefined}
                multiline={isWide(field)}
                minRows={isWide(field) ? 2 : undefined}
            />
        );
    };

    const canRead = hasPermission(resourceNameMapWithCamelCase.organisationProfile, permissionConstToUseWithHasPermission.readOthers);

    return (
        <>
            {canRead && <OrganisationInfo onEditClick={() => setShowEditModal(true)} organizationId={organizationId} onBack={onBack} onBranchesClick={onBranchesClick} />}

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
                        <WtFormDialog
                            open={showEditModal}
                            onClose={() => setShowEditModal(false)}
                            title={isCreate ? 'Set up organization profile' : 'Edit organization profile'}
                            subtitle={f.values.name || undefined}
                            icon={<KTIcon iconName="bank" className="fs-1" />}
                            headerAction={
                                <WtButton inverted size="small" onClick={() => setShowSchemaManager(true)} startIcon={<AppIcon name="bi-gear" className="fs-6" />}>
                                    Manage fields
                                </WtButton>
                            }
                            sections={[
                                { id: 'org-assets', title: 'Logo & Stamp', icon: 'bi bi-image' },
                                ...visibleSections.map(s => ({ id: `org-${s.id}`, title: titleCase(s.title), icon: lookOf(s.id).icon, invalid: hasError(s) })),
                            ]}
                            onSubmit={(e) => { e.preventDefault(); f.handleSubmit(); }}
                            submitLabel={isCreate ? 'Create profile' : 'Save changes'}
                            saving={loading}
                            dirty={f.dirty || schemaDirty}
                        >
                            <WtFormSection id="org-assets" title="Logo & Stamp" description="Shown on payslips, letters and the PDF profile" icon="bi bi-image" tone="#2563EB">
                                <WtImageField label="Organization logo" value={f.values.logo} onChange={(url) => f.setFieldValue('logo', url)} upload={uploadImage} />
                                <WtImageField label="Stamp" value={f.values.salaryStamp} onChange={(url) => f.setFieldValue('salaryStamp', url)} upload={uploadImage} />
                            </WtFormSection>

                            {/* Data-driven sections: order, titles and fields all come from formSchema. */}
                            {visibleSections.map(section => {
                                const look = lookOf(section.id);
                                const fields = section.fields.filter(fl => !fl.hidden);
                                return (
                                    <WtFormSection key={section.id} id={`org-${section.id}`} title={titleCase(section.title)} description={look.description || undefined} icon={look.icon} tone={look.tone}>
                                        {fields.map(field => (
                                            isWide(field)
                                                ? <WtFormSpan key={field.id}>{renderField(field, section.id, f)}</WtFormSpan>
                                                : <Box key={field.id} sx={{ minWidth: 0 }}>{renderField(field, section.id, f)}</Box>
                                        ))}
                                        {!fields.length && (
                                            <WtFormSpan>
                                                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                                                    No fields in this section yet. Use Manage fields to add some.
                                                </Typography>
                                            </WtFormSpan>
                                        )}
                                    </WtFormSection>
                                );
                            })}
                        </WtFormDialog>
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

export default OrganisationProfileForm;
