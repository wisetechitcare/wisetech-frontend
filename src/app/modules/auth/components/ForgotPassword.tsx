import {useEffect, useState} from 'react'
import * as Yup from 'yup'
import clsx from 'clsx'
import {Link} from 'react-router-dom'
import {useFormik} from 'formik'
import {forgotPassword} from '@services/auth'
import { useDispatch } from 'react-redux'
import { redirect, saveToken } from '@redux/slices/auth'
import { setAuth } from '../core/AuthHelpers'
import {toAbsoluteUrl} from '@metronic/helpers/AssetHelpers'
import { fetchCompanyLogo } from '@services/company'

const initialValues = {
  email: '',
}

const forgotPasswordSchema = Yup.object().shape({
  email: Yup.string()
    .email('Wrong email format')
    .min(3, 'Minimum 3 symbols')
    .max(50, 'Maximum 50 symbols')
    .required('Email is required'),
})

export function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false)
  const [hasErrors, setHasErrors] = useState<boolean | undefined>(undefined)
  const [submitClick,setSubmitClick] = useState(false)
  const dispatch = useDispatch()
  const formik = useFormik({
    initialValues,
    validationSchema: forgotPasswordSchema,
    onSubmit: (values, {setStatus, setSubmitting}) => {
      setLoading(true)
      setHasErrors(undefined)
      setSubmitClick(true)
      setTimeout(() => {
        forgotPassword(values.email)
          .then(({data}) => {
            dispatch(saveToken(data.token))
            dispatch(redirect(false))
            setAuth(data)
            localStorage.setItem("redirectToDashboard", "false")
            setHasErrors(false)
            setLoading(false)
            // setSubmitClick(true)
           
          })
          .catch(() => {
            // setSubmitClick(false)
            setHasErrors(true)
            setLoading(false)
            setSubmitting(false)
            setStatus('The login detail is incorrect')
          })
      }, 1000)

       setTimeout(()=>{
              setSubmitClick(false)
        },10000)
    },
  })

  return (
    <form
      className='form w-100 fv-plugins-bootstrap5 fv-plugins-framework'
      noValidate
      id='kt_login_password_reset_form'
      onSubmit={formik.handleSubmit}
    >
      {/* begin::Title */}
      {hasErrors === true && (
        <div className='mb-lg-15 alert alert-danger'>
          <div className='alert-text font-weight-bold'>
            Sorry, looks like there are some errors detected, please try again.
          </div>
        </div>
      )}

      {hasErrors === false && (
        <div className='mb-10 bg-light-info p-8 rounded'>
          <div className='text-info'>Reset password link forwarded to respective email. Please check your email.</div>
        </div>
      )}
      {/* end::Title */}

      {/* begin::Form group */}
      <div className='fv-row mb-8'>
        <label className='form-label fw-bolder text-gray-900 fs-6'>Email</label>
        <input
          type='email'
          placeholder=''
          autoComplete='off'
          {...formik.getFieldProps('email')}
          className={clsx(
            'form-control bg-transparent',
            {'is-invalid': formik.touched.email && formik.errors.email},
            {
              'is-valid': formik.touched.email && !formik.errors.email,
            }
          )}
        />
        {formik.touched.email && formik.errors.email && (
          <div className='fv-plugins-message-container'>
            <div className='fv-help-block'>
              <span role='alert'>{formik.errors.email}</span>
            </div>
          </div>
        )}
      </div>
      {/* end::Form group */}

      {/* begin::Form group */}
      <div className='d-flex flex-wrap justify-content-center pb-lg-0'>
        <button type='submit' id='kt_password_reset_submit' className='btn btn-primary me-4' disabled={loading || !formik.isValid || submitClick}>
         {loading ? <span className='indicator-progress' style={{ display: 'block' }}>
              Please wait...
              <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
            </span> : 'Submit'}
        </button>
        <Link to='/auth/login'>
          <button
            type='button'
            id='kt_login_password_reset_form_cancel_button'
            className='btn btn-light'
            disabled={formik.isSubmitting || !formik.isValid}
          >
            Cancel
          </button>
        </Link>{' '}
      </div>
      {/* end::Form group */}
    </form>
  )
}

