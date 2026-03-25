import { ErrorMessage, Field } from "formik";
import { KTIcon } from "@metronic/helpers";

function Step1() {

    return (
        <div className='w-100'>
            <h1 className="employee__form_wizard__step_title">Choose a method</h1><br/>
            <div className='row'>
                <div className='col-lg-6'>
                    <Field
                        type='radio'
                        className='btn-check'
                        name='method'
                        value='0'
                        id='employee_onboarding_form_method_manual'
                    />
                    <label
                        className='p-7 d-flex align-items-center mb-10 employee__form_wizard__step1__label'
                        htmlFor='employee_onboarding_form_method_manual'
                    >
                        <KTIcon iconName='notepad-edit' className='fs-3x me-5' />

                        <span className='d-block text-start'>
                            <span className='text-gray-900 fw-bold d-block fs-4 mb-2'>Add Manually</span>
                            <span className='text-gray-500 fs-6'>
                                Fill in the onboarding form
                            </span>
                        </span>
                    </label>
                </div>
                <div className='col-lg-6'>
                    <Field
                        type='radio'
                        disabled
                        className='btn-check'
                        name='email_method'
                        value='1'
                        id='employee_onboarding_form_method_email'
                    />
                    <label
                        className='p-7 d-flex align-items-center mb-10 employee__form_wizard__step1__label'
                        htmlFor='employee_onboarding_form_method_email'
                    >
                        <KTIcon iconName='sms' className='fs-3x me-5' />

                        <span className='d-block text-start'>
                            <span className='text-gray-900 fw-bold d-block fs-4 mb-2'>Invite via email</span>
                            <span className='text-gray-500 fs-6'>
                                Coming soon
                            </span>
                        </span>
                    </label>
                </div>

                <div className='text-danger mt-2'>
                    <ErrorMessage name='method' />
                </div>
            </div>
        </div>
    );
}

export default Step1;