import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { useLocation } from 'react-router'
import { KTIcon } from '../../../_metronic/helpers'
import { fetchEmployeeProfileData } from '@services/employee'
import { RootState } from '@redux/store'
import { fetchCountryName, fetchStateName } from '@services/options'
import { getAvatar } from '@utils/avatar'

const AccountHeader: React.FC = () => {
  const location = useLocation()
  const employeeId = useSelector((state: RootState) => state.employee.currentEmployee.id)
  const [profileData, setProfileData] = useState();
  const profile = profileData as any;

  const [countryName, setCountryName] = useState('');
  const [stateName, setStateName] = useState('');
  const [cityName, setCityName] = useState('');

  useEffect(() => {
    if (!employeeId) return;

    async function fetchProfileData() {
      const { data: { employeeProfile } } = await fetchEmployeeProfileData(employeeId)
      setProfileData(employeeProfile);

      const countryName = await fetchCountryName(employeeProfile.EmployeeAddressDetails[0].permanentCountry);
      setCountryName(countryName.name);

      const stateName = await fetchStateName(employeeProfile.EmployeeAddressDetails[0].permanentCountry, employeeProfile.EmployeeAddressDetails[0].permanentState);
      setStateName(stateName.name);

      setCityName(employeeProfile?.EmployeeAddressDetails[0].presentAddressLine1 || employeeProfile?.EmployeeAddressDetails[0].presentAddressLine2)

    }

    fetchProfileData();
  }, [employeeId])

  if (!profileData) return;
  
  
  return (
    <>
      <div className='card mb-5 mb-xl-10'>
        <div className='card-body pt-9 pb-0'>
          <div className='d-flex flex-wrap flex-sm-nowrap mb-3'>
            <div className='me-7 mb-4'>
              <div className='symbol symbol-100px symbol-lg-160px symbol-fixed position-relative'>
                <img className='rounded-circle object-fit-contain' src={getAvatar(profile.avatar, profile.gender)} alt='User Profile Picture' />
              </div>
            </div>

            <div className='flex-grow-1'>
              <div className='d-flex justify-content-between align-items-start flex-wrap mb-2'>
                <div className='d-flex flex-column'>
                  <div className='d-flex align-items-center mb-2'>
                    <a href='#' className='text-gray-800 text-hover-primary fs-2 fw-bolder me-1'>
                      {`${profile.users.firstName} ${profile.users.lastName}`}
                    </a>
                    <a href='#'>
                      <KTIcon iconName='verify' className='fs-1 text-primary' />
                    </a>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '600',
                        backgroundColor: 'white',
                        color: profile?.roles[0]?.isActive ? '#3ECD45' : '#8A8A8A',
                        border: profile?.roles[0]?.isActive ? '2px solid #3ECD45' : '2px solid #8A8A8A',
                        marginLeft: '8px',
                      }}
                    >
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: profile?.roles[0]?.isActive ? '#3ECD45' : '#8A8A8A',
                          marginRight: '6px',
                        }}
                      />
                      {profile?.roles[0]?.isActive ? 'Active' : 'Inactive'}
                    </span>
                    {/* <a
                      href='#'
                      className='btn btn-sm btn-light-success fw-bolder ms-2 fs-8 py-1 px-3'
                      data-bs-toggle='modal'
                      data-bs-target='#kt_modal_upgrade_plan'
                    >
                      Upgrade to Pro
                    </a> */}
                  </div>

                  <div className='d-flex flex-wrap fw-bold fs-6 mb-4 pe-2'>
                    <a
                      href='#'
                      className='d-flex align-items-center text-gray-700 text-hover-primary me-5 mb-2'
                    >
                      <KTIcon iconName='profile-circle' className='fs-4 me-1' />
                      {profile?.designations?.role || '-'}
                    </a>
                    <a
                      href='#'
                      className='d-flex align-items-center text-gray-700 text-hover-primary me-5 mb-2'
                    >
                      <KTIcon iconName='geolocation' className='fs-4 me-1' />
                      {(stateName && countryName) ? `${cityName} ,${stateName}, ${countryName}` : '-'}
                    </a>
                    <a
                      href='#'
                      className='d-flex align-items-center text-gray-700 text-hover-primary mb-2'
                    >
                      <KTIcon iconName='sms' className='fs-4 me-1 text-gray-700' />
                      {profile.companyEmailId || '-'}
                    </a>
                  </div>
                </div>

                {/* <div className='d-flex my-4'>
                  <a href='#' className='btn btn-sm btn-light me-2' id='kt_user_follow_button'>
                    <KTIcon iconName='check' className='fs-3 d-none' />

                    <span className='indicator-label'>Follow</span>
                    <span className='indicator-progress'>
                      Please wait...
                      <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
                    </span>
                  </a>
                  <a
                    href='#'
                    className='btn btn-sm btn-primary me-3'
                    data-bs-toggle='modal'
                    data-bs-target='#kt_modal_offer_a_deal'
                  >
                    Hire Me
                  </a>
                  <div className='me-0'>
                    <button
                      className='btn btn-sm btn-icon btn-bg-light btn-active-color-primary'
                      data-kt-menu-trigger='click'
                      data-kt-menu-placement='bottom-end'
                      data-kt-menu-flip='top-end'
                    >
                      <i className='bi bi-three-dots fs-3'></i>
                    </button>
                    <Dropdown1 />
                  </div>
                </div> */}
              </div>

              <div className='d-flex flex-wrap flex-stack'>
                <div className='d-flex flex-column flex-grow-1 pe-8 invisible'>
                  <div className='d-flex flex-wrap'>
                    <div className='border border-gray-300 border-dashed rounded min-w-125px py-3 px-4 me-6 mb-3'>
                      <div className='d-flex align-items-center'>
                        <KTIcon iconName='arrow-up' className='fs-3 text-success me-2' />
                        <div className='fs-2 fw-bolder'>4500$</div>
                      </div>

                      <div className='fw-bold fs-6 text-gray-500'>Earnings</div>
                    </div>

                    <div className='border border-gray-300 border-dashed rounded min-w-125px py-3 px-4 me-6 mb-3'>
                      <div className='d-flex align-items-center'>
                        <KTIcon iconName='arrow-down' className='fs-3 text-danger me-2' />
                        <div className='fs-2 fw-bolder'>75</div>
                      </div>

                      <div className='fw-bold fs-6 text-gray-500'>Projects</div>
                    </div>

                    <div className='border border-gray-300 border-dashed rounded min-w-125px py-3 px-4 me-6 mb-3'>
                      <div className='d-flex align-items-center'>
                        <KTIcon iconName='arrow-up' className='fs-3 text-success me-2' />
                        <div className='fs-2 fw-bolder'>60%</div>
                      </div>

                      <div className='fw-bold fs-6 text-gray-500'>Success Rate</div>
                    </div>
                  </div>
                </div>

                <div className='d-flex align-items-center justify-content-end w-200px w-sm-300px flex-column mt-3'>
                  <div className='d-flex justify-content-between w-100 mt-auto mb-2'>
                    <span className='fw-bold fs-6 text-gray-500'>Profile Completion</span>
                    <span className='fw-bolder fs-6'>100%</span>
                  </div>
                  <div className='h-5px mx-3 w-100 bg-light mb-3'>
                    <div
                      className='bg-success rounded h-5px'
                      role='progressbar'
                      style={{ width: '100%' }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className='d-flex overflow-auto h-55px'>
            <ul className='nav nav-stretch nav-line-tabs nav-line-tabs-2x border-transparent fs-5 fw-bolder flex-nowrap'>
              <li className='nav-item'>
                <Link
                  className={
                    `nav-link text-active-primary me-6 ` +
                    (location.pathname === '/employee/profile/overview' && 'active')
                  }
                  to='/employee/profile/overview'
                >
                  Overview
                </Link>
              </li>
              <li className='nav-item'>
                <Link
                  className={
                    `nav-link text-active-primary me-6 ` +
                    (location.pathname === '/employee/profile/edit' && 'active')
                  }
                  to='/employee/profile/edit'
                >
                  Edit Profile
                </Link>
              </li>
              <li className='nav-item'>
                <Link
                  className={
                    `nav-link text-active-primary me-6 ` +
                    (location.pathname === '/employee/profile/documents' && 'active')
                  }
                  to='/employee/profile/documents'
                >
                  Documents
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </>
  )
}

export { AccountHeader }
