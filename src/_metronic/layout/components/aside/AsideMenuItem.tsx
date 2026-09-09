import {FC} from 'react'
import clsx from 'clsx'
import {Link, useLocation} from 'react-router-dom'
import {checkIsActive, WithChildren} from '../../../helpers'
import {useLayout} from '../../core'
import {usePinnedMenu} from '../../core/PinnedMenuContext'
import SVG from 'react-inlinesvg'
import {navIcon} from '@components/navigation/NavContainers/navIcons'

type Props = {
  to: string
  title: string
  icon?: string
  activeIcon?: string
  fontIcon?: string
  hasBullet?: boolean
  badgeCount?: number
  /** Hide the pin toggle (e.g. for links without a real route). Defaults to on. */
  pinnable?: boolean
  /** `wt-sec-<accent>` — the section's accent, applied by AsideMenuMain. */
  accentClass?: string
}

/** Bootstrap-icon name -> the shell's Material glyph, sized by the chip. */
const renderFontIcon = (fontIcon: string) => {
  const Icon = navIcon(fontIcon)
  return <Icon fontSize='inherit' />
}

const AsideMenuItem: FC<Props & WithChildren> = ({
  children,
  to,
  title,
  icon,
  activeIcon,
  fontIcon,
  hasBullet = false,
  badgeCount,
  pinnable = true,
  accentClass,
}) => {
  const {pathname} = useLocation()
  const isActive = checkIsActive(pathname, to)
  const {config} = useLayout()
  const {aside} = config
  const {isPinned, togglePin} = usePinnedMenu()
  const canPin = pinnable && !!to && to !== '#'
  const pinned = isPinned(to)

  return (
    <div className={clsx('menu-item', accentClass, {'menu-item-pinnable': canPin})}>
      <Link className={clsx('menu-link without-sub', {active: isActive})} to={to} title={title}>
        {hasBullet && (
          <span className='menu-bullet'>
            <span className='bullet bullet-dot'></span>
          </span>
        )}
        {icon && (
          // Both variants are rendered once so react-inlinesvg fetches + caches them
          // up front; switching active state is then a pure CSS toggle (see the
          // .menu-svg-icon--default/--active rules in premium-layout.css) with no
          // runtime re-fetch — the icon changes instantly instead of flashing/
          // settling for a second while the active SVG loads.
          <span className='menu-icon'>
            <SVG src={icon} className='menu-svg-icon menu-svg-icon--default' />
            <SVG src={activeIcon || icon} className='menu-svg-icon menu-svg-icon--active' />
          </span>
        )}
        {fontIcon && aside.menuIcon === 'font' && (
          // The same Material glyph the workspace shell renders for this item
          // (navIcon maps the nav tree's bi-* name), so a module looks identical
          // in the rail and on its application's page. Wrapped rather than
          // classed directly: `.menu-font-icon` is the 34px chip, the glyph
          // inherits its 18px font-size and accent colour from it.
          <span className='menu-font-icon'>{renderFontIcon(fontIcon)}</span>
        )}
        <span className='menu-title flex-grow-1 d-flex align-items-center justify-content-between' style={{ width: '100%' }}>
          <span className='fw-500'>{title}</span>
          {typeof badgeCount === 'number' && badgeCount > 0 && (
            <span className='badge badge-circle bg-danger text-white fw-bold d-flex align-items-center justify-content-center' style={{ width: '16px', height: '16px', minWidth: '16px', fontSize: '9.5px', padding: 0, boxShadow: '0 2px 4px rgba(220, 38, 38, 0.2)', marginLeft: '8px', marginRight: canPin ? '22px' : '0px' }}>
              {badgeCount > 99 ? '99+' : badgeCount}
            </span>
          )}
        </span>
      </Link>
      {canPin && (
        <button
          type='button'
          className={clsx('menu-pin-btn', {pinned})}
          title={pinned ? 'Unpin from top' : 'Pin to top'}
          aria-label={pinned ? 'Unpin from top' : 'Pin to top'}
          aria-pressed={pinned}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            togglePin({to, title, icon, activeIcon})
          }}
        >
          <i className={clsx('bi', pinned ? 'bi-pin-angle-fill' : 'bi-pin-angle')}></i>
        </button>
      )}
      {children}
    </div>
  )
}

export {AsideMenuItem}
