import { useState, useEffect, ChangeEvent } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { dateFormatter } from '@utils/date';
import Flatpickr from "react-flatpickr";
import { createCompanyOverview, fetchCompanyLogo, fetchCompanyOverview, updateCompanyOverview } from '@services/company'; // API function to create company overview
import { uploadCompanyAsset } from '@services/uploader'; // API function to upload files
import { successConfirmation, errorConfirmation } from '@utils/modal'; // Success and error handling
import { ICompanyOverview } from "@models/company";
import RadioInput from '@app/modules/common/inputs/RadioInput';
import { Modal, Row, Col } from 'react-bootstrap';
import OrganisationInfo from './OrganisationInfo';
import { Box, IconButton, Typography } from '@mui/material';
import { Close } from '@mui/icons-material';
import eventBus from '@utils/EventBus';
import { loadAllEmployeesIfNeeded } from '@redux/slices/allEmployees';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@redux/store';
import { saveCurrentCompanyInfo } from '@redux/slices/company';
import { hasPermission } from '@utils/authAbac';
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from '@constants/statistics';

// Breadcrumbs setup (same as Overview)

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

// Validation schema updated to match Overview
const validationSchema = Yup.object({
    name: Yup.string().required('Organisation name is required'),
    address: Yup.string().required('Organisation address is required'),
    logo: Yup.string().required('Logo is required'), // Updated to expect a string path
    salaryStamp: Yup.string().required('Salary stamp is required'), // Updated field name
    fiscalYear: Yup.string().required('Fiscal Year is required'),
    gstNumber: Yup.string().required('Company GST Number is required'),
    // numberOfEmployees: Yup.string().required('Number of employees is required'),
    foundedIn: Yup.string().required('Founded in is required'),
    contactNumber: Yup.string().required('Contact number is required'),
    websiteUrl: Yup.string().required('Website URL is required'),
    // workingDays: Yup.string().required('Working days is required'), // Commented out - not being used in the app
    // workingHrs: Yup.string().required('Working hours is required'), // Commented out - not being used in the app
    superAdminEmail: Yup.string().required('Super admin email is required'),
    certificateOfIncorporation: Yup.string().required('Certificate of incorporation is required'),
    panNo: Yup.string().required('Pan number is required'),
    tanNo: Yup.string().required('Tan number is required'),
    ptecCertificate: Yup.string().required('PTEC certificate is required'),
    hsnSacNo: Yup.string().required('HSN/SAC number is required'),
    beneficiaryName: Yup.string().required('Beneficiary name is required'),
    bankNameAndAddress: Yup.string().required('Bank name and address is required'),
    ifscCode: Yup.string().required('IFSC code is required'),
    accountNo: Yup.string().required('Account number is required'),
    micrCode: Yup.string().required('MICR code is required'),
    contactPerson: Yup.string().required('Contact person is required'),
    accountantNo: Yup.string().required('Accountant number is required'),
    additionalplacesofbusiness: Yup.string().required('Additional places of business is required'),
    businessType: Yup.string(), // Optional field
    founder: Yup.string(), // Optional field
});

