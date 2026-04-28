import { useEffect, useState } from "react";
import * as Yup from "yup";
import { useDispatch, useSelector } from "react-redux";
import { useFormik } from "formik";
import clsx from "clsx";
import { Link } from "react-router-dom";
import { login } from "@services/auth";
import { fetchCurrentUser } from "@services/users";
import { fetchCurrentEmployeeByUserId } from "@services/employee";
import { fetchCompanyLogo } from "@services/company";
import { saveCurrentEmployee } from "@redux/slices/employee";
import { redirect, saveCurrentUser, saveToken } from "@redux/slices/auth";
import { RootState } from "@redux/store";
import { getAvatar } from "@utils/avatar";
import { setAuth } from "../core/AuthHelpers";
import { toAbsoluteUrl } from "@metronic/helpers";
// import { FaEye, FaEyeSlash } from 'react-icons/fa'

const loginSchema = Yup.object().shape({
  email: Yup.string()
    .email("Wrong email format")
    .min(3, "Minimum 3 symbols")
    .max(50, "Maximum 50 symbols")
    .required("Email is required"),
  password: Yup.string()
    .min(3, "Minimum 3 symbols")
    .max(50, "Maximum 50 symbols")
    .required("Password is required"),
});

const initialValues = {
  email: "",
  password: "",
};

function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const dispatch = useDispatch();
  const currEmployee = useSelector(
    (state: RootState) => state.employee.currentEmployee
  );

  const formik = useFormik({
    initialValues,
    validationSchema: loginSchema,
    onSubmit: async (values, { setStatus, setSubmitting }) => {
      setLoading(true);
      try {
        const { data: loginRes } = await login(values.email, values.password);
        dispatch(saveToken(loginRes.token));
        setAuth(loginRes);
        const { data: currUserRes } = await fetchCurrentUser(loginRes.id);
        dispatch(saveCurrentUser(currUserRes.user));
        if (!currEmployee.id) {
          const { data: currEmpRes } = await fetchCurrentEmployeeByUserId(
            currUserRes.user.id
          );
          const { employee } = currEmpRes;
          let avatar = getAvatar(employee.avatar, employee.gender);
          dispatch(saveCurrentEmployee({ ...employee, avatar }));
        }
        dispatch(redirect(true));
        localStorage.setItem("redirectToDashboard", "true");
        setLoading(false);
      } catch (error: any) {
        setStatus(error?.response.data.detail);
        setSubmitting(false);
        setLoading(false);
      }
    },
  });

  return (
    <form
      className="form w-100"
      onSubmit={formik.handleSubmit}
      noValidate
      id="kt_login_signin_form"
    >
      {formik.status ? (
        <div className="mb-lg-15 alert alert-danger">
          <div className="alert-text font-weight-bold">{formik.status}</div>
        </div>
      ) : null}
      {/* begin::Form group */}
      <div className="fv-row mb-8">
        <label className="form-label fs-6 fw-bolder text-gray-900">Email</label>
        <input
          placeholder="Email"
          {...formik.getFieldProps("email")}
          className={clsx(
            "form-control bg-transparent",
            {
              "border border-danger": formik.touched.email && formik.errors.email,
              "border border-success": formik.touched.email && !formik.errors.email,
            }
          )}
          
          type="email"
          name="email"
          autoComplete="off"
        />
        {formik.touched.email && formik.errors.email && (
          <div className="fv-plugins-message-container">
            <div className="fv-help-block">
              <span role="alert">{formik.errors.email}</span>
            </div>
          </div>
        )}
      </div>
      {/* end::Form group */}

      {/* begin::Form group */}
      <div className="fv-row mb-3 position-relative">
        <label className="form-label fw-bolder text-gray-900 fs-6 mb-0">
          Password
        </label>
        <div className="position-relative">
          <input
            placeholder="Password"
            type={showPassword ? "text" : "password"}
            autoComplete="off"
            {...formik.getFieldProps("password")}
            className={clsx(
              "form-control bg-transparent",
              {
                "border border-danger": formik.touched.password && formik.errors.password,
                "border border-success": formik.touched.password && !formik.errors.password,
              }
            )}
            
          />
          <i
            className={`bi ${
              showPassword ? "bi-eye-slash" : "bi-eye"
            } fs-3 position-absolute top-50 end-0 translate-middle-y me-3`}
            style={{ cursor: "pointer" }}
            onClick={() => setShowPassword((prev) => !prev)}
          ></i>
        </div>
        {formik.touched.password && formik.errors.password && (
          <div className="fv-plugins-message-container">
            <div className="fv-help-block">
              <span role="alert">{formik.errors.password}</span>
            </div>
          </div>
        )}
      </div>
      {/* end::Form group */}

      {/* begin::Wrapper */}
      <div className="d-flex flex-stack flex-wrap gap-3 fs-base fw-semibold mb-8">
        <div />
        {/* begin::Link */}
        <Link to="/auth/forgot-password" className="link-primary">
          Forgot Password ?
        </Link>
        {/* end::Link */}
      </div>
      {/* end::Wrapper */}
      {/* begin::Action */}
      <div className="d-grid mb-10">
        <button
          type="submit"
          id="kt_sign_in_submit"
          className="btn btn-primary"
          disabled={formik.isSubmitting || !formik.isValid}
        >
          {!loading && <span className="indicator-label">Sign In</span>}
          {loading && (
            <span className="indicator-progress" style={{ display: "block" }}>
              Please wait...
              <span className="spinner-border spinner-border-sm align-middle ms-2"></span>
            </span>
          )}
        </button>
      </div>
      {/* end::Action */}
    </form>
  );
}

