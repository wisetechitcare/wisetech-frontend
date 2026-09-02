import { FC } from 'react'
import clsx from 'clsx'
import {useLocation} from 'react-router-dom'
import {checkIsActive, KTIcon, WithChildren} from '../../../helpers'
import {useLayout} from '../../core'
import {useSidebarCollapse} from '../../core/SidebarCollapseContext'
import SVG from 'react-inlinesvg'
import {navIcon} from '@components/navigation/NavContainers/navIcons'

type Props = {
  to: string
  title: string
  icon?: string | React.ReactElement 
  fontIcon?: string
  hasBullet?: boolean
  /** `wt-sec-<accent>` — the section's accent, applied by AsideMenuMain. */
  accentClass?: string
}

const groupIcon = (fontIcon: string) => {
  const Icon = navIcon(fontIcon)
  return <Icon fontSize='inherit' />
}

const AsideMenuItemWithSub: FC<Props & WithChildren> = ({
  children,
  to,
  title,
  icon,
  fontIcon,
  hasBullet,
  accentClass,
}) => {
  const {pathname} = useLocation()
  const isActive = checkIsActive(pathname, to)
  const {config} = useLayout()
  const {aside} = config
  const {collapsed, setCollapsed} = useSidebarCollapse()

  return (
    // Always `show`: the sidebar is a static tree, not an accordion. Dropping
    // `data-kt-menu-trigger` unbinds KTMenu so nothing can collapse the group —
    // `.menu-sub-accordion` is `display:none` until the parent carries `.show`
    // (see assets/sass/core/components/menu/_base.scss), so the class pins it open.
    <div className={clsx('menu-item menu-accordion menu-tree-group show', accentClass, {here: isActive})}>
      <span
        className='menu-link'
        title={title}
        onClick={() => {
          // In the collapsed rail the sub-items are hidden — expand so they're reachable.
          if (collapsed) setCollapsed(false)
        }}
      >
        {hasBullet && (
          <span className='menu-bullet'>
            <span className='bullet bullet-dot'></span>
          </span>
        )}

        {icon && (
          <span className='menu-icon'>
            {typeof icon === 'string' ? (
              <SVG src={icon} className='menu-svg-icon' />
            ) : (
              icon
            )}
          </span>
        )}
        {/* Same glyph + chip as a leaf row — see AsideMenuItem. */}
        {fontIcon && aside.menuIcon === 'font' && (
          <span className='menu-font-icon'>{groupIcon(fontIcon)}</span>
        )}
        {/* No `menu-arrow` — there is nothing to expand or collapse. */}
        <span className='menu-title'>{title}</span>
      </span>
      <div className='menu-sub menu-sub-accordion menu-tree-children'>{children}</div>
    </div>
  )
}

export {AsideMenuItemWithSub}
