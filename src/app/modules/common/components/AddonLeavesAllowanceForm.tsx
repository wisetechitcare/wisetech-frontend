import { useEffect, useState } from "react";
import * as Yup from 'yup';
import { useFormik } from 'formik';
import { KTCard, KTCardBody } from '@metronic/helpers';
import { 
    fetchAllAddonLeavesAllowances, 
    upsertAddonLeavesAllowances,
    IAddonLeavesAllowance,
    IAddonLeavesAllowanceCreate 
} from "@services/addonLeavesAllowance";
import { errorConfirmation, successConfirmation } from "@utils/modal";
 
interface FormValues {
    experience1: number;
    experience2: number;
    experience3: number;
    experience4: number;
    experience5: number;
    experience6: number;
    experience7: number;
    experience8: number;
    experience9: number;
    experience10: number;
    experiencePlus10: number;
}

const initialValues: FormValues = {
    experience1: 2,
    experience2: 4,
    experience3: 6,
    experience4: 8,
    experience5: 10,
    experience6: 0,
    experience7: 0,
    experience8: 0,
    experience9: 0,
    experience10: 12,
    experiencePlus10: 14,
};

const addonLeavesSchema = Yup.object().shape({
    experience1: Yup.number()
        .min(0, 'Addon leaves cannot be negative')
        .max(50, 'Addon leaves cannot exceed 50')
        .required('Addon leaves for 1 year experience is required'),
    experience2: Yup.number()
        .min(0, 'Addon leaves cannot be negative')
        .max(50, 'Addon leaves cannot exceed 50')
        .required('Addon leaves for 2 years experience is required'),
    experience3: Yup.number()
        .min(0, 'Addon leaves cannot be negative')
        .max(50, 'Addon leaves cannot exceed 50')
        .required('Addon leaves for 3 years experience is required'),
    experience4: Yup.number()
        .min(0, 'Addon leaves cannot be negative')
        .max(50, 'Addon leaves cannot exceed 50')
        .required('Addon leaves for 4 years experience is required'),
    experience5: Yup.number()
        .min(0, 'Addon leaves cannot be negative')
        .max(50, 'Addon leaves cannot exceed 50')
        .required('Addon leaves for 5 years experience is required'),
    experience6: Yup.number()
        .min(0, 'Addon leaves cannot be negative')
        .max(50, 'Addon leaves cannot exceed 50')
        .required('Addon leaves for 6 years experience is required'),
    experience7: Yup.number()
        .min(0, 'Addon leaves cannot be negative')
        .max(50, 'Addon leaves cannot exceed 50')
        .required('Addon leaves for 7 years experience is required'),
    experience8: Yup.number()
        .min(0, 'Addon leaves cannot be negative')
        .max(50, 'Addon leaves cannot exceed 50')
        .required('Addon leaves for 8 years experience is required'),
    experience9: Yup.number()
        .min(0, 'Addon leaves cannot be negative')
        .max(50, 'Addon leaves cannot exceed 50')
        .required('Addon leaves for 9 years experience is required'),
    experience10: Yup.number()
        .min(0, 'Addon leaves cannot be negative')
        .max(50, 'Addon leaves cannot exceed 50')
        .required('Addon leaves for 10 years experience is required'),
    experiencePlus10: Yup.number()
        .min(0, 'Addon leaves cannot be negative')
        .max(50, 'Addon leaves cannot exceed 50')
        .required('Addon leaves for 10+ years experience is required'),
}).strict(true);

