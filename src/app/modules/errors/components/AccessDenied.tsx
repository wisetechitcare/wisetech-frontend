import {FC} from 'react'
import {Link} from 'react-router-dom'
import {isSectionBlocked} from '@utils/accessAreas'

const AccessDenied: FC = () => {
  // Dashboard is itself a blockable section - if it's the one blocked, a
  // "Return Home" link pointing there would just bounce the employee straight
  // back to this same page. Drop the link entirely in that case rather than
  // send them into a dead-end loop.
  const canReturnHome = !isSectionBlocked('dashboard')

  return (
    <>
      {/* begin::Title */}
      <h1 className='fw-bolder fs-2hx text-gray-900 mb-4'>Access Denied</h1>
      {/* end::Title */}

      {/* begin::Text */}
      <div className='fw-semibold fs-6 text-gray-500 mb-7'>You don't have permission to view this page.</div>
      {/* end::Text */}

      {/* begin::Illustration */}
      <div className='mb-3'>
        <i className='bi bi-shield-lock' style={{fontSize: '10rem', color: 'var(--bs-gray-300)'}} />
      </div>
      {/* end::Illustration */}

      {/* begin::Link */}
      {canReturnHome && (
        <div className='mb-0'>
          <Link to='/dashboard' className='btn btn-sm btn-primary'>
            Return Home
          </Link>
        </div>
      )}
      {/* end::Link */}
    </>
  )
}

export {AccessDenied}
