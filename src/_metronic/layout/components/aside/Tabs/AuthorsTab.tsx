import {Link} from 'react-router-dom'
import {toAbsoluteUrl} from '../../../../helpers'

const authors: ReadonlyArray<{
  avatar: string
  name: string
  description: string
}> = [
  {
    avatar: 'media/svg/avatars/018-girl-9.svg',
    name: 'Emma Smith',
    description: 'Project Manager',
  },

  {
    avatar: 'media/svg/avatars/014-girl-7.svg',
    name: 'Sean Bean',
    description: 'PHP, SQLite, Artisan CLI',
  },

  {
    avatar: 'media/svg/avatars/047-girl-25.svg',
    name: 'Brian Cox',
    description: 'HTML5, jQuery, CSS3',
  },

  {
    avatar: 'media/svg/avatars/020-girl-11.svg',
    name: 'Dan Wilson',
    description: 'MangoDB, Java',
  },

  {
    avatar: 'media/svg/avatars/043-boy-18.svg',
    name: 'Natali Trump',
    description: 'NET, Oracle, MySQL',
  },

  {
    avatar: 'media/svg/avatars/029-boy-11.svg',
    name: 'Francis Mitcham',
    description: 'React, Vue',
  },

  {
    avatar: 'media/svg/avatars/001-boy.svg',
    name: 'Jessie Clarcson',
    description: 'Angular, React',
  },
]

const AuthorsTab = () => (
  <div className='mx-5'>
    {/*begin::Header*/}
    <h3 className='fw-bolder text-gray-900 mx-0 mb-10'>Authors</h3>
    {/*end::Header*/}

    {/*begin::Body*/}
    <div className='mb-12'>
      {authors.map((a) => (
        <div className='d-flex align-items-center mb-7' key={a.name}>
          {/*begin::Avatar*/}
          <div className='symbol symbol-50px me-5'>
            <img src={toAbsoluteUrl(a.avatar)} className='' alt='' />
          </div>
          {/*end::Avatar*/}

          {/*begin::Text*/}
          <div className='flex-grow-1'>
            <Link
              to='/crafted/account/overview'
              className='text-gray-900 fw-bolder text-hover-primary fs-6'
            >
              {a.name}
            </Link>
            <span className='text-muted d-block fw-bold'>{a.description}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
)

export {AuthorsTab}
