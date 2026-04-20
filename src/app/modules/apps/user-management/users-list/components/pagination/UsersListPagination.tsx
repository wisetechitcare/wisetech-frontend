
import clsx from 'clsx'
import {useQueryResponseLoading, useQueryResponsePagination} from '../../core/QueryResponseProvider'
import {useQueryRequest} from '../../core/QueryRequestProvider'
import {PageSizeOption, PaginationState} from '../../../../../../../_metronic/helpers'
import {useMemo} from 'react'
import RowsPerPage from '../../../../../common/components/RowsPerPage'

const mappedLabel = (label: string): string => {
  if (label === '&laquo; Previous') {
    return 'Previous'
  }

  if (label === 'Next &raquo;') {
    return 'Next'
  }

  return label
}

const UsersListPagination = () => {
  const pagination = useQueryResponsePagination()
  const isLoading = useQueryResponseLoading()
  const {updateState} = useQueryRequest()

  const updatePage = (page: number | undefined | null) => {
    if (!page || isLoading || pagination.page === page) {
      return
    }
    updateState({page, items_per_page: pagination.items_per_page || 10})
  }

  const updateLimit = (items_per_page: PageSizeOption) => {
    if (isLoading) return
    updateState({page: 1, items_per_page})
  }

  const totalPages = (pagination.links?.length || 3) - 2
  const currentPage = pagination.page
  const limit = pagination.items_per_page || 10
  const total = pagination.total

  const rangeStart = total != null ? (currentPage - 1) * limit + 1 : null
  const rangeEnd = total != null ? Math.min(currentPage * limit, total) : null

  const PAGINATION_PAGES_COUNT = 5
  const sliceLinks = (pagination?: PaginationState) => {
    if (!pagination?.links?.length) {
      return []
    }

    const scopedLinks = [...pagination.links]

    let pageLinks: Array<{
      label: string
      active: boolean
      url: string | null
      page: number | null
    }> = []
    const previousLink: {label: string; active: boolean; url: string | null; page: number | null} =
      scopedLinks.shift()!
    const nextLink: {label: string; active: boolean; url: string | null; page: number | null} =
      scopedLinks.pop()!

    const halfOfPagesCount = Math.floor(PAGINATION_PAGES_COUNT / 2)

    pageLinks.push(previousLink)

    if (
      pagination.page <= Math.round(PAGINATION_PAGES_COUNT / 2) ||
      scopedLinks.length <= PAGINATION_PAGES_COUNT
    ) {
      pageLinks = [...pageLinks, ...scopedLinks.slice(0, PAGINATION_PAGES_COUNT)]
    }

    if (
      pagination.page > scopedLinks.length - halfOfPagesCount &&
      scopedLinks.length > PAGINATION_PAGES_COUNT
    ) {
      pageLinks = [
        ...pageLinks,
        ...scopedLinks.slice(scopedLinks.length - PAGINATION_PAGES_COUNT, scopedLinks.length),
      ]
    }

    if (
      !(
        pagination.page <= Math.round(PAGINATION_PAGES_COUNT / 2) ||
        scopedLinks.length <= PAGINATION_PAGES_COUNT
      ) &&
      !(pagination.page > scopedLinks.length - halfOfPagesCount)
    ) {
      pageLinks = [
        ...pageLinks,
        ...scopedLinks.slice(
          pagination.page - 1 - halfOfPagesCount,
          pagination.page + halfOfPagesCount
        ),
      ]
    }

    pageLinks.push(nextLink)

    return pageLinks
  }

  const paginationLinks = useMemo(() => sliceLinks(pagination), [pagination])

  return (
    <div className='row py-3'>
      <div className='col-sm-12 col-md-6 d-flex align-items-center justify-content-center justify-content-md-start gap-4'>
        <RowsPerPage value={limit} onChange={updateLimit} disabled={isLoading} />
        {total != null && rangeStart != null && rangeEnd != null && (
          <span style={{fontSize: '13px', color: '#7A8597', whiteSpace: 'nowrap'}}>
            Showing {rangeStart}–{rangeEnd} of {total} records
          </span>
        )}
      </div>
      <div className='col-sm-12 col-md-6 d-flex align-items-center justify-content-center justify-content-md-end'>
        <div id='kt_table_users_paginate'>
          <ul className='pagination'>
            <li
              className={clsx('page-item', {
                disabled: isLoading || pagination.page === 1,
              })}
            >
              <a onClick={() => updatePage(1)} style={{cursor: 'pointer'}} className='page-link'>
                First
              </a>
            </li>
            {paginationLinks
              ?.map((link) => {
                return {...link, label: mappedLabel(link.label)}
              })
              .map((link) => (
                <li
                  key={link.label}
                  className={clsx('page-item', {
                    active: pagination.page === link.page,
                    disabled: isLoading,
                    previous: link.label === 'Previous',
                    next: link.label === 'Next',
                  })}
                >
                  <a
                    className={clsx('page-link', {
                      'page-text': link.label === 'Previous' || link.label === 'Next',
                      'me-5': link.label === 'Previous',
                    })}
                    onClick={() => updatePage(link.page)}
                    style={{cursor: 'pointer'}}
                  >
                    {mappedLabel(link.label)}
                  </a>
                </li>
              ))}
            <li
              className={clsx('page-item', {
                disabled: isLoading || pagination.page === totalPages,
              })}
            >
              <a
                onClick={() => updatePage(totalPages)}
                style={{cursor: 'pointer'}}
                className='page-link'
              >
                Last
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export {UsersListPagination}
