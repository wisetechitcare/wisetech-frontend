import React from 'react'
import {Link, useLocation} from 'react-router-dom'

const Tabs: React.FC = () => {
  const location = useLocation()

  return (
    <div className='d-flex overflow-auto h-55px'>
      <ul className='nav nav-stretch nav-line-tabs nav-line-tabs-2x border-transparent fs-5 fw-bolder flex-nowrap'>
        <li className='nav-item'>
          <Link
            className={
              `nav-link text-active-primary me-6 ` +
              (location.pathname === '/company/organisation-profile' && 'active')
            }
            to='/company/organisation-profile'
          >
            Organisation Profile
          </Link>
        </li>
        <li className='nav-item'>
          <Link
            className={
              `nav-link text-active-primary me-6 ` +
              (location.pathname === '/company/branding' && 'active')
            }
            to='/company/branding'
          >
            Branding
          </Link>
        </li>
      </ul>
    </div>
  )
}

export default Tabs
