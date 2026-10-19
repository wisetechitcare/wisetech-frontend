import React from 'react'
import {Navigate, Outlet, Route, Routes} from 'react-router-dom'
import {PageLink, PageTitle} from '../../../_metronic/layout/core'
import {Overview} from './components/Overview'
import {Settings} from './components/settings/Settings'
import {AccountHeader} from './AccountHeader'
import EmployeeDocumentTable from './components/documents/EmployeeDocumentTable'

const accountBreadCrumbs: Array<PageLink> = [
  {
    title: 'Profile',
    path: '/employee/profile/overview',
    isSeparator: false,
    isActive: false,
  },
  {
    title: '',
    path: '',
    isSeparator: true,
    isActive: false,
  },
]

const AccountPage: React.FC = () => {
  return (
    <Routes>
      <Route
        element={
          <>
            <AccountHeader />
            <Outlet />
          </>
        }
      >
        <Route
          path='overview'
          element={
            <>
              <PageTitle breadcrumbs={accountBreadCrumbs}>Overview</PageTitle>
              <Overview />
            </>
          }
        />
        <Route
          path='edit'
          element={
            <>
              <PageTitle breadcrumbs={accountBreadCrumbs}>Settings</PageTitle>
              <Settings />
            </>
          }
        />
        <Route
          path='documents'
          element={
            <>
              <PageTitle breadcrumbs={accountBreadCrumbs}>Documents</PageTitle>
              <EmployeeDocumentTable
                message1='No Documents Uploaded By You'
                message2='Documents Uploaded By You'
              />
            </>
          }
        />
        <Route index element={<Navigate to='/employee/profile/overview' replace />} />
      </Route>
    </Routes>
  )
}

export default AccountPage
