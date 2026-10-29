import {WtCloseButton} from '@/app/modules/common/components/ui/tw/WtCloseButton'
import {useListView} from '../core/ListViewProvider'

const UserEditModalHeader = () => {
  const {setItemIdForUpdate} = useListView()

  return (
    <div className='modal-header'>
      {/* begin::Modal title */}
      <h2 className='fw-bolder'>Add User</h2>
      {/* end::Modal title */}

      {/* begin::Close */}
      <WtCloseButton
        variant='plain'
        data-kt-users-modal-action='close'
        onClick={() => setItemIdForUpdate(undefined)}
      />
      {/* end::Close */}
    </div>
  )
}

export {UserEditModalHeader}
