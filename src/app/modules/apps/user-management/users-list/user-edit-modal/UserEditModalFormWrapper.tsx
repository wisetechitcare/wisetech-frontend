import {useQuery} from '@tanstack/react-query'
import {useEffect} from 'react'
import {UserEditModalForm} from './UserEditModalForm'
import {isNotEmpty, QUERIES} from '../../../../../../_metronic/helpers'
import {useListView} from '../core/ListViewProvider'
import {getUserById} from '../core/_requests'

const UserEditModalFormWrapper = () => {
  const {itemIdForUpdate, setItemIdForUpdate} = useListView()
  const enabledQuery: boolean = isNotEmpty(itemIdForUpdate)
  const {
    isLoading,
    data: user,
    error,
  } = useQuery({
    queryKey: [`${QUERIES.USERS_LIST}-user-${itemIdForUpdate}`],
    queryFn: () => getUserById(itemIdForUpdate),
    gcTime: 0,
    enabled: enabledQuery,
  })

  useEffect(() => {
    if (error) {
      setItemIdForUpdate(undefined)
      console.error(error)
    }
  }, [error])

  if (!itemIdForUpdate) {
    return <UserEditModalForm isUserLoading={isLoading} user={{id: undefined}} />
  }

  if (!isLoading && !error && user) {
    return <UserEditModalForm isUserLoading={isLoading} user={user} />
  }

  return null
}

export {UserEditModalFormWrapper}
