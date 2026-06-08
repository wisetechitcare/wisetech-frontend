import clsx from 'clsx';
import { useFormik } from 'formik';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as Yup from 'yup';
import { resetPassword } from '@services/auth';
import { useDispatch } from 'react-redux';
import { removeAuth } from '../core/AuthHelpers';
import { logoutUser } from '@redux/slices/auth';
import {toAbsoluteUrl} from '@metronic/helpers/AssetHelpers'

const resetPasswordSchema = Yup.object().shape({
    password: Yup.string().required('Password is required').min(8, 'Password should have atleast 8 characters'),
    confirmPassword: Yup.string().required('Confirm your password field is required')
        .min(8, 'Password should have atleast 8 characters')
        .oneOf([Yup.ref('password')], 'Both password should match'),
});

const initialValues = {
    password: '',
    confirmPassword: '',
}

function ResetPasswordForm() {
    const [loading, setLoading] = useState(false)
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const resetToken = searchParams.get('token') || ''
    const dispatch = useDispatch()

    const formik = useFormik({
        initialValues,
        validationSchema: resetPasswordSchema,
        onSubmit: async (values, { setStatus, setSubmitting }) => {
            setLoading(true)
            await resetPassword(values.password, values.confirmPassword, resetToken)
            navigate('/auth/')
            removeAuth()
            dispatch(logoutUser())
            try {
                setLoading(false)
            } catch (error: any) {
                setStatus(error?.response.data.detail)
                setSubmitting(false)
                setLoading(false)
            }
        },
    })

    return (
        <form
            className='form w-100'
            onSubmit={formik.handleSubmit}
            noValidate
            id='kt_login_signin_form'
        >

            {formik.status ? (
                <div className='mb-lg-15 alert alert-danger'>
                    <div className='alert-text font-weight-bold'>{formik.status}</div>
                </div>
            ) : null}

            {/* begin::Form group */}
            <div className='fv-row mb-8'>
                <label className='form-label fs-6 fw-bolder text-gray-900'>Password</label>
                <input
                    placeholder='Password'
                    {...formik.getFieldProps('password')}
                    className={clsx(
                        'form-control bg-transparent',
                        { 'is-invalid': formik.touched.password && formik.errors.password },
                        {
                            'is-valid': formik.touched.password && !formik.errors.password,
                        }
                    )}
                    type='password'
                    name='password'
                    autoComplete='off'
                />
                {formik.touched.password && formik.errors.password && (
                    <div className='fv-plugins-message-container'>
                        <span role='alert'>{formik.errors.password}</span>
                    </div>
                )}
            </div>
            {/* end::Form group */}

            {/* begin::Form group */}
            <div className='fv-row mb-3'>
                <label className='form-label fw-bolder text-gray-900 fs-6 mb-0'>Confirm Password</label>
                <input
                    placeholder='Confirm Password'
                    type='password'
                    autoComplete='off'
                    {...formik.getFieldProps('confirmPassword')}
                    className={clsx(
                        'form-control bg-transparent',
                        {
                            'is-invalid': formik.touched.confirmPassword && formik.errors.confirmPassword,
                        },
                        {
                            'is-valid': formik.touched.confirmPassword && !formik.errors.confirmPassword,
                        }
                    )}
                />
                {formik.touched.confirmPassword && formik.errors.confirmPassword && (
                    <div className='fv-plugins-message-container'>
                        <div className='fv-help-block'>
                            <span role='alert'>{formik.errors.confirmPassword}</span>
                        </div>
                    </div>
                )}
            </div>
            {/* end::Form group */}


            {/* begin::Action */}
            <div className='d-grid mb-10 mt-10'>
                <button
                    type='submit'
                    id='kt_sign_in_submit'
                    className='btn btn-primary'
                    disabled={formik.isSubmitting || !formik.isValid}
                >
                    {!loading && <span className='indicator-label'>Continue</span>}
                    {loading && (
                        <span className='indicator-progress' style={{ display: 'block' }}>
                            Please wait...
                            <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
                        </span>
                    )}
                </button>
            </div>
            {/* end::Action */}
        </form>
    );
}

export function ResetPassword() {
    return (
        <div className="d-flex flex-column flex-lg-row flex-column-fluid login__page">
        <div className="d-flex flex-lg-row-fluid">
            <div className="d-flex flex-column flex-center pb-0 pb-lg-10 p-10 w-100">
            {/* <img className="mx-auto" src={logoSrc}/> */}
            <img className="mx-auto" src="https://s3-alpha-sig.figma.com/img/0297/f193/b24c43c071d3513e8bd14747a84a90ed?Expires=1723420800&Key-Pair-Id=APKAQ4GOSFWCVNEHN3O4&Signature=etsmWMpOPinqqZnjiW49Uim8~GdThnHgTqa21sdwTqaxzRMkHrwR5YJXBTeHqZPjo46haAg6v2Ni1f1WfWbtZqUHD2DYs3GDlFGTp46ZGkNVttxj40~DcXVItHxd6cL43j-ZcPIjHhgxniQC5VBOg9maFzSwVDr9b9qTQEZv5KOeF5-~R9NjC9-aNN9lVZAMvLx0zJWG4Sc520DHlXxA5YFt64k9sDo7xRJ62IpYc69xrwndiI9200mrIxZ3luKC0szEbKTXibKXGPH1YHrxhnEOQMLYegJm4UGxfN8gHnFNEzAwHusvoGXBhDjpemBSxCtJEuLJ8CEIQsRTaC~d1Q__"/>
                <img className="mx-auto w-150px w-lg-500px" src={toAbsoluteUrl("media/login/WTgif.gif")}/>
                <h1 className="fs-1qx text-center mb-5 text-uppercase login__subtitle">Fast, Efficient and Productive</h1>
                <h3 className="text-gray-800 fs-2qx fw-bold text-center mb-7"> All-in-one employee management solution for startups</h3>
            </div>
        </div>
        <div className="d-flex flex-column-fluid flex-lg-row-auto justify-content-center justify-content-lg-end p-12">
            <div className="bg-body d-flex flex-column flex-center rounded-4 w-md-600px p-10 login__form__wrapper">
            <div className="d-flex flex-center flex-column align-items-stretch h-lg-100 w-md-400px">
                <div className="d-flex flex-center flex-column flex-column-fluid">
                <div className="text-center mb-11">
                    <h1 className="text-gray-900 fw-bolder mb-3">Reset Password</h1>
                    <div className="text-gray-500 fw-semibold fs-6">
                    Enter your new password.
                    </div>
                </div>
                <ResetPasswordForm/>
                </div>
                <div className="d-flex justify-content-center">
                <div className="d-flex text-primary fs-base gap-5">
                    <a href="/" target="_blank">FAQs</a>
                    <a href="/" target="_blank">Plans</a>
                    <a href="/" target="_blank">Contact Us</a>
                </div>
                </div>
            </div>
            </div>
        </div>
        </div>
    )
}
export default ResetPassword;