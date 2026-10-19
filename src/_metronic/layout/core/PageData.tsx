/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-refresh/only-export-components */
/* eslint-disable @typescript-eslint/no-unused-vars */

import {FC, createContext, useContext, useEffect, useState} from 'react'
import {WithChildren} from '../../helpers'

export interface PageLink {
  title: string
  path: string
  isActive: boolean
  isSeparator?: boolean
}

export interface PageDataContextModel {
  pageTitle?: string
  setPageTitle: (_title: string) => void
  pageDescription?: string
  setPageDescription: (_description: string) => void
  pageBreadcrumbs?: Array<PageLink>
  setPageBreadcrumbs: (_breadcrumbs: Array<PageLink>) => void
  /** Crumbs BELOW the module in the shell breadcrumb (e.g. a project › a task). See PageTrail. */
  pageTrail?: Array<PageTrailItem>
  setPageTrail: (_trail: Array<PageTrailItem>) => void
}

export interface PageTrailItem {
  title: string
  /** Omit for the current page — the last crumb is never a link. */
  path?: string
}

const PageDataContext = createContext<PageDataContextModel>({
  setPageTitle: (_title: string) => {},
  setPageBreadcrumbs: (_breadcrumbs: Array<PageLink>) => {},
  setPageDescription: (_description: string) => {},
  setPageTrail: (_trail: Array<PageTrailItem>) => {},
})

const PageDataProvider: FC<WithChildren> = ({children}) => {
  const [pageTitle, setPageTitle] = useState<string>('')
  const [pageDescription, setPageDescription] = useState<string>('')
  const [pageBreadcrumbs, setPageBreadcrumbs] = useState<Array<PageLink>>([])
  const [pageTrail, setPageTrail] = useState<Array<PageTrailItem>>([])
  const value: PageDataContextModel = {
    pageTitle,
    setPageTitle,
    pageDescription,
    setPageDescription,
    pageBreadcrumbs,
    setPageBreadcrumbs,
    pageTrail,
    setPageTrail,
  }
  return <PageDataContext.Provider value={value}>{children}</PageDataContext.Provider>
}

function usePageData() {
  return useContext(PageDataContext)
}

type Props = {
  description?: string
  breadcrumbs?: Array<PageLink>
}

const PageTitle: FC<Props & WithChildren> = ({children, description, breadcrumbs}) => {
  const {setPageTitle, setPageDescription, setPageBreadcrumbs} = usePageData()
  useEffect(() => {
    if (children) {
      setPageTitle(children.toString())
    }
    return () => {
      setPageTitle('')
    }
  }, [children])

  useEffect(() => {
    if (description) {
      setPageDescription(description)
    }
    return () => {
      setPageDescription('')
    }
  }, [description])

  useEffect(() => {
    if (breadcrumbs) {
      setPageBreadcrumbs(breadcrumbs)
    }
    return () => {
      setPageBreadcrumbs([])
    }
  }, [breadcrumbs])

  return <></>
}

const PageDescription: FC<WithChildren> = ({children}) => {
  const {setPageDescription} = usePageData()
  useEffect(() => {
    if (children) {
      setPageDescription(children.toString())
    }
    return () => {
      setPageDescription('')
    }
  }, [children])
  return <></>
}

/**
 * Deeper crumbs for a page INSIDE a module — `Home › Project Department › Tasks › Wisetech @ R&D
 * › Load Sheet`. The shell derives everything down to the module from the nav tree; only a page
 * that sits below a module adds this, so every other page's breadcrumb is untouched.
 */
const PageTrail: FC<{items: Array<PageTrailItem>}> = ({items}) => {
  const {setPageTrail} = usePageData()
  const key = JSON.stringify(items)
  useEffect(() => {
    setPageTrail(items)
    return () => setPageTrail([])
  }, [key])
  return <></>
}

export {PageDescription, PageTitle, PageTrail, PageDataProvider, usePageData}
