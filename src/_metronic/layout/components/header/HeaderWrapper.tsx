
import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLayout } from '../../core'
import { HeaderToolbar } from './HeaderToolbar'
import { fetchCompanyLogo } from '@services/company'
import { KTIcon } from '@metronic/helpers'
import { useMediaQuery, useTheme } from '@mui/material';


// Metronics logo and the entire top bar
export function HeaderWrapper() {
  const defaultLogo = 'https://wise-tech-asset-store-2.s3.ap-south-1.amazonaws.com/f261f9be593f79a57f10a99a0e68d23b985fc458b2'
  const { config, classes, attributes } = useLayout()
  const [logoSrc, setLogoSrc] = useState(defaultLogo)
  const { aside } = config
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
  useEffect(() => {
    async function getCompanyLogo() {
      const { data: { logo: logoSrc } } = await fetchCompanyLogo();      
      setLogoSrc(logoSrc);
    }

    getCompanyLogo();
  }, [])

  return (
    <div
      id='kt_header'
      className={clsx('header', classes.header.join(' '), 'align-items-stretch')}
      {...attributes.headerMenu}
    >

      <div className='header-brand justify-content-left position-relative bg-white'>

        {isMobile && (
          <div className='d-flex w-100 justify-content-between align-items-center px-3 mb-5'>
            {/* Left side: Hamburger menu */}
            <div
              className='btn btn-icon btn-active-color-primary w-30px h-30px'
              id='kt_aside_mobile_toggle'
              title='Show aside menu'
            >
              <KTIcon iconName='abstract-14' className='fs-1' />
            </div>

            {/* Right side: HeaderToolbar */}
            <HeaderToolbar />
          </div>
        )}

        <Link to='/' className='d-none d-lg-block'>
          <img
            alt='Logo'
            src={logoSrc}
            className='h-30px h-lg-40px'
            title='logo'
          />
        </Link>


        {aside.minimize && (
          <div
            id='kt_aside_toggle'
            className='btn btn-icon w-auto px-0 btn-active-color-primary aside-minimize position-absolute end-0 mx-5'
            data-kt-toggle='true'
            data-kt-toggle-state='active'
            data-kt-toggle-target='body'
            data-kt-toggle-name='aside-minimize'
          >
            <KTIcon iconName='exit-left' className='fs-2qx me-n1 minimize-default' />
            <KTIcon iconName='entrance-left' className='fs-2qx minimize-active' />
          </div>
        )}
      </div>
      {!isMobile && <HeaderToolbar />}
    </div>
  )
}
