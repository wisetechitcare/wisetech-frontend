import {useDispatch, useSelector} from 'react-redux'
import {useAuth} from '../../../../app/modules/auth'
import {RootState} from '@redux/store'
import {useEffect} from 'react'
import {fetchCurrentEmployeeByUserId} from '@services/employee'
import {saveCurrentEmployee} from '@redux/slices/employee'
import {saveCurrentUser} from '@redux/slices/auth'
import {saveCurrentBranchInfo, saveCurrentCompanyInfo} from '@redux/slices/company'
import {getAvatar} from '@utils/avatar'
import {fetchCurrentUser} from '@services/users'
import { fetchRolesAndPermissions } from '@redux/slices/rolesAndPermissions'
import { fetchAppSettings } from '@redux/slices/appSettings'


const AsideToolbar = () => {
  const {currentUser} = useAuth()
  const ls = localStorage.getItem("wise_tech_login")
  const parsedLs = ls ? JSON.parse(ls) : null
  const dispatch = useDispatch()
  const currEmployee = useSelector((state: RootState) => state.employee.currentEmployee)

  useEffect(() => {
    async function fetchCurrEmployee() {
      const { data: currEmpRes } = await fetchCurrentEmployeeByUserId(parsedLs.id)
      const { employee } = currEmpRes;
      let avatar = getAvatar(employee.avatar, employee.gender)
      dispatch(saveCurrentEmployee({ ...employee, avatar }))
    }

    async function fetchCurrUser() {
      const { data: { user } } = await fetchCurrentUser(parsedLs.id)
      dispatch((saveCurrentUser({ ...user })))
    }

    if (!currEmployee.id) {
      fetchCurrEmployee();
      fetchCurrUser();
      const selectedCompanyLs = localStorage.getItem("selectedCompany");
      const selectedBranchLs = localStorage.getItem("selectedBranch");
      const selectedCompany = selectedCompanyLs ? JSON.parse(selectedCompanyLs) : null;
      const selectedBranch = selectedBranchLs ? JSON.parse(selectedBranchLs) : null;

      if (selectedBranch && selectedCompany) {
        dispatch(saveCurrentCompanyInfo(selectedCompany));
        dispatch(saveCurrentBranchInfo(selectedBranch));
      }
      
      dispatch(fetchRolesAndPermissions() as any)
      dispatch(fetchAppSettings() as any)
    }
  }, [])

  return (
    <>
      {/*begin::User*/}
      <div className='aside-user d-flex align-items-sm-center justify-content-center py-5'>
        {/*begin::Symbol*/}
        <div className='symbol symbol-50px'>
          <img src={currEmployee.avatar || ''} alt='Avatar' style={{ objectFit: "cover" }} />
        </div>
        {/*end::Symbol*/}

        {/*begin::Wrapper*/}
        <div className='aside-user-info flex-row-fluid flex-wrap ms-5'>
          {/*begin::Section*/}
          <div className='d-flex'>
            {/*begin::Info*/}
            <div className='flex-grow-1 me-2'>
              {/*begin::Username*/}
              <a href='#' className='text-white text-hover-primary fs-6 fw-bold'>
                {currentUser?.first_name} {currentUser?.last_name}
              </a>
              {/*end::Username*/}

              {/*begin::Description*/}
              <span className='text-gray-600 fw-bold d-block fs-8 mb-1'>{`${currEmployee?.users?.firstName} ${currEmployee?.users?.lastName}`}</span>
              {/*end::Description*/}

              {/*begin::Label*/}
              <div className='d-flex align-items-center text-success fs-9'>
                <span>{`${currEmployee?.designations?.role}`}</span>
              </div>
              {/*end::Label*/}
            </div>
            {/*end::Info*/}
          </div>
          {/*end::Section*/}
        </div>
        {/*end::Wrapper*/}
      </div>
      {/*end::User*/}
    </>
  )
}

export {AsideToolbar}
