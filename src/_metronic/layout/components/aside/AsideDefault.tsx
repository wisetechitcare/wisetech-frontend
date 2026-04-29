

import {FC} from 'react'
import {Link, useNavigate} from 'react-router-dom'
import {useDispatch} from 'react-redux'

import {removeAuth} from '@app/modules/auth'
import {logoutUser} from '@redux/slices/auth'
import {logout} from '@services/auth'
import {useLayout} from '../../core'
import {KTIcon} from '../../../helpers'
import {AsideMenu} from './AsideMenu'

const styles = {
  hoverStyle: {
    color: '$primary-red',
    '&:hover': { color: 'blue !important' },
  }
};

const AsideDefault: FC = () => {
  const {classes} = useLayout()
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
      id='kt_aside'
      className='aside'
      data-kt-drawer='true'
      data-kt-drawer-name='aside'
      data-kt-drawer-activate='{default: true, lg: false}'
      data-kt-drawer-overlay='true'
      data-kt-drawer-width="{default:'200px', '300px': '250px'}"
      data-kt-drawer-direction='start'
      data-kt-drawer-toggle='#kt_aside_mobile_toggle'
    >
      {/* begin::Aside Toolbarl */}
      {/* <div className='aside-toolbar flex-column-auto' id='kt_aside_toolbar'>
        <AsideToolbar />
      </div> */}
      {/* end::Aside Toolbarl */}
      {/* begin::Aside menu */}
      <div className='aside-menu flex-column-fluid z-5'>
        <AsideMenu asideMenuCSSClasses={classes.asideMenu} />
      </div>
      {/* end::Aside menu */}

      {/* begin::Footer */}
      {/* <div className='aside-footer flex-column-auto py-5' id='kt_aside_footer'>
        <a onClick={signout} className='btn btn-outline w-100' style={styles.hoverStyle} >
          <KTIcon className='fs-4 me-1' iconName='exit-right-corner' />
          <span className='btn-label'>SIGN OUT</span>
        </a>
      </div> */}
      {/* end::Footer */}
    </div>
  )
}

export {AsideDefault}
