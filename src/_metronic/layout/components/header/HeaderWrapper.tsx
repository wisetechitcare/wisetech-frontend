
import clsx from 'clsx'
import { Link } from 'react-router-dom'
import { useLayout } from '../../core'
import { useSidebarCollapse } from '../../core/SidebarCollapseContext'
import { HeaderToolbar } from './HeaderToolbar'
import { KTIcon } from '@metronic/helpers'
import { useMediaQuery, useTheme } from '@mui/material';

// Compact WiseTech mark (favicon) shown when the sidebar is collapsed.
const WtSquareLogo = () => (
  <img
    src={`${import.meta.env.BASE_URL}WT-logo.ico`}
    className='wt-logo-square'
    alt='WiseTech'
  />
)

// Metronics logo and the entire top bar
export function HeaderWrapper() {
  // Exact asset the splash screen uses (see index.html) so the expanded sidebar
  // brand matches the loading screen instead of the org's uploaded logo.
  const splashLogo = 'https://wise-tech-asset-store-2.s3.ap-south-1.amazonaws.com/f261f9be593f79a57f10a99a0e68d23b985fc458b2'
  const { classes, attributes } = useLayout()
  const { collapsed, toggle } = useSidebarCollapse()
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));

  return (
    <div
      id='kt_header'
      className={clsx('header', classes.header.join(' '), 'align-items-stretch')}
      {...attributes.headerMenu}
    >

      <div className='header-brand justify-content-left position-relative bg-white'>

        {isMobile && (
          <div className='d-flex w-100 justify-content-between align-items-center px-3 mb-5'>
            {/* Left side: Hamburger menu */}
            <div
              className='btn btn-icon btn-active-color-primary w-30px h-30px'
              id='kt_aside_mobile_toggle'
              title='Show aside menu'
            >
              <KTIcon iconName='abstract-14' className='fs-1' />
            </div>

            {/* Right side: HeaderToolbar */}
            <HeaderToolbar />
          </div>
        )}

        <Link to='/' className='wt-brand-link d-none d-lg-flex'>
          <img
            alt='WiseTech'
            src={splashLogo}
            className='wt-logo-full'
            title='WiseTech'
          />
          <WtSquareLogo />
        </Link>

        {/* Premium collapse / expand toggle (desktop only) */}
        <button
          type='button'
          onClick={toggle}
          className='wt-aside-toggle d-none d-lg-flex'
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
            <path d='M15 6l-6 6 6 6' stroke='currentColor' strokeWidth='2.2'
              strokeLinecap='round' strokeLinejoin='round' />
          </svg>
        </button>
      </div>
      {!isMobile && <HeaderToolbar />}
    </div>
  )
}
