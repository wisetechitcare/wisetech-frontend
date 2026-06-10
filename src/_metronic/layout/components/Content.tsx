import {FC, useEffect} from 'react'
import {useLocation} from 'react-router'
import clsx from 'clsx'
import {useLayout} from '../core'
import {DrawerComponent} from '../../assets/ts/components'
import {WithChildren} from '../../helpers'
import ErrorBoundary from '@app/components/ErrorBoundary'

const Content: FC<WithChildren> = ({children}) => {
  const {classes} = useLayout()
  const location = useLocation()
  useEffect(() => {
    DrawerComponent.hideAll()
  }, [location])

  return (
    <div id='kt_content_container'
    className={clsx(classes.contentContainer.join(' '))}
    >
      {/* Contain page crashes so one screen can't white-out the whole app.
          Keyed by path so navigating away clears a previous error. */}
      <ErrorBoundary key={location.pathname}>
        {children}
      </ErrorBoundary>
    </div>
  )
}

export {Content}
