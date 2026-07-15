import { FC } from 'react'
import clsx from 'clsx'
import {useLocation} from 'react-router'
import {checkIsActive, KTIcon, WithChildren} from '../../../helpers'
import {useLayout} from '../../core'
import {useSidebarCollapse} from '../../core/SidebarCollapseContext'
import SVG from 'react-inlinesvg'

type Props = {
  to: string
  title: string
  icon?: string | React.ReactElement 
  fontIcon?: string
  hasBullet?: boolean
}

const AsideMenuItemWithSub: FC<Props & WithChildren> = ({
  children,
  to,
  title,
  icon,
  fontIcon,
  hasBullet,
}) => {
  const {pathname} = useLocation()
  const isActive = checkIsActive(pathname, to)
  const {config} = useLayout()
  const {aside} = config
  const {collapsed, setCollapsed} = useSidebarCollapse()

  return (
    <div
      className={clsx('menu-item menu-accordion', {'here show': isActive})}
      data-kt-menu-trigger='click'
    >
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
        {fontIcon && aside.menuIcon === 'font' && <i className={clsx('bi fs-5 menu-font-icon', fontIcon)}></i>}
        <span className='menu-title fw-500'>{title}</span>
        <span className='menu-arrow'></span>
      </span>
      <div className={clsx('menu-sub menu-sub-accordion', {'menu-active-bg': isActive})}>
        {children}
      </div>
    </div>
  )
}

export {AsideMenuItemWithSub}
