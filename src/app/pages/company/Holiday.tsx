import { KTCard, KTCardBody } from '@metronic/helpers';
import { PageLink, PageTitle } from '@metronic/layout/core';
import { IHoliday } from '@models/company';
import { createHoliday, fetchCompanyOverview } from '@services/company';
import { errorConfirmation, successConfirmation } from '@utils/modal';
import { useFormik } from 'formik';
import { useEffect, useState } from 'react';
import * as Yup from 'yup';

const usersBreadcrumbs: Array<PageLink> = [
    {
        title: 'Holiday',
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

const initialValues: IHoliday = {
    name: "",
    isFixed: false,
    isActive: false,
    colorCode: "",
    companyId: "",
};

const holidaySchema = Yup.object().shape({
    name: Yup.string().required('Holiday Name is required'),
    isFixed: Yup.boolean().required('Is fixed is required'),
    colorCode: Yup.string().required('Color is required'),
    isActive: Yup.boolean().required('Is active is required'),
    companyId: Yup.string(),
}).strict(true);

function Holiday({ onCloseHolidayForm, refreshHolidayList }: { onCloseHolidayForm: () => void, refreshHolidayList?: () => void }) {
    const [loading, setLoading] = useState(false);

    const formik = useFormik<IHoliday>({
        initialValues,
        validationSchema: holidaySchema,
        onSubmit: async (values) => {
            setLoading(true);
            try {
                const { data: { companyOverview } } = await fetchCompanyOverview();
                values.companyId = companyOverview[0].id;
                
                const res = await createHoliday(values);
                if (res && !res.hasError) {
                    successConfirmation('Successfully created holiday');
                    setLoading(false);
                    formik.resetForm();
                    if (refreshHolidayList) {
                        refreshHolidayList();
                    }
                    onCloseHolidayForm();
                }
            }
            catch {
                errorConfirmation('Failed to create holiday');
                setLoading(false);
                formik.resetForm();
            }
        },
        enableReinitialize: true,
        validateOnMount: true,
    });

    return (
        <>
            <PageTitle breadcrumbs={usersBreadcrumbs}>Add New Holiday</PageTitle>
            {/* <PageHeadingTitle/> */}

            <form onSubmit={formik.handleSubmit} noValidate className='form'>
                    <KTCardBody className='p-7'>

                        <div className='col-lg-6 mb-4 w-100'>
                            <label className='required fs-6 fw-bold form-label mb-3'>Holiday name</label>
                            <input
                                type='text'
                                className='form-control form-control-lg form-control-solid'
                                placeholder='Holiday name'
                                {...formik.getFieldProps('name')}
                            />
                            {formik.touched.name && formik.errors.name && (
                                <div className='fv-plugins-message-container'>
                                    <div className='fv-help-block'>{formik.errors.name}</div>
                                </div>
                            )}
                        </div>

                        <div className='row mb-4'>
                            <div className='col-lg-6'>
                                <label htmlFor="isFixed" className='required col-lg-5 col-form-label fw-bold fs-6 mb-3'>Is Fixed</label>
                                <div className='form-check form-check-solid form-switch fv-row'>
                                    <input
                                        className='form-check-input w-45px h-30px'
                                        type='checkbox'
                                        id='isFixed'
                                        checked={formik.values.isFixed}
                                        {...formik.getFieldProps('isFixed')}
                                    />
                                    <label className='form-check-label'></label>
                                </div>
                            </div>

                            <div className='col-lg-6'>
                                <label htmlFor="isActive" className='required col-lg-5 col-form-label fw-bold fs-6 mb-3'>Is Active</label>
                                <div className='form-check form-check-solid form-switch fv-row'>
                                    <input
                                        className='form-check-input w-45px h-30px'
                                        type='checkbox'
                                        id='isActive'
                                        checked={formik.values.isActive}
                                        {...formik.getFieldProps('isActive')}
                                    />
                                    <label className='form-check-label'></label>
                                </div>
                            </div>

                            <div className='col-lg-6 fv-row mb-9 mb-lg-0'>
                                <label className='required col-lg-6 col-form-label fw-bold fs-6 mb-3'>Color</label>
                                <input
                                    type='color'
                                    className='form-control form-control-lg form-control-solid'
                                    placeholder='Color'
                                    {...formik.getFieldProps('colorCode')}
                                />
                                {formik.touched.colorCode && formik.errors.colorCode && (
                                    <div className='fv-plugins-message-container'>
                                        <div className='fv-help-block'>{formik.errors.colorCode}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </KTCardBody>
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
    )
}

export default Holiday;