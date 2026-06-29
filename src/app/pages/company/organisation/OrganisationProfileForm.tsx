import { resolveActiveOrg, resolveActiveOrgId } from '@utils/activeOrg';
﻿import { useState, useEffect, ChangeEvent } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import { dateFormatter } from '@utils/date';
import Flatpickr from "react-flatpickr";
import { createCompanyOverview, fetchCompanyLogo, fetchCompanyOverview, fetchOrganizationById, updateCompanyOverview } from '@services/company';
import { uploadCompanyAsset } from '@services/uploader';
import { successConfirmation, errorConfirmation } from '@utils/modal';
import { ICompanyOverview, IFormSection, IFormField } from "@models/company";
import { cloneDefaults, resolveFormSchema, buildValidationSchema, deriveCustomSections } from './formSchema';
import { Modal, Row, Col } from 'react-bootstrap';
import OrganisationInfo from './OrganisationInfo';
import FormSchemaManager from '@app/modules/common/components/FormSchemaManager';
import DragDropFileField from '@app/modules/common/components/DragDropFileField';
import { IconGear } from '@app/modules/common/components/icons/OrgIcons';
import { Box, IconButton, Typography } from '@mui/material';
import { Close } from '@mui/icons-material';
import eventBus from '@utils/EventBus';
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

