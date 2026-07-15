
import {FC} from 'react'
import {useNavigate} from 'react-router-dom'
import {removeAuth} from '../../../../app/modules/auth'
import {useDispatch, useSelector} from 'react-redux'
import {logoutUser} from '@redux/slices/auth'
import {logout} from '@services/auth'
import {RootState} from '@redux/store'
import {KTIcon} from '../../../helpers'

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
  const currEmployee = useSelector((state: RootState) => state.employee.currentEmployee as any)
  const showAppSettings = currEmployee?.showAppSettings;

  const user = currEmployee?.users;
  const fullName = user ? `${user.firstName} ${user.lastName}` : 'User';
  const email = user?.personalEmailId || currEmployee?.companyEmailId || '';
  const avatarUrl = currEmployee?.avatar;

  async function signout() {
    // Best-effort server logout (blacklists the JWT + clears the httpOnly
    // cookie). Cookie sessions have no token in localStorage — the backend
    // resolves it from the cookie. Never strand the user locally: even if the
    // API call fails, clear local state and leave.
    try {
      await logout(parsedLs?.token, parsedLs?.id)
    } catch (error) {
      console.error('Logout API failed — clearing local session anyway:', error)
    }
    removeAuth()
    localStorage.removeItem("selectedCompany")
    localStorage.removeItem("selectedBranch")
    dispatch(logoutUser())
    navigate('/auth')
    location.reload()
  }

  return (
    <div
      className='menu menu-sub menu-sub-dropdown menu-column menu-rounded menu-gray-600 menu-state-bg menu-state-primary fw-bold fs-6 w-275px mt-3 header-user-menu-wrapper'
      data-kt-menu='true'
    >
      {/* User Info Header */}
      <div className='menu-item px-4 py-3 border-bottom d-flex align-items-center gap-3 bg-light-muted' style={{ borderRadius: '12px 12px 0 0' }}>
        <div className='symbol symbol-40px symbol-circle'>
          {avatarUrl ? (
            <img src={avatarUrl} alt='Avatar' style={{ objectFit: 'cover' }} />
          ) : (
            <span className='symbol-label bg-light-primary'>
              <KTIcon iconName='profile-circle' className='fs-2 text-primary' />
            </span>
          )}
        </div>
        <div className='d-flex flex-column min-w-0'>
          <span className='fw-bold text-gray-800 text-truncate fs-6'>{fullName}</span>
          {email && <span className='text-muted fs-8 text-truncate'>{email}</span>}
        </div>
      </div>

      <div className='py-1'>
        <div className='menu-item px-2'>
          {/* Plain href, NOT SPA navigation: Metronic's native menu handlers call
              stopPropagation() on every .menu-link click, which can race/swallow
              React's delegated onClick (navigate() silently never ran for some
              users). They never call preventDefault() on non-trigger items, so
              default browser navigation always goes through — same "hard
              navigation" reliability class as Sign Out's location.reload(). */}
          <button
            type='button'
            className='menu-link d-flex align-items-center gap-2 w-100 border-0 bg-transparent p-0'
            style={{ cursor: 'pointer', textAlign: 'left' }}
            onMouseDown={() => { window.location.href = '/employee/profile/overview'; }}
          >
            <KTIcon iconName='profile-circle' className='fs-5 text-muted' />
            My Profile
          </button>
        </div>
        {showAppSettings && (
          <div className='menu-item px-2'>
            <a
              href='/company/settings'
              className='menu-link d-flex align-items-center gap-2'
            >
              <KTIcon iconName='setting-2' className='fs-5 text-muted' />
              Settings
            </a>
          </div>
        )}
        <div className='separator my-1'></div>
        <div className='menu-item px-2'>
          <a onClick={signout} className='menu-link d-flex align-items-center gap-2 logout-link' style={{ cursor: 'pointer' }}>
            <KTIcon iconName='exit-right-corner' className='fs-5 text-danger' />
            Sign Out
          </a>
        </div>
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
