import {useEffect, useState} from 'react'
import {useDispatch, useSelector} from 'react-redux'

import {useAuth} from '@app/modules/auth'
import {RootState} from '@redux/store'
import {fetchCurrentEmployeeByUserId} from '@services/employee'
import {saveCurrentEmployee} from '@redux/slices/employee'
import {saveCurrentUser} from '@redux/slices/auth'
import {saveCurrentBranchInfo, saveCurrentCompanyInfo} from '@redux/slices/company'
import {getAvatar} from '@utils/avatar'
import {fetchCurrentUser} from '@services/users'
import { fetchRolesAndPermissions } from '@redux/slices/rolesAndPermissions'

export const HeaderEmployee = () => {
  const {currentUser} = useAuth()
  const ls = localStorage.getItem("wise_tech_login")
  const parsedLs = ls ? JSON.parse(ls) : null
  const dispatch = useDispatch()
  const currEmployee = useSelector((state: RootState) => state.employee.currentEmployee)
  const [avatarUrl, setAvatarUrl] = useState("")
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

    }
  }, [])

  useEffect(() => {
    if (!currEmployee.id) {
      return;
    }
    const url = getAvatar(currEmployee?.avatar || "", Number(currEmployee.gender) == 0 ? 0 : Number(currEmployee.gender) == 1 ? 1 : 2)
    
    setAvatarUrl(url)
  }, [currEmployee])

  return (
    <>
      {/*begin::User*/}
      <div className='aside-user d-flex align-items-sm-center justify-content-center py-lg-5 py-0'>
        {/*begin::Symbol*/}
        <div className='symbol symbol-30px symbol-circle'>
          {avatarUrl ? (<img src={`${avatarUrl}`} alt='Avatar' style={{ objectFit: "cover" }} />) : null}
        </div>
        <div>
          <span className='fw-bold fs-6 text-dark px-3 d-none d-lg-block'>
            {currEmployee.users?.firstName} {currEmployee.users?.lastName}
          </span>
        </div>

        {/*end::Symbol*/}
      </div>
      {/*end::User*/}
    </>
  )
}