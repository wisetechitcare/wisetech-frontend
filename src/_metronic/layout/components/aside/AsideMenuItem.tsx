import {FC, useState, useEffect } from 'react'
import clsx from 'clsx'
import {Link} from 'react-router-dom'
import {useLocation} from 'react-router'
import {checkIsActive, WithChildren} from '../../../helpers'
import {useLayout} from '../../core'
import SVG from 'react-inlinesvg'

type Props = {
  to: string
  title: string
  icon?: string
  activeIcon?: string
  fontIcon?: string
  hasBullet?: boolean
  badgeCount?: number
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
}) => {
  const {pathname} = useLocation()
  const isActive = checkIsActive(pathname, to)
  const {config} = useLayout()
  const {aside} = config

  // Track the current icon based on active state
  const [currentIcon, setCurrentIcon] = useState(icon)
  useEffect(() => {
    setCurrentIcon(isActive ? activeIcon || icon : icon)
  }, [isActive, icon, activeIcon]) 

  return (
    <div className='menu-item'>
      <Link className={clsx('menu-link without-sub', {active: isActive})} to={to}>
        {hasBullet && (
          <span className='menu-bullet'>
            <span className='bullet bullet-dot'></span>
          </span>
        )}
        {currentIcon && (
          <span className='menu-icon'>
            <SVG src={currentIcon} className='menu-svg-icon' />
          </span>
        )}
        {fontIcon && aside.menuIcon === 'font' && (
          <i className={clsx('bi fs-3', fontIcon)}></i>
        )}
        <span className='menu-title d-flex align-items-center gap-2'>
          <span>{title}</span>
          {typeof badgeCount === 'number' && badgeCount > 0 && (
            <span className='badge badge-circle badge-light-danger text-danger fw-bold fs-9'>
              {badgeCount > 99 ? '99+' : badgeCount}
            </span>
          )}
        </span>
      </Link>
      {children}
    </div>
  )
}

export {AsideMenuItem}
