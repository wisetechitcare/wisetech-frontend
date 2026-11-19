import {useEffect} from 'react'
import {useDispatch, useSelector} from 'react-redux'

import {RootState} from '@redux/store'
import {fetchCurrentEmployeeByUserId} from '@services/employee'
import {saveCurrentEmployee} from '@redux/slices/employee'
import {saveCurrentUser} from '@redux/slices/auth'
import {saveCurrentBranchInfo, saveCurrentCompanyInfo} from '@redux/slices/company'
import {fetchCurrentUser} from '@services/users'
import { fetchRolesAndPermissions } from '@redux/slices/rolesAndPermissions'
import {SmartAvatar} from '@/ds/ui/smart-avatar'

export const HeaderEmployee = () => {
  const ls = localStorage.getItem("wise_tech_login")
  const parsedLs = ls ? JSON.parse(ls) : null
  const dispatch = useDispatch()
  const currEmployee = useSelector((state: RootState) => state.employee.currentEmployee)
  useEffect(() => {
    async function fetchCurrEmployee() {
      const { data: currEmpRes } = await fetchCurrentEmployeeByUserId(parsedLs.id)
      const { employee } = currEmpRes;
      // The REAL photo or nothing — never a placeholder: every avatar reading this falls back to initials itself.
      dispatch(saveCurrentEmployee({ ...employee, avatar: employee.avatar || "" }))
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

    }
  }, [])

  return (
    <>
      {/*begin::User*/}
      <div className='aside-user d-flex align-items-sm-center justify-content-center py-lg-5 py-0'>
        {/*begin::Symbol*/}
        <SmartAvatar
          name={`${currEmployee.users?.firstName ?? ''} ${currEmployee.users?.lastName ?? ''}`}
          seed={currEmployee.id}
          src={currEmployee.avatar}
          size={30}
        />
        <div>
          <span className='fw-bold ${fontSize} text-dark px-3 d-none d-lg-block'>
            {currEmployee.users?.firstName} {currEmployee.users?.lastName}
          </span>
        </div>

        {/*end::Symbol*/}
      </div>
      {/*end::User*/}
    </>
  )
}
