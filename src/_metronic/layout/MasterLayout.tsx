import {useEffect} from 'react'
import {Outlet, useLocation} from 'react-router-dom'
import {AsideDefault} from './components/aside/AsideDefault'
import {Footer} from './components/Footer'
import {HeaderWrapper} from './components/header/HeaderWrapper'
import {ScrollTop} from './components/ScrollTop'
import {Content} from './components/Content'
import {PageDataProvider} from './core'
import {ActivityDrawer, DrawerMessenger, InviteUsers, UpgradePlan} from '../partials'
import {MenuComponent} from '../assets/ts/components'

const MasterLayout = () => {
  const location = useLocation()

  useEffect(() => {
    setTimeout(() => {
      MenuComponent.reinitialization()
    }, 500)
  }, [location.key])

  return (
    <PageDataProvider>
      <div className='page d-flex flex-row flex-column-fluid'>
        <AsideDefault />
        <div className='wrapper d-flex flex-column flex-row-fluid' id='kt_wrapper'>
          <HeaderWrapper />

          <div id='kt_content' className='content d-flex flex-column flex-column-fluid p-0 m-0'>
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
      <ScrollTop />
    </PageDataProvider>
  )
}

export { MasterLayout }
