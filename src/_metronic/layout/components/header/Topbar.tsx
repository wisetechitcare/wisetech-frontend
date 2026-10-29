
import {FC} from 'react'
import {Button} from '@/ds/ui/button'
import {KTIcon} from '../../../helpers'
import {ThemeModeSwitcher} from '../../../partials'

const Topbar: FC = () => (
  <div className='d-flex flex-shrink-0'>
    {/* begin::Invite user */}
    <div className='d-flex ms-3'>
      <Button
        variant='outline'
        className="w-40px w-md-auto"
        aria-label='New Member'
        data-bs-toggle='modal'
        data-bs-target='#kt_modal_invite_friends'
      >
        <KTIcon iconName='plus' className='fs-2 text-primary' />
        <span className='d-none d-md-inline'>New Member</span>
      </Button>
    </div>
    {/* end::Invite user */}

    {/* begin::Create app */}
    <div className='d-flex ms-3'>
      <Button
        variant='outline'
        className="w-40px w-md-auto"
        aria-label='New App'
        id='kt_toolbar_primary_button'
        data-bs-toggle='modal'
        data-bs-target='#kt_modal_create_app'
      >
        <KTIcon iconName='document' className='fs-2 text-primary' />
        <span className='d-none d-md-inline'>New App</span>
      </Button>
    </div>
    {/* end::Create app */}

    {/* begin::Theme mode */}
    <div className='d-flex align-items-center  ms-3'>
      <ThemeModeSwitcher toggleBtnClass=' flex-center bg-body btn-color-gray-600 btn-active-color-primary h-40px' />
    </div>
    {/* end::Theme mode */}

    {/* CHAT */}
    <div className='d-flex align-items-center ms-3'>
      {/* begin::Menu wrapper */}
      <Button
        size='icon'
        className='relative pulse pulse-white'
        id='kt_drawer_chat_toggle'
        aria-label='Chat'
      >
        <KTIcon iconName='message-text-2' className='fs-2' />
        <span className='pulse-ring' />
      </Button>
      {/* end::Menu wrapper */}
    </div>
  </div>
)

export {Topbar}
