import {FC} from 'react'
import {Link} from 'react-router-dom'
import {usePageData} from '../../../core/PageData'

const DefaultTitle: FC = () => {
  const {pageTitle, pageBreadcrumbs} = usePageData()

  return (
    <div className='wt-page-title d-none d-lg-flex flex-column justify-content-center'>
      <h1 className='wt-page-title__heading'>{pageTitle}</h1>

      {pageBreadcrumbs && pageBreadcrumbs.length > 0 && (
        <ul className='wt-crumb'>
          {Array.from(pageBreadcrumbs).map((item, index) =>
            item.isSeparator ? (
              <li key={`sep-${index}`} className='wt-crumb__sep' aria-hidden>
                ›
              </li>
            ) : (
              <li
                key={`${item.path}${index}`}
                className={`wt-crumb__item${item.isActive ? ' wt-crumb__item--active' : ''}`}
              >
                <Link to={item.path}>{item.title}</Link>
              </li>
            )
          )}
          <li className='wt-crumb__sep' aria-hidden>
            ›
          </li>
          <li className='wt-crumb__item wt-crumb__item--active'>{pageTitle}</li>
        </ul>
      )}
    </div>
  )
}

export {DefaultTitle}
