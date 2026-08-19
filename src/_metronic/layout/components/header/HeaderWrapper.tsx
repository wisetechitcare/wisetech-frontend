
import clsx from 'clsx'
import { Link, useLocation } from 'react-router-dom'
import { isWorkspacePath, WORKSPACE_ROOT } from '@components/workspace/appSlug'
import { useLayout } from '../../core'
import { useSidebarCollapse } from '../../core/SidebarCollapseContext'
import { HeaderToolbar } from './HeaderToolbar'
import { KTIcon } from '@metronic/helpers'
import { useIsMobile } from '@components/navigation/BottomNavigation/useIsMobile'
import { useNavTransform } from '@/contexts/NavTransformContext'

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
  const { enabled: navTransformed } = useNavTransform()
  const isMobile = useIsMobile()
  // Inside the workspace shell the logo returns to the launcher rather than to '/', which
  // redirects to /home or /dashboard and would drop the user out of the shell entirely.
  // Derived from the pathname, not from the shell context: this header renders in
  // MasterLayout, ABOVE the shell provider, so it cannot consume it — and a pure predicate
  // keeps the dependency one-way (the header imports a function, not the feature).
  const { pathname } = useLocation()
  const inWorkspace = isWorkspacePath(pathname)
  const brandTo = inWorkspace ? WORKSPACE_ROOT : '/'
  const brandTitle = inWorkspace
    ? 'All applications'
    : (navTransformed ? 'Back to navigation' : 'WiseTech')

  return (
    <div
      id='kt_header'
      className={clsx('header', classes.header.join(' '), 'align-items-stretch')}
      {...attributes.headerMenu}
    >

      <div className='header-brand justify-content-left position-relative bg-white'>

        {isMobile && (
          <div className='d-flex w-100 justify-content-between align-items-center ps-3 pe-2 h-100'>
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

        {/* With Transform on there is no sidebar, so this is the way back to the
            navigation containers — `/` already redirects to /dashboard. */}
        <Link
          to={brandTo}
          className='wt-brand-link d-none d-lg-flex'
          title={brandTitle}
        >
          <img
            alt='WiseTech'
            src={splashLogo}
            className='wt-logo-full'
            title={brandTitle}
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
