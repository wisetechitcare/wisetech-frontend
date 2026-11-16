import {useQueryClient, useMutation} from '@tanstack/react-query'
import {QUERIES} from '../../../../../../../_metronic/helpers'
import {Button} from '@/ds/ui/button'
import {useListView} from '../../core/ListViewProvider'
import {useQueryResponse} from '../../core/QueryResponseProvider'
import {deleteSelectedUsers} from '../../core/_requests'

const UsersListGrouping = () => {
  const {selected, clearSelected} = useListView()
  const queryClient = useQueryClient()
  const {query} = useQueryResponse()

  const deleteSelectedItems = useMutation({
    mutationFn: () => deleteSelectedUsers(selected),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: [`${QUERIES.USERS_LIST}-${query}`]})
      clearSelected()
    },
  })

  return (
    <div className='d-flex justify-content-end align-items-center'>
      <div className='fw-bolder me-5'>
        <span className='me-2'>{selected.length}</span> Selected
      </div>

      <Button
        variant='destructive'
        onClick={async () => await deleteSelectedItems.mutateAsync()}
      >
        Delete Selected
      </Button>
    </div>
  )
}

export {UsersListGrouping}
