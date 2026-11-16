
import {FC} from 'react'
import {KTIcon} from '../../../../../_metronic/helpers'
import { SmartAvatar } from '@/ds/ui/smart-avatar'
import {ChatInner, Dropdown1} from '../../../../../_metronic/partials'
import { AppIcon } from '@app/modules/common/components/ui/AppIcon';
import { Button } from '@/ds/ui/button';

const Group: FC = () => {
  return (
    <>
      <div className='d-flex flex-column flex-lg-row'>
        <div className='flex-column flex-lg-row-auto w-100 w-lg-300px w-xl-400px mb-10 mb-lg-0'>
          <div className='card card-flush'>
            <div className='card-header pt-7' id='kt_chat_contacts_header'>
              <form className='w-100 position-relative' autoComplete='off'>
                <KTIcon
                  iconName='magnifier'
                  className='fs-2 text-lg-1 text-gray-500 position-absolute top-50 ms-5 translate-middle-y'
                />

                <input
                  type='text'
                  className='form-control form-control-solid px-15'
                  name='search'
                  placeholder='Search by username or email...'
                />
              </form>
            </div>

            <div className='card-body pt-5' id='kt_chat_contacts_body'>
              <div
                className='scroll-y me-n5 pe-5 h-200px h-lg-auto'
                data-kt-scroll='true'
                data-kt-scroll-activate='{default: false, lg: true}'
                data-kt-scroll-max-height='auto'
                data-kt-scroll-dependencies='#kt_header, #kt_toolbar, #kt_footer, #kt_chat_contacts_header'
                data-kt-scroll-wrappers='#kt_content, #kt_chat_contacts_body'
                data-kt-scroll-offset='0px'
              >
                <div className='d-flex flex-stack py-4'>
                  <div className='d-flex align-items-center'>
                    <SmartAvatar name='Melody Macy' size={45} decorative />

                    <div className='ms-5'>
                      <a href='#' className='fs-5 fw-bolder text-gray-900 text-hover-primary mb-2'>
                        Melody Macy
                      </a>
                      <div className='fw-bold text-gray-500'>melody@altbox.com</div>
                    </div>
                  </div>

                  <div className='d-flex flex-column align-items-end ms-2'>
                    <span className='text-muted fs-7 mb-1'>5 hrs</span>
                  </div>
                </div>

                <div className='separator separator-dashed d-none'></div>

                <div className='d-flex flex-stack py-4'>
                  <div className='d-flex align-items-center'>
                    <SmartAvatar name='Max Smith' size={45} decorative />

                    <div className='ms-5'>
                      <a href='#' className='fs-5 fw-bolder text-gray-900 text-hover-primary mb-2'>
                        Max Smith
                      </a>
                      <div className='fw-bold text-gray-500'>max@kt.com</div>
                    </div>
                  </div>

                  <div className='d-flex flex-column align-items-end ms-2'>
                    <span className='text-muted fs-7 mb-1'>20 hrs</span>
                  </div>
                </div>

                <div className='separator separator-dashed d-none'></div>

                <div className='d-flex flex-stack py-4'>
                  <div className='d-flex align-items-center'>
                    <SmartAvatar name='Sean Bean' size={45} decorative />

                    <div className='ms-5'>
                      <a href='#' className='fs-5 fw-bolder text-gray-900 text-hover-primary mb-2'>
                        Sean Bean
                      </a>
                      <div className='fw-bold text-gray-500'>sean@dellito.com</div>
                    </div>
                  </div>

                  <div className='d-flex flex-column align-items-end ms-2'>
                    <span className='text-muted fs-7 mb-1'>20 hrs</span>
                    <span className='badge badge-sm badge-circle badge-light-success'>6</span>
                  </div>
                </div>

                <div className='separator separator-dashed d-none'></div>

                <div className='d-flex flex-stack py-4'>
                  <div className='d-flex align-items-center'>
                    <SmartAvatar name='Brian Cox' size={45} decorative />

                    <div className='ms-5'>
                      <a href='#' className='fs-5 fw-bolder text-gray-900 text-hover-primary mb-2'>
                        Brian Cox
                      </a>
                      <div className='fw-bold text-gray-500'>brian@exchange.com</div>
                    </div>
                  </div>

                  <div className='d-flex flex-column align-items-end ms-2'>
                    <span className='text-muted fs-7 mb-1'>20 hrs</span>
                  </div>
                </div>

                <div className='separator separator-dashed d-none'></div>

                <div className='d-flex flex-stack py-4'>
                  <div className='d-flex align-items-center'>
                    <SmartAvatar name='Mikaela Collins' size={45} decorative />

                    <div className='ms-5'>
                      <a href='#' className='fs-5 fw-bolder text-gray-900 text-hover-primary mb-2'>
                        Mikaela Collins
                      </a>
                      <div className='fw-bold text-gray-500'>mikaela@pexcom.com</div>
                    </div>
                  </div>

                  <div className='d-flex flex-column align-items-end ms-2'>
                    <span className='text-muted fs-7 mb-1'>1 day</span>
                  </div>
                </div>

                <div className='separator separator-dashed d-none'></div>

                <div className='d-flex flex-stack py-4'>
                  <div className='d-flex align-items-center'>
                    <SmartAvatar name='Francis Mitcham' size={45} decorative />

                    <div className='ms-5'>
                      <a href='#' className='fs-5 fw-bolder text-gray-900 text-hover-primary mb-2'>
                        Francis Mitcham
                      </a>
                      <div className='fw-bold text-gray-500'>f.mitcham@kpmg.com.au</div>
                    </div>
                  </div>

                  <div className='d-flex flex-column align-items-end ms-2'>
                    <span className='text-muted fs-7 mb-1'>5 hrs</span>
                    <span className='badge badge-sm badge-circle badge-light-success'>6</span>
                  </div>
                </div>

                <div className='separator separator-dashed d-none'></div>

                <div className='d-flex flex-stack py-4'>
                  <div className='d-flex align-items-center'>
                    <SmartAvatar name='Olivia Wild' size={45} status='active' decorative />

                    <div className='ms-5'>
                      <a href='#' className='fs-5 fw-bolder text-gray-900 text-hover-primary mb-2'>
                        Olivia Wild
                      </a>
                      <div className='fw-bold text-gray-500'>olivia@corpmail.com</div>
                    </div>
                  </div>

                  <div className='d-flex flex-column align-items-end ms-2'>
                    <span className='text-muted fs-7 mb-1'>1 week</span>
                  </div>
                </div>

                <div className='separator separator-dashed d-none'></div>

                <div className='d-flex flex-stack py-4'>
                  <div className='d-flex align-items-center'>
                    <SmartAvatar name='Neil Owen' size={45} decorative />

                    <div className='ms-5'>
                      <a href='#' className='fs-5 fw-bolder text-gray-900 text-hover-primary mb-2'>
                        Neil Owen
                      </a>
                      <div className='fw-bold text-gray-500'>owen.neil@gmail.com</div>
                    </div>
                  </div>

                  <div className='d-flex flex-column align-items-end ms-2'>
                    <span className='text-muted fs-7 mb-1'>20 hrs</span>
                    <span className='badge badge-sm badge-circle badge-light-success'>6</span>
                  </div>
                </div>

                <div className='separator separator-dashed d-none'></div>

                <div className='d-flex flex-stack py-4'>
                  <div className='d-flex align-items-center'>
                    <SmartAvatar name='Dan Wilson' size={45} decorative />

                    <div className='ms-5'>
                      <a href='#' className='fs-5 fw-bolder text-gray-900 text-hover-primary mb-2'>
                        Dan Wilson
                      </a>
                      <div className='fw-bold text-gray-500'>dam@consilting.com</div>
                    </div>
                  </div>

                  <div className='d-flex flex-column align-items-end ms-2'>
                    <span className='text-muted fs-7 mb-1'>2 weeks</span>
                    <span className='badge badge-sm badge-circle badge-light-warning'>9</span>
                  </div>
                </div>

                <div className='separator separator-dashed d-none'></div>

                <div className='d-flex flex-stack py-4'>
                  <div className='d-flex align-items-center'>
                    <SmartAvatar name='Emma Bold' size={45} status='active' decorative />

                    <div className='ms-5'>
                      <a href='#' className='fs-5 fw-bolder text-gray-900 text-hover-primary mb-2'>
                        Emma Bold
                      </a>
                      <div className='fw-bold text-gray-500'>emma@intenso.com</div>
                    </div>
                  </div>

                  <div className='d-flex flex-column align-items-end ms-2'>
                    <span className='text-muted fs-7 mb-1'>1 day</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className='flex-lg-row-fluid ms-lg-7 ms-xl-10'>
          <div className='card' id='kt_chat_messenger'>
            <div className='card-header' id='kt_chat_messenger_header'>
              <div className='card-title'>
                <div className='flex items-center -space-x-2'>
                  <SmartAvatar name='Sean Bean' size={35} className='ring-2 ring-background' />
                  <SmartAvatar name='Brian Cox' size={35} className='ring-2 ring-background' />
                  <SmartAvatar name='Melody Macy' size={35} className='ring-2 ring-background' />
                  <SmartAvatar name='Max Smith' size={35} className='ring-2 ring-background' />
                  <SmartAvatar name='Olivia Wild' size={35} className='ring-2 ring-background' />
                  <SmartAvatar name='Neil Owen' size={35} className='ring-2 ring-background' />
                  <SmartAvatar name='Dan Wilson' size={35} className='ring-2 ring-background' />
                  <a
                    href='#'
                    className='symbol symbol-35px symbol-circle'
                    // data-bs-toggle='modal'
                    // data-bs-target='#kt_modal_view_users'
                  >
                    <span
                      className='symbol-label fs-8 fw-bolder'
                      data-bs-toggle='tooltip'
                      data-bs-trigger='hover'
                      title='View more users'
                    >
                      +42
                    </span>
                  </a>
                </div>
              </div>

              <div className='card-toolbar'>
                <div className='me-n3'>
                  <Button
                    variant='ghost'
                    size='icon-sm'
                    aria-label='Open menu'
                    data-kt-menu-trigger='click'
                    data-kt-menu-placement='bottom-end'
                    data-kt-menu-flip='top-end'
                  >
                    <AppIcon name="bi-three-dots" className="fs-2" />
                  </Button>
                  <Dropdown1 />
                </div>
              </div>
            </div>

            <ChatInner />
          </div>
        </div>
      </div>
    </>
  )
}

export {Group}
