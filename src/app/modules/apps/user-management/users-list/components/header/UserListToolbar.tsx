import {KTIcon} from '../../../../../../../_metronic/helpers'
import {Button} from '@/ds/ui/button'
import {useListView} from '../../core/ListViewProvider'
import {UsersListFilter} from './UsersListFilter'

const UsersListToolbar = () => {
  const {setItemIdForUpdate} = useListView()
  const openAddUserModal = () => {
    setItemIdForUpdate(null)
  }

  return (
    <div className='d-flex justify-content-end' data-kt-user-table-toolbar='base'>
      <UsersListFilter />

      {/* begin::Export */}
      <Button variant='tinted' className='me-3'>
        <span data-icon='inline-start' className='inline-flex'>
          <KTIcon iconName='exit-up' className='fs-2' />
        </span>
        Export
      </Button>
      {/* end::Export */}

      {/* begin::Add user */}
      <Button onClick={openAddUserModal}>
        <span data-icon='inline-start' className='inline-flex'>
          <KTIcon iconName='plus' className='fs-2' />
        </span>
        Add User
      </Button>
      {/* end::Add user */}
    </div>
  )
}

export {UsersListToolbar}
