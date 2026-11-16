
import {FC} from 'react'
import {toAbsoluteUrl} from '../../../../../../../_metronic/helpers'
import {User} from '../../core/_models'
import { SmartAvatar } from '@/ds/ui/smart-avatar'

type Props = {
  user: User
}

const UserInfoCell: FC<Props> = ({user}) => (
  <div className='d-flex align-items-center'>
    {/* begin:: Avatar */}
    <a href='#' className='me-3 inline-flex'>
      <SmartAvatar
        name={user.name}
        src={user.avatar ? toAbsoluteUrl(`media/${user.avatar}`) : null}
        seed={user.id}
        size={50}
        decorative
      />
    </a>
    <div className='d-flex flex-column'>
      <a href='#' className='text-gray-800 text-hover-primary mb-1'>
        {user.name}
      </a>
      <span>{user.email}</span>
    </div>
  </div>
)

export {UserInfoCell}
