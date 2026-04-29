
import {FC} from 'react'
import {Link, useNavigate} from 'react-router-dom'
import {removeAuth} from '../../../../app/modules/auth'
import {useDispatch} from 'react-redux'
import {logoutUser} from '@redux/slices/auth'
import {logout} from '@services/auth'

const styles = {
  hoverStyle: {
    color: '$primary-red',
    '&:hover': { color: 'blue !important' },
  }
};


const HeaderUserMenu: FC = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const ls = localStorage.getItem("wise_tech_login")
  const parsedLs = ls ? JSON.parse(ls) : null

  async function signout() {
    const response = await logout(parsedLs.token, parsedLs.id)
    if (!response.hasError) {
      removeAuth()
      localStorage.removeItem("selectedCompany")
      localStorage.removeItem("selectedBranch")
      dispatch(logoutUser())
      navigate('/auth')
      location.reload()
    }
  }

  return (
    <div
      className='menu menu-sub menu-sub-dropdown menu-column menu-rounded menu-gray-600 menu-state-bg menu-state-primary fw-bold fs-6 w-275px mt-3'
      data-kt-menu='true'
    >
      <div className='menu-item px-5 mt-3'>
        <Link to={'/employee/profile/overview'} className='menu-link px-5'>
          My Profile
        </Link>
      </div>
      <div className='aside-footer flex-column-auto py-5' id='kt_aside_footer'>
        <a onClick={signout} className='menu-item px-10 mt-3' style={{ ...styles.hoverStyle, cursor: 'pointer' }} >
          <span className='btn-label'>SIGN OUT</span>
        </a>
      </div>
      {/* <div className='menu-item px-5'>
        <Link to={'/company/public-holiday'} className='menu-link px-5'>
          Holidays
        </Link>
      </div>
      <div className='menu-item px-5'>
        <Link to={'/company/branches'} className='menu-link px-5'>
          Branches
        </Link>
      </div>
      <div className='menu-item px-5 mb-3'>
        <Link to={'/company/departments'} className='menu-link px-5'>
          Departments
        </Link>
      </div> */}

      {/* <div className='menu-item px-5'>
        <a href='#' className='menu-link px-5'>
          <span className='menu-text'>My Projects</span>
          <span className='menu-badge'>
            <span className='badge badge-light-danger badge-circle fw-bolder fs-7'>3</span>
          </span>
        </a>
      </div> */}

      {/* <div
        className='menu-item px-5'
        data-kt-menu-trigger='hover'
        data-kt-menu-placement='left-start'
        data-kt-menu-flip='bottom'
      >
        <a href='#' className='menu-link px-5'>
          <span className='menu-title'>My Subscription</span>
          <span className='menu-arrow'></span>
        </a>

        <div className='menu-sub menu-sub-dropdown w-175px py-4'>
          <div className='menu-item px-3'>
            <a href='#' className='menu-link px-5'>
              Referrals
            </a>
          </div>

          <div className='menu-item px-3'>
            <a href='#' className='menu-link px-5'>
              Billing
            </a>
          </div>

          <div className='menu-item px-3'>
            <a href='#' className='menu-link px-5'>
              Payments
            </a>
          </div>

          <div className='menu-item px-3'>
            <a href='#' className='menu-link d-flex flex-stack px-5'>
              Statements
              <i
                className='fas fa-exclamation-circle ms-2 fs-7'
                data-bs-toggle='tooltip'
                title='View your statements'
              ></i>
            </a>
          </div>

          <div className='separator my-2'></div>

          <div className='menu-item px-3'>
            <div className='menu-content px-3'>
              <label className='form-check form-switch form-check-custom form-check-solid'>
                <input
                  className='form-check-input w-30px h-20px'
                  type='checkbox'
                  value='1'
                  defaultChecked={true}
                  name='notifications'
                />
                <span className='form-check-label text-muted fs-7'>Notifications</span>
              </label>
            </div>
          </div>
        </div>
      </div> */}

      {/* <div className='separator my-2'></div> */}

      {/* <Languages /> */}

      {/* <div className='menu-item px-5 my-1'>
        <Link to='/crafted/account/settings' className='menu-link px-5'>
          Account Settings
        </Link>
      </div> */}

      {/* <div className='menu-item px-5'>
        <a onClick={signout} className='menu-link px-5'>
          Sign Out
        </a>
      </div> */}
    </div>
  )
}

export {HeaderUserMenu}
