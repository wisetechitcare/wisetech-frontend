
import clsx from 'clsx'
import { Link, useLocation } from 'react-router-dom'
import { isWorkspacePath, WORKSPACE_ROOT } from '@components/workspace/appSlug'
import { useLayout } from '../../core'
import { useSidebarCollapse } from '../../core/SidebarCollapseContext'
import { HeaderToolbar } from './HeaderToolbar'
import { useIsMobile } from '@components/navigation/BottomNavigation/useIsMobile'
import { useNavTransform } from '@/contexts/NavTransformContext'
import { useHomeRootOrg } from '@hooks/useRootOrgNames'

/** Platform splash mark — used only when the tenant has no uploaded logo. */
const SPLASH_LOGO =
  'https://wise-tech-asset-store-2.s3.ap-south-1.amazonaws.com/f261f9be593f79a57f10a99a0e68d23b985fc458b2'
const WT_SQUARE = `${import.meta.env.BASE_URL}WT-logo.ico`

// Metronics logo and the entire top bar
export function HeaderWrapper() {
  // Logged-in user's tenant root logo (same home-root resolution as "<Org> Team").
  // Hardcoding the WiseTech splash made every tenant look like WISETECH in the rail.
  const homeRoot = useHomeRootOrg()
  const brandLogo = homeRoot.logo || SPLASH_LOGO
  const squareLogo = homeRoot.logo || WT_SQUARE
  const brandName = homeRoot.name || 'WiseTech'

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
    : (navTransformed ? 'Back to navigation' : brandName)

  return (
    <div
      id='kt_header'
      className={clsx('header', classes.header.join(' '), 'align-items-stretch')}
      {...attributes.headerMenu}
    >

      <div className='header-brand justify-content-left position-relative bg-white'>

        {isMobile && (
          <div className='d-flex w-100 justify-content-between align-items-center ps-3 pe-2 h-100'>
            {/* Left side: the menu button. A real hamburger — the abstract-shapes glyph it
                replaced read as an apps grid, not "open the navigation". Metronic's drawer binds
                to the id, so the element type can change without rewiring anything. */}
            <button data-wt-control="shell"
              type='button'
              className='wt-menu-toggle'
              id='kt_aside_mobile_toggle'
              aria-label='Open menu'
              title='Menu'
            >
              <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.2' strokeLinecap='round' aria-hidden='true'>
                <path d='M4 6h16' />
                <path d='M4 12h11' />
                <path d='M4 18h16' />
              </svg>
            </button>

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
            alt={brandName}
            src={brandLogo}
            className='wt-logo-full'
            title={brandTitle}
          />
          <img
            src={squareLogo}
            className='wt-logo-square'
            alt={brandName}
          />
        </Link>

        {/* Premium collapse / expand toggle (desktop only) */}
        <button data-wt-control="shell"
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
