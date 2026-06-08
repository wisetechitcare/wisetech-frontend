import {FC} from 'react'
import clsx from 'clsx'
import {Link} from 'react-router-dom'
import {useLayout} from '../../../core/LayoutProvider'
import {usePageData} from '../../../core/PageData'

const DefaultTitle: FC = () => {
  const {pageTitle, pageDescription, pageBreadcrumbs} = usePageData()
  const {config} = useLayout()
  return (
    <div className='page-title d-lg-flex d-none justify-content-center flex-column me-5 '>
      {pageBreadcrumbs &&
        pageBreadcrumbs.length > 0 &&
        (
        <ul className='breadcrumb breadcrumb-separatorless fw-bold fs-7 pt-1' >
          {Array.from(pageBreadcrumbs).map((item, index) => (
            <li
              className={clsx('breadcrumb-item', {
                'text-gray-900': !item.isSeparator && item.isActive,
                'text-muted': !item.isSeparator && !item.isActive,
              })}
              key={`${item.path}${index}`}
            >
              {!item.isSeparator ? (
                <Link className='text-muted text-hover-primary' to={item.path}>
                  {item.title}
                </Link>
              ) : (
                <span className='pesido-bread text-muted '></span>
              )}
            </li>
          ))}
          <li className='breadcrumb-item text-muted '>{pageTitle}</li>
        </ul>
      )}
    </div>
  )
}

export {DefaultTitle}
