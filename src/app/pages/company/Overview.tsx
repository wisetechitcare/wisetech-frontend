import { useFormik } from 'formik';
import { useState } from 'react';
import * as Yup from 'yup';
import Flatpickr from "react-flatpickr";
import { PageLink, PageTitle } from "@metronic/layout/core";
import { KTCard, KTCardBody } from '@metronic/helpers';
import { ICompanyOverview } from "@models/company";
import { createCompanyOverview } from '@services/company';
import { uploadCompanyAsset } from '@services/uploader';
import { errorConfirmation, successConfirmation } from '@utils/modal';
import { dateFormatter } from '@utils/date';
import { PageHeadingTitle } from '@metronic/layout/components/header/page-title/PageHeadingTitle';

const overviewBreadcrumbs: Array<PageLink> = [
    {
        title: 'Company',
        path: '#',
        isSeparator: false,
        isActive: false,
    },
    {
        title: '',
        path: '',
        isSeparator: true,
        isActive: false,
    },
];

const initialValues: ICompanyOverview = {
    name: "",
    fiscalYear: "",
    logo: "",
    // workingDays: "", // Commented out - not being used in the app
    // workingHrs: "", // Commented out - not being used in the app
    contactNumber: "",
    foundedIn: "",
    gstNumber: "",
    numberOfEmployees: "",
    websiteUrl: "",
    address: "",
    superAdminEmail: "",
};

const companyOverviewSchema = Yup.object().shape({
    name: Yup.string().required('Company name is required'),
    fiscalYear: Yup.string().required('Fiscal Year is required'),
    logo: Yup.string().required('Company logo is required'),
    // workingDays: Yup.string().required('Working days is required'), // Commented out - not being used in the app
    // workingHrs: Yup.string().required('Working hours is required'), // Commented out - not being used in the app
    contactNumber: Yup.string().required('Contact number is required'),
    foundedIn: Yup.string().required('Founded in is required'),
    gstNumber: Yup.string().required('GST number is required'),
    numberOfEmployees: Yup.string().required('Number of employees is required'),
    websiteUrl: Yup.string().required('Website url is required'),
    address: Yup.string().required('Address is required'),
    superAdminEmail: Yup.string().required('Super admin email is required'),
}).strict(true);