export function ForgotPassword() {

  const [logoSrc, setLogoSrc] = useState()
    useEffect(() => {
      async function getCompanyLogo() {
        const { data: { logo: logoSrc } } = await fetchCompanyLogo();
        setLogoSrc(logoSrc);
      }
  
      getCompanyLogo();
    }, [])


  return (
    <div className="d-flex flex-column flex-lg-row flex-column-fluid login__page">
      <style>
        {`
          @media (min-width: 1024px) and (min-height: 504px) {
            .w-l-300px {
              width: 250px !important;
            }
            .login-scren h1{
              font-size: 15px !important;
            }
            .login-scren h3{
              font-size: 14px !important;
            }
            .screen-1024px{
              width: 450px !important;
            }
            .log2-scren h1{
              font-size: 20px !important;
            }
            .log-para{
              font-size: 12px !important;
            }
            .mbb-5{
              margin-bottom: 5px !important;
            }
            .log2-scren ..form-control{
              padding: 7px 10px;
              font-size: 12px !important;
            }
            .log2-scren label{
              font-size: 13px !important;
              }
            }
            @media (min-width: 1280px) and (min-height: 631px) {
            .w-l-300px {
              width: 380px !important;
            }
            .screen-1024px {
              width: 560px !important;
            }
          }
        `}
      </style>
    <div className="d-flex flex-column flex-lg-row flex-column-fluid login__page">
      <div className="d-flex flex-lg-row-fluid">
        <div className="d-flex flex-column flex-center pb-lg-10 p-5 w-100">
          <img className="mx-auto w-200px" src={logoSrc}/>
          {/* <img className="mx-auto" src="https://s3-alpha-sig.figma.com/img/0297/f193/b24c43c071d3513e8bd14747a84a90ed?Expires=1723420800&Key-Pair-Id=APKAQ4GOSFWCVNEHN3O4&Signature=etsmWMpOPinqqZnjiW49Uim8~GdThnHgTqa21sdwTqaxzRMkHrwR5YJXBTeHqZPjo46haAg6v2Ni1f1WfWbtZqUHD2DYs3GDlFGTp46ZGkNVttxj40~DcXVItHxd6cL43j-ZcPIjHhgxniQC5VBOg9maFzSwVDr9b9qTQEZv5KOeF5-~R9NjC9-aNN9lVZAMvLx0zJWG4Sc520DHlXxA5YFt64k9sDo7xRJ62IpYc69xrwndiI9200mrIxZ3luKC0szEbKTXibKXGPH1YHrxhnEOQMLYegJm4UGxfN8gHnFNEzAwHusvoGXBhDjpemBSxCtJEuLJ8CEIQsRTaC~d1Q__"/> */}
            <img className="mx-auto w-150px w-lg-500px w-l-300px" src={toAbsoluteUrl("media/login/WTgif.gif")}/>
            <h1 className="fs-1qx text-center mb-5 mt-20 text-uppercase login__subtitle">Fast, Efficient and Productive</h1>
            <h3  className="text-gray-800 fw-semibolder fs-5 text-secondary text-center"> All-in-one employee management solution for startups</h3>
        </div>
      </div>
      <div className="d-flex flex-column-fluid flex-lg-row-auto justify-content-center justify-content-lg-end p-12">
        <div className="bg-body d-flex flex-column flex-center rounded-4 w-md-600px p-10">
          <div className="d-flex flex-center flex-column align-items-stretch h-lg-100 w-md-400px">
            <div className="d-flex flex-center flex-column flex-column-fluid">
              <div className="text-center mb-11">
                <h1 className="text-gray-900 fw-bolder">Forgot Password ?</h1>
                <div className="text-gray-800 fw-semibold fs-6">
                  Enter your email to reset your password.
                </div>
              </div>
              <ForgotPasswordForm/>
            </div>
            <div className="d-flex justify-content-center">
              <div className="d-flex text-primary fs-base gap-5 mt-6">
                <a href="/" target="_blank">FAQs</a>
                <a href="/" target="_blank">Plans</a>
                <a href="/" target="_blank">Contact Us</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  )
}