const OrganisationProfileForm = () => {
    const dispatch = useDispatch<AppDispatch>();
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [stampPreview, setStampPreview] = useState<string | null>(null); // Added state for stamp preview
    const [loading, setLoading] = useState(false);
    const [isCreate, setIsCreate] = useState<boolean>(true);
    const [companyId, setCompanyId] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [stampUrl, setStampUrl] = useState('');
    const [showEditModal, setShowEditModal] = useState<boolean>(false);
    const [companyData, setCompanyData] = useState<ICompanyOverview | null>(null);
    const [formInitialValues, setFormInitialValues] = useState<ICompanyOverview>(initialValues);

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
 
    // get logo and stamp url to download and set previews
    useEffect(()=>{
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
    },[])


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
        {hasPermission(resourceNameMapWithCamelCase.organisationProfile, permissionConstToUseWithHasPermission.readOthers) && <OrganisationInfo onEditClick={() => setShowEditModal(true)} />}
            

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
                        Edit Organisation Profile
                    </Typography>
                    <Modal.Header></Modal.Header>
                    <Modal.Body>

                    <Formik
                    initialValues={formInitialValues}
                    enableReinitialize={true}
                    validationSchema={validationSchema}
                    onSubmit={async (values, { resetForm }) => {
                        setLoading(true);
                        try {
                            if (isCreate) {
                                const res = await createCompanyOverview(values);
                                if (res && !res.hasError) {
                                    successConfirmation('Successfully created organisation profile');
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
                                const res = await updateCompanyOverview(companyId, values);
                                if (res && !res.hasError) {
                                    successConfirmation('Successfully updated organisation profile');
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
                                    const { data: { companyOverview } } = await fetchCompanyOverview();
                                    if (companyOverview[0]) {
                                        setIsCreate(false);
                                        setCompanyId(companyOverview[0]?.id);
                                        setCompanyData(companyOverview[0]);

                                        // console.log('Fetched company data:', companyOverview[0]);
                                        // console.log('superAdminEmail from API:', companyOverview[0].superAdminEmail);

                                        // Create new initial values object with fetched data
                                        const newInitialValues: ICompanyOverview = { ...initialValues };
                                        (Object.keys(newInitialValues) as Array<keyof ICompanyOverview>).forEach((key) => {
                                            if(key?.toString()=="showDateIn12HourFormat"){
                                                newInitialValues[key] = (companyOverview[0][key] ? "1" : "0") as any;
                                            }
                                            else if (companyOverview[0].hasOwnProperty(key) && key !== 'numberOfEmployees') {
                                                newInitialValues[key] = (companyOverview[0][key] || '') as any;
                                                if (key === 'superAdminEmail') {
                                                    // console.log('Setting superAdminEmail:', companyOverview[0][key]);
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

                        return (<Form className="form" placeholder={''}>
                                    {/* Logo and Stamp Upload Section */}
                                    <div className="mb-4">
                                        <fieldset
                                            style={{
                                                borderTop: "1px solid #9D4141",
                                                padding: "clamp(14px, 2vw, 15px)",
                                            }}
                                            className="mt-7"
                                        >
                                            <legend
                                                style={{
                                                    fontSize: "17px",
                                                    fontWeight: 600,
                                                    fontFamily: "Inter",
                                                    marginTop: "-25px",
                                                    marginLeft: "-17px",
                                                    backgroundColor: "#F3F4F7",
                                                    width: "auto",
                                                    lineHeight: "1",
                                                    letterSpacing: 0,
                                                    color: "#9D4141",
                                                    padding: "2px 2px 8px",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "8px",
                                                }}
                                            >
                                                <div
                                                    className="ms-5"
                                                    style={{
                                                        borderTop: "1px solid #9D4141",
                                                        width: "30px",
                                                        height: "0px",
                                                    }}
                                                ></div>
                                                LOGO & STAMP
                                            </legend>
                                            <div className="card-body card responsive-card p-md-10 p-3">
                                                <div className="d-flex gap-3 flex-wrap">
                                                    {/* Organization Logo */}
                                                    <div className="d-flex gap-3 align-items-center flex-grow-1" style={{ minHeight: '72px' }}>
                                                        <div style={{ width: '64px', height: '64px', flexShrink: 0, borderRadius: '50%', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                                                            {logoPreview ? (
                                                                <img
                                                                    src={logoPreview}
                                                                    alt="Logo Preview"
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
                                                                    Organization Logo
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
                                                            {stampPreview ? (
                                                                <img
                                                                    src={stampPreview}
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

                                    {/* Form Fields - Organisation Name, Fiscal Year */}
                                    <div className="mb-4">
                                        <fieldset
                                            style={{
                                                borderTop: "1px solid #9D4141",
                                                padding: "clamp(14px, 2vw, 15px)",
                                            }}
                                            className="mt-7"
                                        >
                                            <legend
                                                style={{
                                                    fontSize: "17px",
                                                    fontWeight: 600,
                                                    fontFamily: "Inter",
                                                    marginTop: "-25px",
                                                    marginLeft: "-17px",
                                                    backgroundColor: "#F3F4F7",
                                                    width: "auto",
                                                    lineHeight: "1",
                                                    letterSpacing: 0,
                                                    color: "#9D4141",
                                                    padding: "2px 2px 8px",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "8px",
                                                }}
                                            >
                                                <div
                                                    className="ms-5"
                                                    style={{
                                                        borderTop: "1px solid #9D4141",
                                                        width: "30px",
                                                        height: "0px",
                                                    }}
                                                ></div>
                                                BASIC INFORMATION
                                            </legend>
                                            <div className="card-body card responsive-card p-md-10 p-3">
                                                <Row>
                                        <Col md={6} xs={12}>
                                            <label className="required col-form-label fw-bold fs-6">
                                                Organisation Name
                                            </label>
                                            <Field
                                                name="name"
                                                type="text"
                                                className="form-control form-control-lg form-control-solid"
                                                placeholder="Organisation name"
                                            />
                                            <ErrorMessage name="name">
                                                {msg => <div className="fv-plugins-message-container"><div className="fv-help-block">{msg}</div></div>}
                                            </ErrorMessage>
                                        </Col>

                                        <Col md={6} xs={12}>
                                            <label className="required col-form-label fw-bold fs-6 ">
                                                Fiscal Year
                                            </label>
                                            <Field name="fiscalYear">
                                                {({ field, form }: { field: any; form: any }) => (
                                                    <Flatpickr
                                                        value={values.fiscalYear ? [
                                                            new Date(values.fiscalYear.split(' to ')[0]),
                                                            new Date(values.fiscalYear.split(' to ')[1])
                                                        ] : []}
                                                        className='form-control form-control-solid'
                                                        placeholder={"Set fiscal year"}
                                                        onChange={(selectedDates: Date[]) => {
                                                            if (selectedDates.length === 2) {
                                                                const startDate = dateFormatter.format(selectedDates[0]);
                                                                const endDate = dateFormatter.format(selectedDates[1]);
                                                                setFieldValue("fiscalYear", `${startDate} to ${endDate}`);
                                                                setFieldTouched("fiscalYear", false);
                                                            }
                                                        }}
                                                        onOpen={() => {
                                                            setFieldTouched("fiscalYear", true);
                                                        }}
                                                        options={{
                                                            dateFormat: "Y-m-d",
                                                            altInput: true,
                                                            altFormat: "F j, Y",
                                                            enableTime: false,
                                                            mode: 'range'
                                                        }}
                                                    />
                                                )}
                                            </Field>
                                            <ErrorMessage name="fiscalYear">
                                                {msg => <div className='fv-plugins-message-container'><div className='fv-help-block'>{msg}</div></div>}
                                            </ErrorMessage>
                                        </Col>

                                        <Col md={6} xs={12}>
                                            <label className="required col-form-label fw-bold fs-6">
                                                Contact Number
                                            </label>
                                            <Field
                                                name="contactNumber"
                                                type="text"
                                                className="form-control form-control-lg form-control-solid"
                                                placeholder="Contact number"
                                            />
                                            <ErrorMessage name="contactNumber">
                                                {msg => <div className="fv-plugins-message-container"><div className="fv-help-block">{msg}</div></div>}
                                            </ErrorMessage>
                                        </Col>

                                        <Col md={6} xs={12}>
                                            <label className="required col-form-label fw-bold fs-6">
                                                Website URL
                                            </label>
                                            <Field
                                                name="websiteUrl"
                                                type="text"
                                                className="form-control form-control-lg form-control-solid"
                                                placeholder="https://www.example.com"
                                            />
                                            <ErrorMessage name="websiteUrl">
                                                {msg => <div className="fv-plugins-message-container"><div className="fv-help-block">{msg}</div></div>}
                                            </ErrorMessage>
                                        </Col>

                                        <Col md={6} xs={12}>
                                            <label className="col-form-label fw-bold fs-6">
                                                Business Type
                                            </label>
                                            <Field
                                                name="businessType"
                                                type="text"
                                                className="form-control form-control-lg form-control-solid"
                                                placeholder="Business Type"
                                            />
                                            <ErrorMessage name="businessType">
                                                {msg => <div className="fv-plugins-message-container"><div className="fv-help-block">{msg}</div></div>}
                                            </ErrorMessage>
                                        </Col>

                                        <Col md={6} xs={12}>
                                            <label className="col-form-label fw-bold fs-6">
                                                Founder
                                            </label>
                                            <Field
                                                name="founder"
                                                type="text"
                                                className="form-control form-control-lg form-control-solid"
                                                placeholder="Founder"
                                            />
                                            <ErrorMessage name="founder">
                                                {msg => <div className="fv-plugins-message-container"><div className="fv-help-block">{msg}</div></div>}
                                            </ErrorMessage>
                                        </Col>

                                        {/* Commented out - not being used in the app */}
                                        {/* <Col md={6} xs={12}>
                                            <label className="required col-form-label fw-bold fs-6">
                                                Working Days
                                            </label>
                                            <Field
                                                name="workingDays"
                                                type="text"
                                                className="form-control form-control-lg form-control-solid"
                                                placeholder="Working days"
                                            />
                                            <ErrorMessage name="workingDays">
                                                {msg => <div className="fv-plugins-message-container"><div className="fv-help-block">{msg}</div></div>}
                                            </ErrorMessage>
                                        </Col> */}

                                        {/* Commented out - not being used in the app */}
                                        {/* <Col md={6} xs={12}>
                                            <label className="required col-form-label fw-bold fs-6">
                                                Working Hours
                                            </label>
                                            <Field
                                                name="workingHrs"
                                                type="text"
                                                className="form-control form-control-lg form-control-solid"
                                                placeholder="Working hours"
                                            />
                                            <ErrorMessage name="workingHrs">
                                                {msg => <div className="fv-plugins-message-container"><div className="fv-help-block">{msg}</div></div>}
                                            </ErrorMessage>
                                        </Col> */}
                                                </Row>
                                            </div>
                                        </fieldset>
                                    </div>

                                    {/* GST & Company Details */}
                                    <div className="mb-4">
                                        <fieldset
                                            style={{
                                                borderTop: "1px solid #9D4141",
                                                padding: "clamp(14px, 2vw, 15px)",
                                            }}
                                            className="mt-7"
                                        >
                                            <legend
                                                style={{
                                                    fontSize: "17px",
                                                    fontWeight: 600,
                                                    fontFamily: "Inter",
                                                    marginTop: "-25px",
                                                    marginLeft: "-17px",
                                                    backgroundColor: "#F3F4F7",
                                                    width: "auto",
                                                    lineHeight: "1",
                                                    letterSpacing: 0,
                                                    color: "#9D4141",
                                                    padding: "2px 2px 8px",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "8px",
                                                }}
                                            >
                                                <div
                                                    className="ms-5"
                                                    style={{
                                                        borderTop: "1px solid #9D4141",
                                                        width: "30px",
                                                        height: "0px",
                                                    }}
                                                ></div>
                                                GST & COMPANY DETAILS
                                            </legend>
                                            <div className="card-body card responsive-card p-md-10 p-3">
                                                <Row>
                                        <Col md={12} xs={12}>
                                            <label className="required col-form-label fw-bold fs-6">
                                                Organisation Address
                                            </label>
                                            <Field
                                                name="address"
                                                type="text"
                                                className="form-control form-control-lg form-control-solid"
                                                placeholder="Organisation Address"
                                            />
                                            <ErrorMessage name="address">
                                                {msg => <div className="fv-plugins-message-container"><div className="fv-help-block">{msg}</div></div>}
                                            </ErrorMessage>
                                        </Col>

                                        <Col md={6} xs={12}>
                                            <label className="required col-form-label fw-bold fs-6">
                                                GST Number
                                            </label>
                                            <Field
                                                name="gstNumber"
                                                type="text"
                                                className="form-control form-control-lg form-control-solid"
                                                placeholder="GST Number"
                                            />
                                            <ErrorMessage name="gstNumber">
                                                {msg => <div className="fv-plugins-message-container"><div className="fv-help-block">{msg}</div></div>}
                                            </ErrorMessage>
                                        </Col>

                                        {/* <Col md={6} xs={12}>
                                            <label className="required col-form-label fw-bold fs-6">
                                                Number of Employees
                                            </label>
                                            <Field
                                                name="numberOfEmployees"
                                                type="text"
                                                className="form-control form-control-lg form-control-solid"
                                                placeholder="Number of Employees"
                                                readOnly
                                                disabled
                                                title="Auto-calculated from total employees"
                                            />
                                            <ErrorMessage name="numberOfEmployees">
                                                {msg => <div className="fv-plugins-message-container"><div className="fv-help-block">{msg}</div></div>}
                                            </ErrorMessage>
                                        </Col> */}

                                        <Col md={6} xs={12}>
                                            <label className="required col-form-label fw-bold fs-6">
                                                Founded In
                                            </label>
                                            <Field
                                                name="foundedIn"
                                                type="text"
                                                className="form-control form-control-lg form-control-solid"
                                                placeholder="Founded In"
                                            />
                                            <ErrorMessage name="foundedIn">
                                                {msg => <div className="fv-plugins-message-container"><div className="fv-help-block">{msg}</div></div>}
                                            </ErrorMessage>
                                        </Col>
                                                </Row>
                                            </div>
                                        </fieldset>
                                    </div>

{/* Super Admin Email and Certificate of Incorporation */}
                                    <div className="mb-4">
                                        <fieldset
                                            style={{
                                                borderTop: "1px solid #9D4141",
                                                padding: "clamp(14px, 2vw, 15px)",
                                            }}
                                            className="mt-7"
                                        >
                                            <legend
                                                style={{
                                                    fontSize: "17px",
                                                    fontWeight: 600,
                                                    fontFamily: "Inter",
                                                    marginTop: "-25px",
                                                    marginLeft: "-17px",
                                                    backgroundColor: "#F3F4F7",
                                                    width: "auto",
                                                    lineHeight: "1",
                                                    letterSpacing: 0,
                                                    color: "#9D4141",
                                                    padding: "2px 2px 8px",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "8px",
                                                }}
                                            >
                                                <div
                                                    className="ms-5"
                                                    style={{
                                                        borderTop: "1px solid #9D4141",
                                                        width: "30px",
                                                        height: "0px",
                                                    }}
                                                ></div>
                                                ADMIN & CERTIFICATES
                                            </legend>
                                            <div className="card-body card responsive-card p-md-10 p-3">
                                                <Row>
                                        <Col md={6} xs={12}>
                                            <label className="required col-form-label fw-bold fs-6">
                                                Super Admin Email
                                            </label>
                                            <Field
                                                name="superAdminEmail"
                                                type="email"
                                                className="form-control form-control-lg form-control-solid"
                                                placeholder="Super Admin Email"
                                            />
                                            <ErrorMessage name="superAdminEmail">
                                                {msg => <div className="fv-plugins-message-container"><div className="fv-help-block">{msg}</div></div>}
                                            </ErrorMessage>
                                        </Col>
                                        <Col md={6} xs={12}>
                                            <label className="required col-form-label fw-bold fs-6">
                                                Certificate of Incorporation
                                            </label>
                                            <Field
                                                name="certificateOfIncorporation"
                                                type="text"
                                                className="form-control form-control-lg form-control-solid"
                                                placeholder="Certificate of Incorporation"
                                            />
                                            <ErrorMessage name="certificateOfIncorporation">
                                                {msg => <div className="fv-plugins-message-container"><div className="fv-help-block">{msg}</div></div>}
                                            </ErrorMessage>
                                        </Col>

                                        <Col md={6} xs={12}>
                                            <label className="required col-form-label fw-bold fs-6">
                                                Pan Number
                                            </label>
                                            <Field
                                                name="panNo"
                                                type="text"
                                                className="form-control form-control-lg form-control-solid"
                                                placeholder="Pan Number"
                                            />
                                            <ErrorMessage name="panNo">
                                                {msg => <div className="fv-plugins-message-container"><div className="fv-help-block">{msg}</div></div>}
                                            </ErrorMessage>
                                        </Col>
                                        <Col md={6} xs={12}>
                                            <label className="required col-form-label fw-bold fs-6">
                                                Tan Number
                                            </label>
                                            <Field
                                                name="tanNo"
                                                type="text"
                                                className="form-control form-control-lg form-control-solid"
                                                placeholder="Tan Number"
                                            />
                                            <ErrorMessage name="tanNo">
                                                {msg => <div className="fv-plugins-message-container"><div className="fv-help-block">{msg}</div></div>}
                                            </ErrorMessage>
                                        </Col>
                                                </Row>
                                            </div>
                                        </fieldset>
                                    </div>

                                    {/* PTEC Certificate and HSN/SAC Number */}
                                    <div className="mb-4">
                                        <fieldset
                                            style={{
                                                borderTop: "1px solid #9D4141",
                                                padding: "clamp(14px, 2vw, 15px)",
                                            }}
                                            className="mt-7"
                                        >
                                            <legend
                                                style={{
                                                    fontSize: "17px",
                                                    fontWeight: 600,
                                                    fontFamily: "Inter",
                                                    marginTop: "-25px",
                                                    marginLeft: "-17px",
                                                    backgroundColor: "#F3F4F7",
                                                    width: "auto",
                                                    lineHeight: "1",
                                                    letterSpacing: 0,
                                                    color: "#9D4141",
                                                    padding: "2px 2px 8px",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "8px",
                                                }}
                                            >
                                                <div
                                                    className="ms-5"
                                                    style={{
                                                        borderTop: "1px solid #9D4141",
                                                        width: "30px",
                                                        height: "0px",
                                                    }}
                                                ></div>
                                                TAX & BUSINESS DETAILS
                                            </legend>
                                            <div className="card-body card responsive-card p-md-10 p-3">
                                                <Row>
                                        <Col md={6} xs={12}>
                                            <label className="required col-form-label fw-bold fs-6">
                                                PTEC Certificate
                                            </label>
                                            <Field
                                                name="ptecCertificate"
                                                type="text"
                                                className="form-control form-control-lg form-control-solid"
                                                placeholder="PTEC Certificate"
                                            />
                                            <ErrorMessage name="ptecCertificate">
                                                {msg => <div className="fv-plugins-message-container"><div className="fv-help-block">{msg}</div></div>}
                                            </ErrorMessage>
                                        </Col>
                                        <Col md={6} xs={12}>
                                            <label className="required col-form-label fw-bold fs-6">
                                                HSN/SAC Number
                                            </label>
                                            <Field
                                                name="hsnSacNo"
                                                type="text"
                                                className="form-control form-control-lg form-control-solid"
                                                placeholder="HSN/SAC Number"
                                            />
                                            <ErrorMessage name="hsnSacNo">
                                                {msg => <div className="fv-plugins-message-container"><div className="fv-help-block">{msg}</div></div>}
                                            </ErrorMessage>
                                        </Col>
                                                </Row>
                                            </div>
                                        </fieldset>
                                    </div>

                                    {/* Beneficiary Name and Bank Name and Address */}
                                    <div className="mb-4">
                                        <fieldset
                                            style={{
                                                borderTop: "1px solid #9D4141",
                                                padding: "clamp(14px, 2vw, 15px)",
                                            }}
                                            className="mt-7"
                                        >
                                            <legend
                                                style={{
                                                    fontSize: "17px",
                                                    fontWeight: 600,
                                                    fontFamily: "Inter",
                                                    marginTop: "-25px",
                                                    marginLeft: "-17px",
                                                    backgroundColor: "#F3F4F7",
                                                    width: "auto",
                                                    lineHeight: "1",
                                                    letterSpacing: 0,
                                                    color: "#9D4141",
                                                    padding: "2px 2px 8px",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "8px",
                                                }}
                                            >
                                                <div
                                                    className="ms-5"
                                                    style={{
                                                        borderTop: "1px solid #9D4141",
                                                        width: "30px",
                                                        height: "0px",
                                                    }}
                                                ></div>
                                                BANK DETAILS
                                            </legend>
                                            <div className="card-body card responsive-card p-md-10 p-3">
                                                <Row>
                                        <Col md={6} xs={12}>
                                            <label className="required col-form-label fw-bold fs-6">
                                                Beneficiary Name
                                            </label>
                                            <Field
                                                name="beneficiaryName"
                                                type="text"
                                                className="form-control form-control-lg form-control-solid"
                                                placeholder="Beneficiary Name"
                                            />
                                            <ErrorMessage name="beneficiaryName">
                                                {msg => <div className="fv-plugins-message-container"><div className="fv-help-block">{msg}</div></div>}
                                            </ErrorMessage>
                                        </Col>
                                        <Col md={6} xs={12}>
                                            <label className="required col-form-label fw-bold fs-6">
                                                Bank Name and Address
                                            </label>
                                            <Field
                                                name="bankNameAndAddress"
                                                type="text"
                                                className="form-control form-control-lg form-control-solid"
                                                placeholder="Bank Name and Address"
                                            />
                                            <ErrorMessage name="bankNameAndAddress">
                                                {msg => <div className="fv-plugins-message-container"><div className="fv-help-block">{msg}</div></div>}
                                            </ErrorMessage>
                                        </Col>

                                        <Col md={6} xs={12}>
                                            <label className="required col-form-label fw-bold fs-6">
                                                IFSC Code
                                            </label>
                                            <Field
                                                name="ifscCode"
                                                type="text"
                                                className="form-control form-control-lg form-control-solid"
                                                placeholder="IFSC Code"
                                            />
                                            <ErrorMessage name="ifscCode">
                                                {msg => <div className="fv-plugins-message-container"><div className="fv-help-block">{msg}</div></div>}
                                            </ErrorMessage>
                                        </Col>
                                        <Col md={6} xs={12}>
                                            <label className="required col-form-label fw-bold fs-6">
                                                Account Number
                                            </label>
                                            <Field
                                                name="accountNo"
                                                type="text"
                                                className="form-control form-control-lg form-control-solid"
                                                placeholder="Account Number"
                                            />
                                            <ErrorMessage name="accountNo">
                                                {msg => <div className="fv-plugins-message-container"><div className="fv-help-block">{msg}</div></div>}
                                            </ErrorMessage>
                                        </Col>

                                        <Col md={6} xs={12}>
                                            <label className="required col-form-label fw-bold fs-6">
                                                MICR Code
                                            </label>
                                            <Field
                                                name="micrCode"
                                                type="text"
                                                className="form-control form-control-lg form-control-solid"
                                                placeholder="MICR Code"
                                            />
                                            <ErrorMessage name="micrCode">
                                                {msg => <div className="fv-plugins-message-container"><div className="fv-help-block">{msg}</div></div>}
                                            </ErrorMessage>
                                        </Col>
                                        <Col md={6} xs={12}>
                                            <label className="required col-form-label fw-bold fs-6">
                                                Contact Person
                                            </label>
                                            <Field
                                                name="contactPerson"
                                                type="text"
                                                className="form-control form-control-lg form-control-solid"
                                                placeholder="Contact Person"
                                            />
                                            <ErrorMessage name="contactPerson">
                                                {msg => <div className="fv-plugins-message-container"><div className="fv-help-block">{msg}</div></div>}
                                            </ErrorMessage>
                                        </Col>

                                        <Col md={6} xs={12}>
                                            <label className="required col-form-label fw-bold fs-6">
                                                Accountant Number
                                            </label>
                                            <Field
                                                name="accountantNo"
                                                type="text"
                                                className="form-control form-control-lg form-control-solid"
                                                placeholder="Accountant Number"
                                            />
                                            <ErrorMessage name="accountantNo">
                                                {msg => <div className="fv-plugins-message-container"><div className="fv-help-block">{msg}</div></div>}
                                            </ErrorMessage>
                                        </Col>
                                        <Col md={6} xs={12}>
                                            <label className="required col-form-label fw-bold fs-6">
                                                Additional Places of Business
                                            </label>
                                            <Field
                                                name="additionalplacesofbusiness"
                                                type="text"
                                                className="form-control form-control-lg form-control-solid"
                                                placeholder="Additional Places of Business"
                                            />
                                            <ErrorMessage name="additionalplacesofbusiness">
                                                {msg => <div className="fv-plugins-message-container"><div className="fv-help-block">{msg}</div></div>}
                                            </ErrorMessage>
                                        </Col>
                                                </Row>
                                            </div>
                                        </fieldset>
                                    </div>

                                    {/* Date Settings */}
                                    {/* <div className="mb-4">
                                        <fieldset
                                            style={{
                                                borderTop: "1px solid #9D4141",
                                                padding: "clamp(14px, 2vw, 15px)",
                                            }}
                                            className="mt-7"
                                        >
                                            <legend
                                                style={{
                                                    fontSize: "17px",
                                                    fontWeight: 600,
                                                    fontFamily: "Inter",
                                                    marginTop: "-25px",
                                                    marginLeft: "-17px",
                                                    backgroundColor: "#F3F4F7",
                                                    width: "auto",
                                                    lineHeight: "1",
                                                    letterSpacing: 0,
                                                    color: "#9D4141",
                                                    padding: "2px 2px 8px",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "8px",
                                                }}
                                            >
                                                <div
                                                    className="ms-5"
                                                    style={{
                                                        borderTop: "1px solid #9D4141",
                                                        width: "30px",
                                                        height: "0px",
                                                    }}
                                                ></div>
                                                DATE SETTINGS
                                            </legend>
                                            <div className="card-body card responsive-card p-md-10 p-3">
                                                <Row>
                                        <Col md={6} xs={12}>
                                            <div className="mt-4">
                                                <RadioInput
                                                    isRequired={false}
                                                    inputLabel="Show Date In 12 Hour Format"
                                                    radioBtns={[
                                                        { label: "Yes", value: "1" },
                                                        { label: "No", value: "0" },
                                                    ]}
                                                    formikField="showDateIn12HourFormat"
                                                />
                                                <ErrorMessage name="showDateIn12HourFormat">
                                                    {msg => <div className="fv-plugins-message-container"><div className="fv-help-block">{msg}</div></div>}
                                                </ErrorMessage>
                                            </div>
                                        </Col>
                                                </Row>
                                            </div>
                                        </fieldset>
                                    </div> */}

                                    {/* Submit Button */}
                                    <div className="d-flex justify-content-end gap-2 mt-5">
                                                {!isCreate && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-secondary text-white"
                                                        onClick={() => setShowEditModal(false)}
                                                    >
                                                        Cancel
                                                    </button>
                                                )}
                                                <button
                                                    type="submit"
                                                    className="btn btn-primary"
                                                    disabled={loading || !isValid || !dirty}
                                                    onClick={(e) => {
                                                        console.log('Button clicked', { loading, isValid, dirty });
                                                        console.log('Form values:', values);
                                                    }}
                                                >
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
        </>
    );
};

export default OrganisationProfileForm;
