import {useEffect} from 'react'
import {Outlet, useLocation} from 'react-router-dom'
import {AsideDefault} from './components/aside/AsideDefault'
import {Footer} from './components/Footer'
import {HeaderWrapper} from './components/header/HeaderWrapper'
import {ScrollTop} from './components/ScrollTop'
import {Content} from './components/Content'
import {PageDataProvider} from './core'
import {SidebarCollapseProvider} from './core/SidebarCollapseContext'
import {PinnedMenuProvider} from './core/PinnedMenuContext'
import {NavTransformProvider} from '@/contexts/NavTransformContext'
import {WorkspaceShellState} from '@components/workspace/WorkspaceShellContext'
import {ActivityDrawer, DrawerMessenger, InviteUsers, UpgradePlan} from '../partials'
import {MenuComponent} from '../assets/ts/components'
import {BottomNav} from '@components/navigation/BottomNavigation'
import {NotificationCenter} from '@components/notifications'
import './premium-layout.css'

const MasterLayout = () => {
  const location = useLocation()

  useEffect(() => {
    setTimeout(() => {
      MenuComponent.reinitialization()
    }, 500)
  }, [location.key])

  return (
    <PageDataProvider>
      {/* Scoped to the layout, not App — the unmount cleanup strips
          `data-nav-transform` on logout so the auth screens never carry it. */}
      <NavTransformProvider>
      {/* Shell state sits ABOVE the header: the header's breadcrumb is the shell's
          breadcrumb (see DefaultTitle), and a consumer cannot live outside its provider.
          Renders its children untouched in classic-sidebar mode. */}
      <WorkspaceShellState>
      <SidebarCollapseProvider>
      <PinnedMenuProvider>
      <div className='page d-flex flex-row flex-column-fluid'>
        <AsideDefault />
        <div className='wrapper d-flex flex-column flex-row-fluid' id='kt_wrapper'>
          <HeaderWrapper />

          <div id='kt_content' className='content d-flex flex-column flex-column-fluid p-0 m-0'>
            {/* The legacy "← All navigation" bar is gone. It existed because Transform mode
                had no standing navigation of its own; the workspace shell's application rail
                is that navigation now, and on Home the bar was pointing at the very screen
                you were already looking at. Its breadcrumb lives in WorkspaceHeader. */}

            <div className='post d-flex flex-column-fluid p-0 m-0' id='kt_post'>
              <Content>
                <Outlet />
              </Content>
            </div>
          </div>
          <Footer />
        </div>
      </div>

      {/* begin:: Drawers */}
      <ActivityDrawer />
      <DrawerMessenger />
      {/* end:: Drawers */}

      {/* begin:: Modals */}
      <InviteUsers />
      <UpgradePlan />
      {/* end:: Modals */}

      {/* Mobile-only bottom navigation (renders null on desktop) */}
      <BottomNav />

      {/* Floating notification snackbar + expandable notification center */}
      <NotificationCenter />

      <ScrollTop />
      </PinnedMenuProvider>
      </SidebarCollapseProvider>
      </WorkspaceShellState>
      </NavTransformProvider>
    </PageDataProvider>
  )
}

export { MasterLayout }
