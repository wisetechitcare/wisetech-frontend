import {KTIcon, toAbsoluteUrl} from '../../../helpers'
import {Button} from '@/ds/ui/button'
import {HeaderNotificationsMenu, HeaderUserMenu, QuickLinks} from '../../../partials'

const AsideFooter = () => {
  return (
    <div
      className='aside-footer d-flex flex-column align-items-center flex-column-auto'
      id='kt_aside_footer'
    >
      {/* begin::Quick links */}
      <div className='d-flex align-items-center mb-2'>
        {/* begin::Menu wrapper */}
        <Button
          variant='ghost'
          size='icon'
          aria-label='Quick links'
          data-kt-menu-trigger='click'
          data-kt-menu-overflow='true'
          data-kt-menu-placement='top-start'
          data-bs-toggle='tooltip'
          data-bs-placement='right'
          data-bs-dismiss='click'
          title='Quick links'
        >
          <KTIcon iconName='element-plus' className='fs-2 text-lg-1' />
        </Button>
        {/* end::Menu wrapper */}
        <QuickLinks backgroundUrl='media/misc/pattern-1.jpg' />
      </div>
      {/* end::Quick links */}

      {/* begin::Activities */}
      <div className='d-flex align-items-center mb-3'>
        {/* begin::Drawer toggle */}
        <Button
          variant='ghost'
          size='icon'
          aria-label='Activity Logs'
          data-kt-menu-trigger='click'
          data-kt-menu-overflow='true'
          data-kt-menu-placement='top-start'
          data-bs-toggle='tooltip'
          data-bs-placement='right'
          data-bs-dismiss='click'
          title='Activity Logs'
          id='kt_activities_toggle'
        >
          <KTIcon iconName='chart-simple' className='fs-2 text-lg-1' />
        </Button>
        {/* end::drawer toggle */}
      </div>
      {/* end::Activities */}

      {/* begin::Notifications */}
      <div className='d-flex align-items-center mb-2'>
        {/* begin::Menu wrapper */}
        <Button
          variant='ghost'
          size='icon'
          aria-label='Notifications'
          data-kt-menu-trigger='click'
          data-kt-menu-overflow='true'
          data-kt-menu-placement='top-start'
          data-bs-toggle='tooltip'
          data-bs-placement='right'
          data-bs-dismiss='click'
          title='Notifications'
        >
          <KTIcon iconName='element-11' className='fs-2 text-lg-1' />
        </Button>
        {/* end::Menu wrapper */}
        <HeaderNotificationsMenu backgrounUrl='media/misc/pattern-1.jpg' />
      </div>
      {/* end::Notifications */}

      {/* begin::User */}
      <div className='d-flex align-items-center mb-10' id='kt_header_user_menu_toggle'>
        {/* begin::Menu wrapper */}
        <div
          className='cursor-pointer symbol symbol-40px'
          data-kt-menu-trigger='click'
          data-kt-menu-overflow='false'
          data-kt-menu-placement='top-start'
          title='User profile'
        >
          <img src={toAbsoluteUrl('media/svg/avatars/001-boy.svg')} alt='avatar' />
        </div>
        {/* end::Menu wrapper */}
        <HeaderUserMenu />
      </div>
      {/* end::User */}
    </div>
  )
}

export {AsideFooter}
