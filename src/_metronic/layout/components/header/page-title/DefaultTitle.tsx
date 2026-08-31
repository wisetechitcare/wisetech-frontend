import {FC} from 'react'
import {Link} from 'react-router-dom'
import {usePageData} from '../../../core/PageData'
import {useNavTransform} from '@/contexts/NavTransformContext'
import {WorkspaceBreadcrumb} from '@components/workspace/components/WorkspaceBreadcrumb'

/**
 * The page heading and the one breadcrumb on screen.
 *
 * The trail has two possible sources and they disagreed, so only one renders at a time:
 *
 *   shell mode    → WorkspaceBreadcrumb, DERIVED from the navigation tree. It knows the
 *                   application level the hand-written crumbs omit, and it cannot drift.
 *                   Mounted only here — the copy that used to sit inside the workspace body
 *                   was the duplicate, and it is gone.
 *   classic mode  → `pageBreadcrumbs`, which each page supplies via <PageTitle>. Left exactly
 *                   as it was, so ~65 pages need no edit and the sidebar layout is untouched.
 *
 * The <h1> is the PAGE's own title in both modes — the shell states the application, the page
 * states itself.
 */
const DefaultTitle: FC = () => {
  const {pageTitle, pageBreadcrumbs} = usePageData()
  const {enabled: shellMode} = useNavTransform()

  return (
    <div className='wt-page-title d-none d-lg-flex flex-column justify-content-center'>
      <h1 className='wt-page-title__heading'>{pageTitle}</h1>

      {shellMode ? <WorkspaceBreadcrumb /> : pageBreadcrumbs && pageBreadcrumbs.length > 0 && (
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
