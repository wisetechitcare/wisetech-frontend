import {FC, useEffect} from 'react'
import {useLocation} from 'react-router-dom'
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
      {/* Contain page crashes so one screen can't white-out the whole app. A path change
          clears a previous error — via resetKey, NOT `key`: tabs live in the path
          (/employees/:id/projects), and a key remounted the whole page on every tab click. */}
      <ErrorBoundary resetKey={location.pathname}>
        {children}
      </ErrorBoundary>
    </div>
  )
}

export {Content}