// Initial Values setup (consistent with Overview)
const initialValues: ICompanyOverview = {
    name: "",
    fiscalYear: "",
    logo: "", // Expecting a string path
    salaryStamp: "", // Updated field name to match database column
    // workingDays: "", // Commented out - not being used in the app
    // workingHrs: "", // Commented out - not being used in the app
    showDateIn12HourFormat: "0",
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
    beneficiaryName:'',
    bankNameAndAddress:'',
    ifscCode:'',
    accountNo:'',
    micrCode:'',
    contactPerson:'',
    accountantNo:'',
    additionalplacesofbusiness:'',
    businessType:'',
    founder:'',


    // state: "", // Commented out state
    // city: "", // Commented out city
    // postalCode: "" // Commented out postal code
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
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [stampPreview, setStampPreview] = useState<string | null>(null); // Added state for stamp preview
    const [loading, setLoading] = useState(false);
    const [isCreate, setIsCreate] = useState<boolean>(true);
    const [companyId, setCompanyId] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [stampUrl, setStampUrl] = useState('');
    const [showEditModal, setShowEditModal] = useState<boolean>(false);
    const [showSchemaManager, setShowSchemaManager] = useState(false);
    const [formSchema, setFormSchema] = useState<IFormSection[]>(cloneDefaults());
    const [schemaDirty, setSchemaDirty] = useState(false);
    const [customErrors, setCustomErrors] = useState<Record<string, string>>({});
    const [companyData, setCompanyData] = useState<ICompanyOverview | null>(null);
    const [formInitialValues, setFormInitialValues] = useState<ICompanyOverview>(initialValues);

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

    const allEmployees = useSelector((state: RootState) => state.allEmployees?.list.length || 0);

    // Handler for logo file upload
    const handleLogoChange = async (event: ChangeEvent<HTMLInputElement>, setFieldValue: (field: string, value: any) => void) => {
        const file = event.currentTarget.files?.[0];
        if (file) {
            try {
                // Upload file to the server or cloud storage
                const formData = new FormData();
                formData.append('file', file);

                const uploadResponse = await uploadCompanyAsset(formData); // Assuming this API returns the path
                const { data: { path } } = uploadResponse;

                setLogoPreview(URL.createObjectURL(file));
                setFieldValue('logo', path); // Set the path string instead of the file object
            } catch (error) {
                errorConfirmation('Failed to upload the logo');
            }
        }
    };

    // Separate handler for stamp file upload
    const handleStampChange = async (event: ChangeEvent<HTMLInputElement>, setFieldValue: (field: string, value: any) => void) => {
        const file = event.currentTarget.files?.[0];
        if (file) {
            try {
                // Upload file to the server or cloud storage
                const formData = new FormData();
                formData.append('file', file);

                const uploadResponse = await uploadCompanyAsset(formData);
                const { data: { path } } = uploadResponse;

                setStampPreview(URL.createObjectURL(file));
                setFieldValue('salaryStamp', path); // Updated field name to match database column
            } catch (error) {
                errorConfirmation('Failed to upload the salary stamp');
            }
        }
    };
 
    // get logo and stamp url to download and set previews.
    // Only valid for the default/active org — fetchCompanyLogo() returns the default
    // company's assets, so skip it when viewing a specific organization (its own
    // logo/stamp come from the record loaded in the edit modal's fetchCompanyDetails).
    useEffect(()=>{
        if (organizationId) return;
        const getUrl = async ()=>{
            const ALLUrl = await fetchCompanyLogo();
            const fetchedLogoUrl = ALLUrl?.data?.logo;
            const fetchedStampUrl = ALLUrl?.data?.salaryStamp;

            setLogoUrl(fetchedLogoUrl);
            setStampUrl(fetchedStampUrl);

            // Set preview images for edit mode
            if (fetchedLogoUrl) {
                setLogoPreview(fetchedLogoUrl);
            }
            if (fetchedStampUrl) {
                setStampPreview(fetchedStampUrl);
            }
        }
        getUrl()
    },[organizationId])


    const downloadImage = async (imageUrl: string, filename: string) => {
        try {
            const response = await fetch(imageUrl, {
                mode: 'cors',
            });
    
            if (!response.ok) {
                throw new Error('Failed to fetch image');
            }
    
            const blob = await response.blob();
    
            // Detect MIME type and force correct extension
            const mimeType = blob.type;
            const extension = mimeType.includes('jpeg') ? '.jpg' : mimeType.includes('png') ? '.png' : '';
            const finalName = filename.endsWith(extension) ? filename : filename.replace(/\.[^/.]+$/, "") + extension;
    
            const blobUrl = window.URL.createObjectURL(blob);
    
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = finalName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error("Download failed:", error);
            errorConfirmation('Failed to download image');
        }
    };

    useEffect(() => {
        dispatch(loadAllEmployeesIfNeeded());
    }, [dispatch]);
    
    // Show OrganisationInfo component by default with edit modal
    return (
        <>
        {hasPermission(resourceNameMapWithCamelCase.organisationProfile, permissionConstToUseWithHasPermission.readOthers) && <OrganisationInfo onEditClick={() => setShowEditModal(true)} organizationId={organizationId} onBack={onBack} onBranchesClick={onBranchesClick} />}
            

            {/* Edit Modal */}
            <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="xl" centered>
                <Box sx={{ position: "relative", backgroundColor: "#F3F4F7", p: { xs: 0, md: 3 } }}>
                    <IconButton
                        onClick={() => setShowEditModal(false)}
                        sx={{
                            position: "absolute",
                            right: 8,
                            top: 8,
                            color: "text.secondary",
                        }}
                    >
                        <Close />
                    </IconButton>
                    <Typography
                        variant="h6"
                        component="h2"
                        sx={{ fontWeight: 600, pl: { xs: 2, md: 0 }, pt: { xs: 1, md: 0 } }}
                        style={{
                            fontSize: "20px",
                            fontFamily: "Barlow",
                            fontWeight: "600",
                        }}
                    >
                        Edit Organization Profile
                    </Typography>
                    <Modal.Header></Modal.Header>
                    <Modal.Body>

                    <Formik
                    initialValues={formInitialValues}
                    enableReinitialize={true}
                    validationSchema={buildValidationSchema(formSchema)}
                    onSubmit={async (values, { resetForm }) => {
                        if (!validateCustomFields()) return;
                        setLoading(true);
                        const payload = { ...values, sectionConfig: formSchema, customSections: deriveCustomSections(formSchema) };
                        try {
                            if (isCreate) {
                                const res = await createCompanyOverview(payload as any);
                                if (res && !res.hasError) {
                                    successConfirmation('Successfully created organisation profile');
                                    setSchemaDirty(false);
                                    setLoading(false);
                                    // resetForm();
                                } else {
                                    throw new Error('Failed to create organisation profile');
                                }
                            }
                            else {
                                if (!companyId) {
                                    throw new Error('Company ID is missing');
                                }
                                const res = await updateCompanyOverview(companyId, payload as any);
                                if (res && !res.hasError) {
                                    successConfirmation('Successfully updated organisation profile');
                                    setSchemaDirty(false);
                                    setCompanyData(values);

                                    // Update Redux store with new showDateIn12HourFormat value
                                    const currentCompanyInfo = {
                                        id: companyId,
                                        name: values.name,
                                        fiscalYear: values.fiscalYear,
                                        showDateIn12HourFormat: values.showDateIn12HourFormat
                                    };
                                    dispatch(saveCurrentCompanyInfo(currentCompanyInfo) as any);

                                    setShowEditModal(false);
                                    setLoading(false);
                                    eventBus.emit('organisationProfileUpdated');
                                    // resetForm();
                                } else {
                                    throw new Error('Failed to update organisation profile');
                                }
                            }
                        } catch (error) {
                            errorConfirmation('Failed to create/update organisation profile');
                            setLoading(false);
                        }
                    }}
                >
                    {function ShowForm({ isSubmitting, isValid, dirty, setFieldValue, setFieldTouched, values }) {
                        // Set number of employees from allEmployees count
                        // useEffect(() => {
                        //     setFieldValue('numberOfEmployees', allEmployees.toString());
                        // }, [allEmployees, setFieldValue]);

                        useEffect(() => {
                            async function fetchCompanyDetails() {
                                try {
                                    const { data: { companyOverview } } = organizationId
                                        ? await fetchOrganizationById(organizationId)
                                        : await fetchCompanyOverview();
                                    if (resolveActiveOrg(companyOverview)) {
                                        setIsCreate(false);
                                        setCompanyId((resolveActiveOrgId(companyOverview) ?? ''));
                                        setCompanyData(resolveActiveOrg(companyOverview));

                                        // Resolve the data-driven form layout (saved config → legacy → defaults)
                                        setFormSchema(resolveFormSchema(resolveActiveOrg(companyOverview)));
                                        setSchemaDirty(false);

                                        // Create new initial values object with fetched data
                                        const newInitialValues: ICompanyOverview = { ...initialValues };
                                        (Object.keys(newInitialValues) as Array<keyof ICompanyOverview>).forEach((key) => {
                                            if(key?.toString()=="showDateIn12HourFormat"){
                                                newInitialValues[key] = (resolveActiveOrg(companyOverview)[key] ? "1" : "0") as any;
                                            }
                                            else if (resolveActiveOrg(companyOverview).hasOwnProperty(key) && key !== 'numberOfEmployees') {
                                                newInitialValues[key] = (resolveActiveOrg(companyOverview)[key] || '') as any;
                                                // Fall back to the default Super Admin Email if this org has none configured.
                                                if (key === 'superAdminEmail' && !newInitialValues[key]) {
                                                    newInitialValues[key] = DEFAULT_SUPER_ADMIN_EMAIL as any;
                                                }
                                            }
                                        });
                                        // Override numberOfEmployees with current allEmployees count
                                        newInitialValues.numberOfEmployees = allEmployees.toString();

                                        setFormInitialValues(newInitialValues);
                                    }
                                } catch (error) {
                                    errorConfirmation('Failed to fetch company details');
                                }
                            }
                            fetchCompanyDetails();
                        }, [isCreate]);

                        // Unified field renderer — drives every section from formSchema.
                        // System fields bind to Formik (their value maps to a DB column);
                        // custom fields bind to the schema's inline value.
                        const renderField = (field: IFormField, sectionId: string) => {
                            const reqCls = field.required ? 'required' : '';

                            // ── System fields ──────────────────────────────────────────
                            if (field.isSystem) {
                                // Special widget: fiscal year date-range picker
                                if (field.id === 'fiscalYear') {
                                    return (
                                        <>
                                            <label className={`${reqCls} col-form-label fw-bold fs-6`}>{field.label}</label>
                                            <Flatpickr
                                                value={values.fiscalYear ? [new Date(values.fiscalYear.split(' to ')[0]), new Date(values.fiscalYear.split(' to ')[1])] : []}
                                                className='form-control form-control-solid'
                                                placeholder="Set fiscal year"
                                                onChange={(selectedDates: Date[]) => {
                                                    if (selectedDates.length === 2) {
                                                        setFieldValue('fiscalYear', `${dateFormatter.format(selectedDates[0])} to ${dateFormatter.format(selectedDates[1])}`);
                                                        setFieldTouched('fiscalYear', false);
                                                    }
                                                }}
                                                onOpen={() => setFieldTouched('fiscalYear', true)}
                                                options={{ dateFormat: "Y-m-d", altInput: true, altFormat: "F j, Y", enableTime: false, mode: 'range' }}
                                            />
                                            <ErrorMessage name="fiscalYear">{msg => <div className="fv-plugins-message-container"><div className="fv-help-block">{msg}</div></div>}</ErrorMessage>
                                        </>
                                    );
                                }
                                if (field.type === 'file') {
                                    return (
                                        <DragDropFileField label={field.label} required={field.required}
                                            currentFileUrl={(values as any)[field.id]}
                                            currentFileName={(values as any)[field.id] ? String((values as any)[field.id]).split('/').pop() : ''}
                                            uploadFn={uploadCompanyAsset}
                                            onChange={(url) => setFieldValue(field.id, url)} />
                                    );
                                }
                                // Number built-in field: text input + strict numeric filter (reliable
                                // across browsers — Firefox lets type="number" accept letters).
                                if (field.type === 'number') {
                                    return (
                                        <>
                                            <label className={`${reqCls} col-form-label fw-bold fs-6`}>{field.label}</label>
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                className="form-control form-control-lg form-control-solid"
                                                placeholder={field.label}
                                                value={(values as any)[field.id] ?? ''}
                                                onChange={e => {
                                                    const next = e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                                                    setFieldValue(field.id, next);
                                                }}
                                            />
                                            <ErrorMessage name={field.id}>{msg => <div className="fv-plugins-message-container"><div className="fv-help-block">{msg}</div></div>}</ErrorMessage>
                                        </>
                                    );
                                }
                                // Date built-in field: native calendar picker (validates the date itself).
                                if (field.type === 'date') {
                                    return (
                                        <>
                                            <label className={`${reqCls} col-form-label fw-bold fs-6`}>{field.label}</label>
                                            <input
                                                type="date"
                                                className="form-control form-control-lg form-control-solid"
                                                value={(values as any)[field.id] ?? ''}
                                                onChange={e => setFieldValue(field.id, e.target.value)}
                                            />
                                            <ErrorMessage name={field.id}>{msg => <div className="fv-plugins-message-container"><div className="fv-help-block">{msg}</div></div>}</ErrorMessage>
                                        </>
                                    );
                                }
                                return (
                                    <>
                                        <label className={`${reqCls} col-form-label fw-bold fs-6`}>{field.label}</label>
                                        <Field name={field.id} type="text" className="form-control form-control-lg form-control-solid" placeholder={field.label} />
                                        <ErrorMessage name={field.id}>{msg => <div className="fv-plugins-message-container"><div className="fv-help-block">{msg}</div></div>}</ErrorMessage>
                                    </>
                                );
                            }

                            // ── Custom fields ──────────────────────────────────────────
                            if (field.type === 'file') {
                                return (
                                    <DragDropFileField label={field.label} required={field.required}
                                        currentFileUrl={field.value}
                                        currentFileName={field.value ? field.value.split('/').pop() : ''}
                                        uploadFn={uploadCompanyAsset}
                                        onChange={(url) => updateCustomValue(sectionId, field.id, url)} />
                                );
                            }
                            if (field.type === 'date') {
                                return (
                                    <>
                                        <label className={`${reqCls} col-form-label fw-bold fs-6`}>{field.label}</label>
                                        <input
                                            type="date"
                                            className="form-control form-control-lg form-control-solid"
                                            value={field.value ?? ''}
                                            onChange={e => updateCustomValue(sectionId, field.id, e.target.value)}
                                        />
                                        {customErrors[field.id] && <div className="fv-plugins-message-container"><div className="fv-help-block">{customErrors[field.id]}</div></div>}
                                    </>
                                );
                            }
                            const isNumber = field.type === 'number';
                            return (
                                <>
                                    <label className={`${reqCls} col-form-label fw-bold fs-6`}>{field.label}</label>
                                    <input
                                        // Always a text input; for number fields we strip non-numeric input
                                        // ourselves. This is reliable everywhere (Firefox lets type="number"
                                        // accept letters while reporting an empty value).
                                        type="text"
                                        inputMode={isNumber ? 'decimal' : undefined}
                                        className="form-control form-control-lg form-control-solid"
                                        placeholder={field.label}
                                        value={field.value ?? ''}
                                        onChange={e => {
                                            const next = isNumber ? e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1') : e.target.value;
                                            updateCustomValue(sectionId, field.id, next);
                                        }}
                                    />
                                    {customErrors[field.id] && <div className="fv-plugins-message-container"><div className="fv-help-block">{customErrors[field.id]}</div></div>}
                                </>
                            );
                        };

                        return (<Form className="form">
                                    {/* ⚙ Schema manager trigger */}
                                    <div className="d-flex justify-content-end mb-2">
                                        <button type="button" onClick={() => setShowSchemaManager(true)}
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#fff', border: '1.5px solid #9D4141', borderRadius: '8px', padding: '6px 16px', color: '#9D4141', fontWeight: 700, fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                            <i className="bi bi-gear-fill" style={{ fontSize: '15px', lineHeight: 1 }} />
                                            <span>Manage Form Fields</span>
                                        </button>
                                    </div>

                                    {/* LOGO & STAMP */}
                                    <div className="mb-4">
                                        <fieldset style={{ borderTop: "1px solid #9D4141", padding: "clamp(14px, 2vw, 15px)" }} className="mt-7">
                                            <legend style={{ fontSize: "17px", fontWeight: 600, fontFamily: "Inter", marginTop: "-25px", marginLeft: "-17px", backgroundColor: "#F3F4F7", width: "auto", lineHeight: "1", letterSpacing: 0, color: "#9D4141", padding: "2px 2px 8px", display: "flex", alignItems: "center", gap: "8px" }}>
                                                <div className="ms-5" style={{ borderTop: "1px solid #9D4141", width: "30px", height: "0px" }}></div>
                                                LOGO & STAMP
                                            </legend>
                                            <div className="card-body card responsive-card p-md-10 p-3">
                                                <div className="d-flex gap-3 flex-wrap">
                                                    {/* Organization Logo */}
                                                    <div className="d-flex gap-3 align-items-center flex-grow-1" style={{ minHeight: '72px' }}>
                                                        <div style={{ width: '64px', height: '64px', flexShrink: 0, borderRadius: '50%', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                                                            {(logoPreview || values.logo) ? (
                                                                <img src={logoPreview || values.logo} alt="Logo Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            ) : (
                                                                <div style={{ width: '100%', height: '100%', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                    <i className="fa fa-image" style={{ color: '#9ca3af', fontSize: '24px' }}></i>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="d-flex flex-column gap-1">
                                                            <div className="d-flex flex-column" style={{ gap: '3px' }}>
                                                                <p style={{ fontFamily: 'Inter', fontSize: '14px', fontWeight: 500, color: '#000', margin: 0, lineHeight: 'normal' }}>Organization Logo</p>
                                                                <p style={{ fontFamily: 'Inter', fontSize: '13px', fontWeight: 400, color: '#7a8597', margin: 0, lineHeight: '1.56' }}>PNG or JPG Format only, and not more than 5MB</p>
                                                            </div>
                                                            <div className="d-flex gap-3" style={{ fontFamily: 'Inter', fontSize: '14px', fontWeight: 500, color: '#9d4141' }}>
                                                                <label style={{ cursor: 'pointer', margin: 0 }}>
                                                                    Remove
                                                                    <input
                                                                        type="button"
                                                                        className="d-none"
                                                                        onClick={() => {
                                                                            setLogoPreview(null);
                                                                            setFieldValue('logo', '');
                                                                        }}
                                                                    />
                                                                </label>
                                                                <label style={{ cursor: 'pointer', margin: 0 }}>
                                                                    Change
                                                                    <input
                                                                        type="file"
                                                                        accept="image/*"
                                                                        className="d-none"
                                                                        onChange={(event) => handleLogoChange(event, setFieldValue)}
                                                                    />
                                                                </label>
                                                            </div>
                                                            <ErrorMessage name="logo">
                                                                {msg => <div className="fv-plugins-message-container"><div className="fv-help-block">{msg}</div></div>}
                                                            </ErrorMessage>
                                                        </div>
                                                    </div>

                                                    {/* Stamp */}
                                                    <div className="d-flex gap-3 align-items-center flex-grow-1" style={{ minHeight: '72px' }}>
                                                        <div style={{ width: '64px', height: '64px', flexShrink: 0, borderRadius: '50%', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                                                            {(stampPreview || values.salaryStamp) ? (
                                                                <img
                                                                    src={stampPreview || values.salaryStamp}
                                                                    alt="Stamp Preview"
                                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                                />
                                                            ) : (
                                                                <div style={{ width: '100%', height: '100%', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                    <i className="fa fa-image" style={{ color: '#9ca3af', fontSize: '24px' }}></i>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="d-flex flex-column gap-1">
                                                            <div className="d-flex flex-column" style={{ gap: '3px' }}>
                                                                <p style={{ fontFamily: 'Inter', fontSize: '14px', fontWeight: 500, color: '#000', margin: 0, lineHeight: 'normal' }}>
                                                                    Stamp
                                                                </p>
                                                                <p style={{ fontFamily: 'Inter', fontSize: '13px', fontWeight: 400, color: '#7a8597', margin: 0, lineHeight: '1.56' }}>
                                                                    PNG or JPG Format only, and not more than 5MB
                                                                </p>
                                                            </div>
                                                            <div className="d-flex gap-3" style={{ fontFamily: 'Inter', fontSize: '14px', fontWeight: 500, color: '#9d4141' }}>
                                                                <label style={{ cursor: 'pointer', margin: 0 }}>
                                                                    Remove
                                                                    <input
                                                                        type="button"
                                                                        className="d-none"
                                                                        onClick={() => {
                                                                            setStampPreview(null);
                                                                            setFieldValue('salaryStamp', '');
                                                                        }}
                                                                    />
                                                                </label>
                                                                <label style={{ cursor: 'pointer', margin: 0 }}>
                                                                    Change
                                                                    <input
                                                                        type="file"
                                                                        accept="image/*"
                                                                        className="d-none"
                                                                        onChange={(event) => handleStampChange(event, setFieldValue)}
                                                                    />
                                                                </label>
                                                            </div>
                                                            <ErrorMessage name="salaryStamp">
                                                                {msg => <div className="fv-plugins-message-container"><div className="fv-help-block">{msg}</div></div>}
                                                            </ErrorMessage>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </fieldset>
                                    </div>


                                    {/* DATA-DRIVEN SECTIONS (order, titles, fields all come from formSchema) */}
                                    {formSchema.map(section => (
                                        <div key={section.id} className="mb-4">
                                            <fieldset style={{ borderTop: "1px solid #9D4141", padding: "clamp(14px, 2vw, 15px)" }} className="mt-7">
                                                <legend style={{ fontSize: "17px", fontWeight: 600, fontFamily: "Inter", marginTop: "-25px", marginLeft: "-17px", backgroundColor: "#F3F4F7", width: "auto", lineHeight: "1", letterSpacing: 0, color: "#9D4141", padding: "2px 2px 8px", display: "flex", alignItems: "center", gap: "8px" }}>
                                                    <div className="ms-5" style={{ borderTop: "1px solid #9D4141", width: "30px", height: "0px" }}></div>
                                                    {section.title}
                                                </legend>
                                                <div className="card-body card responsive-card p-md-10 p-3">
                                                    <Row>
                                                        {section.fields.filter(field => !field.hidden).map(field => (
                                                            <Col key={field.id} md={field.type === 'file' ? 12 : 6} xs={12}>
                                                                {renderField(field, section.id)}
                                                            </Col>
                                                        ))}
                                                        {section.fields.filter(field => !field.hidden).length === 0 && (
                                                            <Col xs={12}>
                                                                <p className="text-muted fst-italic" style={{ fontSize: '13px' }}>No fields yet — open Manage Form Fields to add some.</p>
                                                            </Col>
                                                        )}
                                                    </Row>
                                                </div>
                                            </fieldset>
                                        </div>
                                    ))}
                                    {/* Submit Button */}
                                    <div className="d-flex justify-content-end gap-2 mt-5">
                                        {!isCreate && (
                                            <button type="button" className="btn btn-secondary text-white" onClick={() => setShowEditModal(false)}>
                                                Cancel
                                            </button>
                                        )}
                                        <button type="submit" className="btn btn-primary" disabled={loading || (!dirty && !schemaDirty)}>
                                            {loading ? (
                                                <span className="indicator-progress" style={{ display: 'block' }}>
                                                    Please wait...{' '}
                                                    <span className="spinner-border spinner-border-sm align-middle ms-2"></span>
                                                </span>
                                            ) : (
                                                isCreate ? 'Submit' : 'Update'
                                            )}
                                        </button>
                                    </div>
                        </Form>)
                    }}
                </Formik>
                </Modal.Body>
                </Box>
            </Modal>

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