function Overview() {
    const [loading, setLoading] = useState(false);
    const formik = useFormik<ICompanyOverview>({
        initialValues,
        validationSchema: companyOverviewSchema,
        onSubmit: async (values) => {
            setLoading(true);
            try {
                const res = await createCompanyOverview(values);
                if (res && !res.hasError) {
                    successConfirmation('Successfully created company overview');
                    setLoading(false);
                    formik.resetForm();
                }
            }
            catch {
                errorConfirmation('Failed to create company overview');
                setLoading(false);
                formik.resetForm();
            }
        },
        enableReinitialize: true,
        validateOnMount: true,
    });

    const uploadFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const { target: { files } } = event;
        if (files && files.length > 0) {
            const form = new FormData();
            form.append('file', files[0]);
            const { data: { path } } = await uploadCompanyAsset(form);
            formik.setFieldValue('logo', path, true);
        }
    }

    return (
        <>
            <PageTitle breadcrumbs={overviewBreadcrumbs}>Overview</PageTitle>
            <PageHeadingTitle/>

            <form onSubmit={formik.handleSubmit} noValidate className='form'>
                <KTCard className='my-6 shadow-sm'>
                    <KTCardBody className='p-0'>
                        <div className='card-header border-0 cursor-pointer'>
                            <div className='card-title m-0'>
                                <h3 className='fw-bolder m-0'>Basic Company Information</h3>
                            </div>
                        </div>

                        <div className='row mb-9 px-7'>
                            <div className='col-lg-6 fv-row'>
                                <label className='required col-lg-4 col-form-label fw-bold fs-6 mb-3'>Company Name</label>
                                <input
                                    type='text'
                                    className='form-control form-control-lg form-control-solid'
                                    placeholder='Company name'
                                    {...formik.getFieldProps('name')}
                                />
                                {formik.touched.name && formik.errors.name && (
                                    <div className='fv-plugins-message-container'>
                                        <div className='fv-help-block'>{formik.errors.name}</div>
                                    </div>
                                )}
                            </div>

                            <div className='col-lg-6 fv-row'>
                                <label className='required col-lg-4 col-form-label fw-bold fs-6 mb-3'>Fiscal Year</label>
                                <Flatpickr
                                    value={formik.values.fiscalYear}
                                    className='form-control form-control-solid'
                                    placeholder={"Set fiscal year"}
                                    onChange={(selectedDates: Date[]) => {
                                        if (selectedDates.length === 2) {
                                            const startDate = dateFormatter.format(selectedDates[0]);
                                            const endDate = dateFormatter.format(selectedDates[1]);
                                            formik.setFieldValue("fiscalYear", `${startDate} to ${endDate}`);
                                            formik.setFieldTouched("fiscalYear", false);
                                        }
                                    }}
                                    onOpen={() => {
                                        formik.setFieldTouched("fiscalYear", true);
                                    }}
                                    options={{
                                        dateFormat: "Y-m-d",
                                        altInput: true,
                                        altFormat: "F j, Y",
                                        enableTime: false,
                                        mode: 'range'
                                    }}
                                />
                                {formik.touched.fiscalYear && formik.errors.fiscalYear && (
                                    <div className='fv-plugins-message-container'>
                                        <div className='fv-help-block'>{formik.errors.fiscalYear}</div>
                                    </div>
                                )}
                            </div>
                        </div>

                    </KTCardBody>
                </KTCard>

                <KTCard className='my-6 shadow-sm'>
                    <KTCardBody className='p-0'>
                        <div className='card-header border-0 cursor-pointer'>
                            <div className='card-title m-0'>
                                <h3 className='fw-bolder m-0'>Operational Details</h3>
                            </div>
                        </div>

                        <div className='row mb-9 px-7'>
                            {/* Commented out - not being used in the app */}
                            {/* <div className='col-lg-6 fv-row'>
                                <label className='required col-lg-4 col-form-label fw-bold fs-6 mb-3'>Working Days</label>
                                <input
                                    type='text'
                                    className='form-control form-control-lg form-control-solid'
                                    placeholder='Working days'
                                    {...formik.getFieldProps('workingDays')}
                                />
                                {formik.touched.workingDays && formik.errors.workingDays && (
                                    <div className='fv-plugins-message-container'>
                                        <div className='fv-help-block'>{formik.errors.workingDays}</div>
                                    </div>
                                )}
                            </div> */}

                            {/* Commented out - not being used in the app */}
                            {/* <div className='col-lg-6 fv-row'>
                                <label className='required col-lg-4 col-form-label fw-bold fs-6 mb-3'>Working Hours</label>
                                <input
                                    type='text'
                                    className='form-control form-control-lg form-control-solid'
                                    placeholder='Working hours'
                                    {...formik.getFieldProps('workingHrs')}
                                />
                                {formik.touched.workingHrs && formik.errors.workingHrs && (
                                    <div className='fv-plugins-message-container'>
                                        <div className='fv-help-block'>{formik.errors.workingHrs}</div>
                                    </div>
                                )}
                            </div> */}
                        </div>

                    </KTCardBody>
                </KTCard>

                <KTCard className='my-6 shadow-sm'>
                    <KTCardBody className='p-0'>
                        <div className='card-header border-0 cursor-pointer'>
                            <div className='card-title m-0'>
                                <h3 className='fw-bolder m-0'>Contact Information</h3>
                            </div>
                        </div>

                        <div className='row mb-9 px-7'>
                            <div className='col-lg-6 fv-row'>
                                <label className='required col-lg-4 col-form-label fw-bold fs-6 mb-3'>Contact Number</label>
                                <input
                                    type='text'
                                    className='form-control form-control-lg form-control-solid'
                                    placeholder='Contact number'
                                    {...formik.getFieldProps('contactNumber')}
                                />
                                {formik.touched.contactNumber && formik.errors.contactNumber && (
                                    <div className='fv-plugins-message-container'>
                                        <div className='fv-help-block'>{formik.errors.contactNumber}</div>
                                    </div>
                                )}
                            </div>

                            <div className='col-lg-6 fv-row'>
                                <label className='required col-lg-4 col-form-label fw-bold fs-6 mb-3'>Address</label>
                                <input
                                    type='text'
                                    className='form-control form-control-lg form-control-solid'
                                    placeholder='Address'
                                    {...formik.getFieldProps('address')}
                                />
                                {formik.touched.address && formik.errors.address && (
                                    <div className='fv-plugins-message-container'>
                                        <div className='fv-help-block'>{formik.errors.address}</div>
                                    </div>
                                )}
                            </div>
                        </div>

                    </KTCardBody>
                </KTCard>

                <KTCard className='my-6 shadow-sm'>
                    <KTCardBody className='p-0'>
                        <div className='card-header border-0 cursor-pointer'>
                            <div className='card-title m-0'>
                                <h3 className='fw-bolder m-0'>Company Details</h3>
                            </div>
                        </div>

                        <div className='row mb-9 px-7'>
                            <div className='col-lg-6 fv-row'>
                                <label className='required col-lg-4 col-form-label fw-bold fs-6 mb-3'>GST Number</label>
                                <input
                                    type='text'
                                    className='form-control form-control-lg form-control-solid'
                                    placeholder='GST number'
                                    {...formik.getFieldProps('gstNumber')}
                                />
                                {formik.touched.gstNumber && formik.errors.gstNumber && (
                                    <div className='fv-plugins-message-container'>
                                        <div className='fv-help-block'>{formik.errors.gstNumber}</div>
                                    </div>
                                )}
                            </div>

                            <div className='col-lg-6 fv-row'>
                                <label className='required col-lg-4 col-form-label fw-bold fs-6 mb-3'>Number of Employees</label>
                                <input
                                    type='text'
                                    className='form-control form-control-lg form-control-solid'
                                    placeholder='Number of employees'
                                    {...formik.getFieldProps('numberOfEmployees')}
                                />
                                {formik.touched.numberOfEmployees && formik.errors.numberOfEmployees && (
                                    <div className='fv-plugins-message-container'>
                                        <div className='fv-help-block'>{formik.errors.numberOfEmployees}</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className='row mb-9 px-7'>
                            <div className='col-lg-6 fv-row'>
                                <label className='required col-lg-4 col-form-label fw-bold fs-6 mb-3'>Founded In</label>
                                <input
                                    type='text'
                                    className='form-control form-control-lg form-control-solid'
                                    placeholder='Founded in'
                                    {...formik.getFieldProps('foundedIn')}
                                />
                                {formik.touched.foundedIn && formik.errors.foundedIn && (
                                    <div className='fv-plugins-message-container'>
                                        <div className='fv-help-block'>{formik.errors.foundedIn}</div>
                                    </div>
                                )}
                            </div>
                        </div>

                    </KTCardBody>
                </KTCard>

                <KTCard className='shadow-sm'>
                    <KTCardBody className='p-0'>
                        <div className='card-header border-0 cursor-pointer'>
                            <div className='card-title m-0'>
                                <h3 className='fw-bolder m-0'>Digital Presence</h3>
                            </div>
                        </div>

                        <div className='row mb-9 px-7'>
                            <div className='col-lg-6 fv-row'>
                                <label className='required col-lg-4 col-form-label fw-bold fs-6 mb-3'>Website URL</label>
                                <input
                                    type='text'
                                    className='form-control form-control-lg form-control-solid'
                                    placeholder='Website URL'
                                    {...formik.getFieldProps('websiteUrl')}
                                />
                                {formik.touched.websiteUrl && formik.errors.websiteUrl && (
                                    <div className='fv-plugins-message-container'>
                                        <div className='fv-help-block'>{formik.errors.websiteUrl}</div>
                                    </div>
                                )}
                            </div>

                            <div className='col-lg-6 fv-row'>
                                <label className='required col-lg-4 col-form-label fw-bold fs-6 mb-3'>Logo</label>
                                <input
                                    type='file'
                                    className='form-control form-control-lg form-control-solid'
                                    placeholder='Logo'
                                    onChange={uploadFile}
                                />
                                {formik.touched.logo && formik.errors.logo && (
                                    <div className='fv-plugins-message-container'>
                                        <div className='fv-help-block'>{formik.errors.logo}</div>
                                    </div>
                                )}
                            </div>
                        </div>

                    </KTCardBody>
                </KTCard>

                <div className='card-footer d-flex justify-content-end py-6 px-9'>
                    <button type='submit' className='btn btn-primary' disabled={loading || !formik.isValid}>
                        {!loading && 'Save Changes'}
                        {loading && (
                            <span className='indicator-progress' style={{ display: 'block' }}>
                                Please wait...{' '}
                                <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
                            </span>
                        )}
                    </button>
                </div>
            </form>
        </>
    );
}

export default Overview;