function AddonLeavesAllowanceForm({ onClose }: { onClose?: () => void }) {
    const [loading, setLoading] = useState(false);
    const [existingAllowances, setExistingAllowances] = useState<IAddonLeavesAllowance[]>([]);

    const formik = useFormik<FormValues>({
        initialValues,
        validationSchema: addonLeavesSchema,
        onSubmit: async (values) => {
            setLoading(true);
            try {
                const allowancesToUpsert: IAddonLeavesAllowanceCreate[] = [
                    { experienceInCompany: 1, addonLeavesCount: values.experience1 },
                    { experienceInCompany: 2, addonLeavesCount: values.experience2 },
                    { experienceInCompany: 3, addonLeavesCount: values.experience3 },
                    { experienceInCompany: 4, addonLeavesCount: values.experience4 },
                    { experienceInCompany: 5, addonLeavesCount: values.experience5 },
                    { experienceInCompany: 6, addonLeavesCount: values.experience6 },
                    { experienceInCompany: 7, addonLeavesCount: values.experience7 },
                    { experienceInCompany: 8, addonLeavesCount: values.experience8 },
                    { experienceInCompany: 9, addonLeavesCount: values.experience9 },
                    { experienceInCompany: 10, addonLeavesCount: values.experience10 },
                    { experienceInCompany: 11, addonLeavesCount: values.experiencePlus10 },
                ];

                const result = await upsertAddonLeavesAllowances(allowancesToUpsert);
                
                if (result.success) {
                    const createdCount = result.data.filter(item => item.action === 'created').length;
                    const updatedCount = result.data.filter(item => item.action === 'updated').length;
                    const errorCount = result.data.filter(item => item.action === 'error').length;
                    
                    let message = 'Addon leaves allowances processed successfully!';
                    // if (createdCount > 0) message += ` Created: ${createdCount}.`;
                    // if (updatedCount > 0) message += ` Updated: ${updatedCount}.`;
                    // if (errorCount > 0) message += ` Errors: ${errorCount}.`;
                    
                    await successConfirmation(message);
                    
                    // Refresh data
                    await loadExistingAllowances();
                    
                    if (onClose) onClose();
                } else {
                    throw new Error('Failed to process addon leaves allowances');
                }
            } catch (error: any) {
                console.error('Error saving addon leaves allowances:', error);
                await errorConfirmation(
                    error?.response?.data?.message || 
                    error?.message || 
                    'Failed to save addon leaves allowances'
                );
            } finally {
                setLoading(false);
            }
        },
    });

    const loadExistingAllowances = async () => {
        try {
            const response = await fetchAllAddonLeavesAllowances();
            console.log("responseresponsone:: ", response);
            
            if (!response.hasError && response.data?.addonLeavesAllowances) {
                const allowances = response.data.addonLeavesAllowances;
                setExistingAllowances(allowances);
                
                // Pre-populate form with existing values
                const formValues: FormValues = {
                    experience1: allowances.find((a: IAddonLeavesAllowance) => a.experienceInCompany === 1)?.addonLeavesCount || 0,
                    experience2: allowances.find((a: IAddonLeavesAllowance) => a.experienceInCompany === 2)?.addonLeavesCount || 0,
                    experience3: allowances.find((a: IAddonLeavesAllowance) => a.experienceInCompany === 3)?.addonLeavesCount || 0,
                    experience4: allowances.find((a: IAddonLeavesAllowance) => a.experienceInCompany === 4)?.addonLeavesCount || 0,
                    experience5: allowances.find((a: IAddonLeavesAllowance) => a.experienceInCompany === 5)?.addonLeavesCount || 0,
                    experience6: allowances.find((a: IAddonLeavesAllowance) => a.experienceInCompany === 6)?.addonLeavesCount || 0,
                    experience7: allowances.find((a: IAddonLeavesAllowance) => a.experienceInCompany === 7)?.addonLeavesCount || 0,
                    experience8: allowances.find((a: IAddonLeavesAllowance) => a.experienceInCompany === 8)?.addonLeavesCount || 0,
                    experience9: allowances.find((a: IAddonLeavesAllowance) => a.experienceInCompany === 9)?.addonLeavesCount || 0,
                    experience10: allowances.find((a: IAddonLeavesAllowance) => a.experienceInCompany === 10)?.addonLeavesCount || 0,
                    experiencePlus10: allowances.find((a: IAddonLeavesAllowance) => a.experienceInCompany === 11)?.addonLeavesCount || 0,
                };
                
                formik.setValues(formValues);
            }
        } catch (error) {
            console.error('Error loading existing allowances:', error);
        }
    };

    useEffect(() => {
        loadExistingAllowances();
    }, []);

    const getFieldStatus = (experienceYear: number) => {
        const existing = existingAllowances.find(a => a.experienceInCompany === experienceYear);
        return existing ? 'Will Update' : 'Will Create';
    };

    return (
        <KTCard>
            <KTCardBody className='py-4'>
                <form onSubmit={formik.handleSubmit} noValidate className='form'>
                    <div className="text-center mb-5">
                        <h2 className="fw-bolder text-dark">Configure Addon Leaves Allowance</h2>
                        <div className="text-muted fw-bold fs-6">
                            Set additional leave days based on employee experience
                        </div>
                    </div>

                    <div className="row g-4">
                        {/* 1 Year Experience */}
                        <div className="col-md-6">
                            <div className="fv-row">
                                <label className="form-label fw-bolder text-dark fs-6 required">
                                    1 Year Experience
                                    <span className="badge badge-light-info ms-2">
                                        {getFieldStatus(1)}
                                    </span>
                                </label>
                                <input
                                    type="number"
                                    className={`form-control form-control-lg form-control-solid ${
                                        formik.touched.experience1 && formik.errors.experience1 ? 'is-invalid' : ''
                                    }`}
                                    placeholder="Enter addon leaves for 1 year experience"
                                    {...formik.getFieldProps('experience1')}
                                />
                                {formik.touched.experience1 && formik.errors.experience1 && (
                                    <div className="fv-plugins-message-container">
                                        <div className="fv-help-block">
                                            <span role="alert">{formik.errors.experience1}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 2 Years Experience */}
                        <div className="col-md-6">
                            <div className="fv-row">
                                <label className="form-label fw-bolder text-dark fs-6 required">
                                    2 Years Experience
                                    <span className="badge badge-light-info ms-2">
                                        {getFieldStatus(2)}
                                    </span>
                                </label>
                                <input
                                    type="number"
                                    className={`form-control form-control-lg form-control-solid ${
                                        formik.touched.experience2 && formik.errors.experience2 ? 'is-invalid' : ''
                                    }`}
                                    placeholder="Enter addon leaves for 2 years experience"
                                    {...formik.getFieldProps('experience2')}
                                />
                                {formik.touched.experience2 && formik.errors.experience2 && (
                                    <div className="fv-plugins-message-container">
                                        <div className="fv-help-block">
                                            <span role="alert">{formik.errors.experience2}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 3 Years Experience */}
                        <div className="col-md-6">
                            <div className="fv-row">
                                <label className="form-label fw-bolder text-dark fs-6 required">
                                    3 Years Experience
                                    <span className="badge badge-light-info ms-2">
                                        {getFieldStatus(3)}
                                    </span>
                                </label>
                                <input
                                    type="number"
                                    className={`form-control form-control-lg form-control-solid ${
                                        formik.touched.experience3 && formik.errors.experience3 ? 'is-invalid' : ''
                                    }`}
                                    placeholder="Enter addon leaves for 3 years experience"
                                    {...formik.getFieldProps('experience3')}
                                />
                                {formik.touched.experience3 && formik.errors.experience3 && (
                                    <div className="fv-plugins-message-container">
                                        <div className="fv-help-block">
                                            <span role="alert">{formik.errors.experience3}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 4 Years Experience */}
                        <div className="col-md-6">
                            <div className="fv-row">
                                <label className="form-label fw-bolder text-dark fs-6 required">
                                    4 Years Experience
                                    <span className="badge badge-light-info ms-2">
                                        {getFieldStatus(4)}
                                    </span>
                                </label>
                                <input
                                    type="number"
                                    className={`form-control form-control-lg form-control-solid ${
                                        formik.touched.experience4 && formik.errors.experience4 ? 'is-invalid' : ''
                                    }`}
                                    placeholder="Enter addon leaves for 4 years experience"
                                    {...formik.getFieldProps('experience4')}
                                />
                                {formik.touched.experience4 && formik.errors.experience4 && (
                                    <div className="fv-plugins-message-container">
                                        <div className="fv-help-block">
                                            <span role="alert">{formik.errors.experience4}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 5 Years Experience */}
                        <div className="col-md-6">
                            <div className="fv-row">
                                <label className="form-label fw-bolder text-dark fs-6 required">
                                    5 Years Experience
                                    <span className="badge badge-light-info ms-2">
                                        {getFieldStatus(5)}
                                    </span>
                                </label>
                                <input
                                    type="number"
                                    className={`form-control form-control-lg form-control-solid ${
                                        formik.touched.experience5 && formik.errors.experience5 ? 'is-invalid' : ''
                                    }`}
                                    placeholder="Enter addon leaves for 5 years experience"
                                    {...formik.getFieldProps('experience5')}
                                />
                                {formik.touched.experience5 && formik.errors.experience5 && (
                                    <div className="fv-plugins-message-container">
                                        <div className="fv-help-block">
                                            <span role="alert">{formik.errors.experience5}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 6 Years Experience */}
                        <div className="col-md-6">
                            <div className="fv-row">
                                <label className="form-label fw-bolder text-dark fs-6 required">
                                    6 Years Experience
                                    <span className="badge badge-light-info ms-2">
                                        {getFieldStatus(6)}
                                    </span>
                                </label>
                                <input
                                    type="number"
                                    className={`form-control form-control-lg form-control-solid ${
                                        formik.touched.experience6 && formik.errors.experience6 ? 'is-invalid' : ''
                                    }`}
                                    placeholder="Enter addon leaves for 6 years experience"
                                    {...formik.getFieldProps('experience6')}
                                />
                                {formik.touched.experience6 && formik.errors.experience6 && (
                                    <div className="fv-plugins-message-container">
                                        <div className="fv-help-block">
                                            <span role="alert">{formik.errors.experience6}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 7 Years Experience */}
                        <div className="col-md-6">
                            <div className="fv-row">
                                <label className="form-label fw-bolder text-dark fs-6 required">
                                    7 Years Experience
                                    <span className="badge badge-light-info ms-2">
                                        {getFieldStatus(7)}
                                    </span>
                                </label>
                                <input
                                    type="number"
                                    className={`form-control form-control-lg form-control-solid ${
                                        formik.touched.experience7 && formik.errors.experience7 ? 'is-invalid' : ''
                                    }`}
                                    placeholder="Enter addon leaves for 7 years experience"
                                    {...formik.getFieldProps('experience7')}
                                />
                                {formik.touched.experience7 && formik.errors.experience7 && (
                                    <div className="fv-plugins-message-container">
                                        <div className="fv-help-block">
                                            <span role="alert">{formik.errors.experience7}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 8 Years Experience */}
                        <div className="col-md-6">
                            <div className="fv-row">
                                <label className="form-label fw-bolder text-dark fs-6 required">
                                    8 Years Experience
                                    <span className="badge badge-light-info ms-2">
                                        {getFieldStatus(8)}
                                    </span>
                                </label>
                                <input
                                    type="number"
                                    className={`form-control form-control-lg form-control-solid ${
                                        formik.touched.experience8 && formik.errors.experience8 ? 'is-invalid' : ''
                                    }`}
                                    placeholder="Enter addon leaves for 8 years experience"
                                    {...formik.getFieldProps('experience8')}
                                />
                                {formik.touched.experience8 && formik.errors.experience8 && (
                                    <div className="fv-plugins-message-container">
                                        <div className="fv-help-block">
                                            <span role="alert">{formik.errors.experience8}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 9 Years Experience */}
                        <div className="col-md-6">
                            <div className="fv-row">
                                <label className="form-label fw-bolder text-dark fs-6 required">
                                    9 Years Experience
                                    <span className="badge badge-light-info ms-2">
                                        {getFieldStatus(9)}
                                    </span>
                                </label>
                                <input
                                    type="number"
                                    className={`form-control form-control-lg form-control-solid ${
                                        formik.touched.experience9 && formik.errors.experience9 ? 'is-invalid' : ''
                                    }`}
                                    placeholder="Enter addon leaves for 9 years experience"
                                    {...formik.getFieldProps('experience9')}
                                />
                                {formik.touched.experience9 && formik.errors.experience9 && (
                                    <div className="fv-plugins-message-container">
                                        <div className="fv-help-block">
                                            <span role="alert">{formik.errors.experience9}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 10 Years Experience */}
                        <div className="col-md-6">
                            <div className="fv-row">
                                <label className="form-label fw-bolder text-dark fs-6 required">
                                    10 Years Experience
                                    <span className="badge badge-light-info ms-2">
                                        {getFieldStatus(10)}
                                    </span>
                                </label>
                                <input
                                    type="number"
                                    className={`form-control form-control-lg form-control-solid ${
                                        formik.touched.experience10 && formik.errors.experience10 ? 'is-invalid' : ''
                                    }`}
                                    placeholder="Enter addon leaves for 10 years experience"
                                    {...formik.getFieldProps('experience10')}
                                />
                                {formik.touched.experience10 && formik.errors.experience10 && (
                                    <div className="fv-plugins-message-container">
                                        <div className="fv-help-block">
                                            <span role="alert">{formik.errors.experience10}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 10+ Years Experience */}
                        <div className="col-md-6">
                            <div className="fv-row">
                                <label className="form-label fw-bolder text-dark fs-6 required">
                                    10+ Years Experience
                                    <span className="badge badge-light-info ms-2">
                                        {getFieldStatus(11)}
                                    </span>
                                </label>
                                <input
                                    type="number"
                                    className={`form-control form-control-lg form-control-solid ${
                                        formik.touched.experiencePlus10 && formik.errors.experiencePlus10 ? 'is-invalid' : ''
                                    }`}
                                    placeholder="Enter addon leaves for 10+ years experience"
                                    {...formik.getFieldProps('experiencePlus10')}
                                />
                                {formik.touched.experiencePlus10 && formik.errors.experiencePlus10 && (
                                    <div className="fv-plugins-message-container">
                                        <div className="fv-help-block">
                                            <span role="alert">{formik.errors.experiencePlus10}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Info Section */}
                    <div className="alert alert-primary d-flex align-items-center mt-5">
                        <i className="ki-duotone ki-information-5 fs-2hx text-primary me-4">
                            <span className="path1"></span>
                            <span className="path2"></span>
                            <span className="path3"></span>
                        </i>
                        <div className="d-flex flex-column">
                            <h4 className="mb-1 text-dark">How it works</h4>
                            <span>
                                The system will automatically create new records for experience levels that don't exist, 
                                and update existing records. Each employee's addon leaves will be calculated based on 
                                their years of experience in the company.
                            </span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="text-center pt-5">
                        <button
                            type="reset"
                            onClick={() => {
                                formik.resetForm();
                                if (onClose) onClose();
                            }}
                            className="btn btn-light me-3"
                            disabled={loading}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading || !formik.isValid}
                        >
                            <span className="indicator-label">
                                {loading ? 'Saving...' : 'Save Configuration'}
                            </span>
                            {loading && (
                                <span className="indicator-progress">
                                    Please wait...
                                    <span className="spinner-border spinner-border-sm align-middle ms-2"></span>
                                </span>
                            )}
                        </button>
                    </div>
                </form>
            </KTCardBody>
        </KTCard>
    );
}

export default AddonLeavesAllowanceForm;