export default function Login() {
  const defaultLogo =
    "https://wise-tech-asset-store.s3.ap-south-1.amazonaws.com/4100960a0f2c5e89381847e6637d3e67aa43d39330";

  const [logoSrc, setLogoSrc] = useState(defaultLogo);
  useEffect(() => {
    async function getCompanyLogo() {
      const {
        data: { logo: logoSrc },
      } = await fetchCompanyLogo();
      setLogoSrc(logoSrc);
    }

    getCompanyLogo();
  }, []);
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
            <img className="mx-auto w-200px" src={logoSrc} />
            <img
              className="mx-auto w-150px w-lg-500px w-l-300px"
              src={toAbsoluteUrl("media/login/WTgif.gif")}
            />
            <h1 className="fs-1qx text-center mb-5 mt-20 text-uppercase login__subtitle">
              Fast, Efficient and Productive
            </h1>
            <h3 className="text-gray-800 fw-semibolder fs-5 text-secondary text-center">
              {" "}
              All-in-one employee management solution for startups
            </h3>
            {/* <div className="text-gray-600 fs-base text-center fw-semibold log-para">
              In this kind of post, <a href="#" className="opacity-75-hover text-primary me-1">the blogger</a>
              introduces a person they've interviewed <br/> and provides some background information about
              <a href="#" className="opacity-75-hover text-primary me-1">the interviewee</a> and their <br/> work following this is a transcript of the interview.
            </div> */}
          </div>
        </div>
        <div className="d-flex flex-column-fluid flex-lg-row-auto justify-content-center justify-content-lg-end p-12 log2-scren">
          <div className="bg-body d-flex flex-column flex-center rounded-4 w-md-600px p-10">
            <div className="d-flex flex-center flex-column align-items-stretch h-lg-100 w-md-400px">
              <div className="d-flex flex-center flex-column flex-column-fluid">
                <div className="text-center mb-11 ">
                  <h1 className="text-gray-900 fw-bolder mb-3">Log In</h1>
                  <div className="text-gray-800 fw-semibold fs-6">
                    Managing your organization made easy!
                  </div>
                </div>
                <LoginForm />
              </div>
              <div className="d-flex justify-content-center">
                <div className="d-flex text-primary fs-base gap-4 ">
                  <a href="/" target="_blank">
                    FAQs
                  </a>
                  <a href="/" target="_blank">
                    Plans
                  </a>
                  <a href="/" target="_blank">
                    Contact Us
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
