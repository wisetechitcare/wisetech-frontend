

import {FC} from 'react'
import clsx from 'clsx'
import {useLayout} from '../core'
import {KTIcon} from "@metronic/helpers";

const Footer: FC = () => {
  const {classes} = useLayout()
  return (
    <div className={'footer py-1 d-flex flex-lg-column'} id='kt_footer'>
      {/*begin::Container*/}
      <div className={clsx(classes.footerContainer, 'd-flex flex-column flex-md-row flex-stack')}>
        {/*begin::Copyright*/}
        <div className='text-gray-900 order-2 order-md-1'>
          <span className='text-gray-500 me-1'>Build with ❤️ by</span>
          <a
            href='https://wisetech-mep.com/'
            target='_blank'
            className='text-muted text-hover-primary me-2 fs-6'
          >
            WISETECH MEP
          </a>
        </div>
        {/*end::Copyright*/}

        {/*begin::Menu*/}
        {/* <ul className='menu menu-gray-600 menu-hover-primary order-1'>
          <li className='menu-item'>
            <a href='https://keenthemes.com/metronic' target='_blank' className='menu-link px-2'>
              <KTIcon iconName='setting-2' className='fs-4 me-2' /> Settings
            </a>
          </li>
          <li className='menu-item'>
            <a href='https://keenthemes.com/metronic' target='_blank' className='menu-link px-2'>
              <KTIcon iconName='update-file' className='fs-4 me-2' /> Updates
            </a>
          </li>
          <li className='menu-item'>
            <a href='https://keenthemes.com/metronic' target='_blank' className='menu-link px-2'>
              <KTIcon iconName='question-2' className='fs-4 me-2' /> Help 
            </a>
          </li>
          <li className='menu-item'>
            <a href='https://keenthemes.com/metronic' target='_blank' className='menu-link px-2'>
              <div className='footer__status'></div> Status
            </a>
          </li>
        </ul> */}
        {/*end::Menu*/}
      </div>
      {/*end::Container*/}
    </div>
  )
}

export {Footer}
