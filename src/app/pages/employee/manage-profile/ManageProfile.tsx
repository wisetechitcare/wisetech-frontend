import {PageTitle,PageLink} from '@metronic/layout/core'
import { AccountHeader } from './AccountHeader'
const accountBreadCrumbs: Array<PageLink> = [
  {
    title: 'Home',
    path: '/dashboard',
    isSeparator: false,
    isActive: false,
  },
  {
    title: '',
    path: '',
    isSeparator: true,
    isActive: false,
  },
  {
    title: 'Employee',
    path: '/employee',
    isSeparator: false,
    isActive: false,
  },
  {
    title: '',
    path: '',
    isSeparator: true,
    isActive: false,
  },
  {
    title: 'Account',
    path: '/employee/manage-profile',
    isSeparator: false,
    isActive: true,
  }
]
export default function ManageProfile() {
  return (
    <>
      <PageTitle breadcrumbs={accountBreadCrumbs}></PageTitle>
      <AccountHeader/>
    </>
  )
}
