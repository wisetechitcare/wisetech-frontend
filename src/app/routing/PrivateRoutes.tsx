import { FC, lazy, Suspense, useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { MasterLayout } from '../../_metronic/layout/MasterLayout'
import TopBarProgress from 'react-topbar-progress-indicator'
import { DashboardWrapper } from '../pages/dashboard/DashboardWrapper'
import { MenuTestPage } from '../pages/MenuTestPage'
import { getCSSVariableValue } from '../../_metronic/assets/ts/_utils'
import { WithChildren } from '../../_metronic/helpers'
import BuilderPageWrapper from '../pages/layout-builder/BuilderPageWrapper'
import PublicHoliday from 'app/pages/company/PublicHoliday'
import CustomCalendar from '@pages/employee/CustomCalendar'
import Overview from '@pages/company/Overview'
import NewEmployeeWizard from '@pages/employee/wizard/NewEmployeeWizard'
import Branches from '@pages/company/Branches'
import Departments from '@pages/company/Departments'
import Document from '@pages/employee/Document'
import OrganisationProfileForm from '@pages/company/organisation/OrganisationProfileForm'
import Branding from '@pages/company/organisation/Branding'
import Designations from '@pages/company/Designation'
import OnBoardingDocs from '@pages/company/OnboardingDocs'
import PersonalAttendanceView from '@pages/employee/PersonalAttendanceView'
import EmployeesAttendanceView from '@pages/employee/EmployeesAttendanceView'
import AdminAndEmployeeReimbursementViewer from '@pages/employee/reimbursement/AdminAndEmployeeReimbursementViewer'
import Salary from '@pages/employee/salary/Salary'
import Media from '@pages/company/Media'
import EmployeeDocumentTable from '@app/modules/accounts/components/documents/EmployeeDocumentTable'
import Settings from '@pages/company/Settings'
import Calendar from '@pages/employee/calendar/Calendar'
import Announcements from '@pages/company/announcement/Announcements'
import Notifications from "@pages/employee/notifications/Notifications"
import { hasPermission } from '@utils/authAbac'
import { permissionConstToUseWithHasPermission, uiControlResourceNameMapWithCamelCase } from '@constants/statistics'
import { RootState, store } from '@redux/store'
import { fetchRolesAndPermissions } from '@redux/slices/rolesAndPermissions'
import PersonalLoan from '@pages/employee/loans/personal/PersonalLoanMain'
import PersonalLoanMain from '@pages/employee/loans/personal/PersonalLoanMain'
import LoanDetails from '@pages/employee/loans/personal/views/LoanDetails'
import EmployeesLoanMain from '@pages/employee/loans/admin/EmployeesLoanMain'
import PersonalKpiMain from '@pages/employee/kpis/personal/PersonalKpiMain'
import { useSelector } from 'react-redux'
import EmployeeTypes from '@pages/company/masters/EmployeeTypes'
import Masters from '@pages/company/masters/Masters'
import LeadsMain from '@pages/employee/leads/LeadsMain'
import ProjectsMain from '@pages/employee/projects/ProjectsMain'
import CompaniesMain from '@pages/employee/companies/CompaniesMain'
import AllCompaniesToggle from '@pages/employee/companies/companies/components/AllCompaniesToggle'
import AllProjectMainToggle from '@pages/employee/projects/project/components/AllProjectMainToggle'
import ShowEmployeeDetailsById from '@pages/employee/ShowEmployeeDetailsById'
import LeadDetails from '@pages/employee/leads/lead/LeadDetails'
import OrganisationProfileMain from '@pages/company/organisation/OrganisationProfileMain'
import ContactMainToggle from '@pages/employee/companies/contacts/components/ContactMainToggle'
import TasksMain from '@pages/employee/tasks/TasksMain'
import MyTimeSheetMain from '@pages/employee/timesheet/mytimesheet/MyTimeSheetMain'
import EmployeeTimeSheetMain from '@pages/employee/timesheet/employeetimesheet/EmployeeTimeSheetMain'
import { fetchCurrentEmployeeByEmpId } from '@services/employee'
import TimeSheetByIdOverview from '@pages/employee/timesheet/mytimesheet/component/TimeSheetByIdOverview'
import ShowEmployeeDetailsToggle from '@pages/employee/ShowEmployeeDetailsToggle'
import TaskDetails from '@pages/employee/tasks/tasks/components/TaskDetails'
import TasksMainCalenderPage from '@pages/employee/tasks/calender/TasksMainCalenderPage'
import EmployeeTeamLevelMain from '@pages/employee/tasks/employeTeamLevel/EmployeeTeamLevelMain'
import ClientContactsMain from '@pages/employee/companies/contacts/ClientContactsMain'
import ContactsNavbar from '@pages/employee/companies/contacts/contactsNavbar'
import OrganisationInfoProfileMain from '@pages/company/organisationInfo/OrganisationInfoProfileMain'

const PrivateRoutes = () => {
  const ProfilePage = lazy(() => import('../modules/profile/ProfilePage'))
  const WizardsPage = lazy(() => import('../modules/wizards/WizardsPage'))
  const AccountPage = lazy(() => import('../modules/accounts/AccountPage'))
  const WidgetsPage = lazy(() => import('../modules/widgets/WidgetsPage'))
  const ChatPage = lazy(() => import('../modules/apps/chat/ChatPage'))
  const UsersPage = lazy(() => import('../modules/apps/user-management/UsersPage'))
  const EmployeesList = lazy(() => import('@pages/employee/EmployeesList'))
  const Reimbursement = lazy(() => import('@pages/employee/reimbursement/Reimbursement'))
  const [isStored, setIsStored] = useState(false)
  const isAdmin = useSelector((state: RootState) => state.auth.currentUser?.isAdmin)
  const employeeId = useSelector(
    (state: RootState) => state.employee.currentEmployee.id
  );
  const [showAppSettings, setShowAppSettings] = useState(false);
  useEffect(() => {
    async function fetchAndStore() {
      store.dispatch(fetchRolesAndPermissions()).then(() => setIsStored(true))
    }
    fetchAndStore()
  }, [])

  async function fetchEmployeeAppVisibility(employeeId: string) {
    const response = await fetchCurrentEmployeeByEmpId(employeeId);
    // console.log("response.data:: ",response);
    if (!response.hasError) {
      setShowAppSettings(response.data?.employee?.showAppSettings);
    }
  }

  useEffect(() => {
    if (!employeeId) return;
    fetchEmployeeAppVisibility(employeeId)
  }, [employeeId])

  return (
    isStored && <Routes>
      <Route element={<MasterLayout />}>
        {/* Redirect to Dashboard after success login/registartion */}
        <Route path='auth/*' element={<Navigate to='/dashboard' />} />
        {/* Pages */}
        <Route path='dashboard' element={<DashboardWrapper />} />
        <Route path='builder' element={<BuilderPageWrapper />} />
        <Route path='menu-test' element={<MenuTestPage />} />
        {/* Lazy Modules */}
        <Route
          path='crafted/pages/profile/*'
          element={
            <SuspensedView>
              <ProfilePage />
            </SuspensedView>
          }
        />
        <Route
          path='crafted/pages/wizards/*'
          element={
            <SuspensedView>
              <WizardsPage />
            </SuspensedView>
          }
        />
        <Route
          path='crafted/widgets/*'
          element={
            <SuspensedView>
              <WidgetsPage />
            </SuspensedView>
          }
        />

        {hasPermission(uiControlResourceNameMapWithCamelCase.reimbursementsUnderFinance, permissionConstToUseWithHasPermission.readOthers) && <Route
          path='/finance/bills'
          element={
            <SuspensedView>
              <AdminAndEmployeeReimbursementViewer />
            </SuspensedView>}
        />}
        {hasPermission(uiControlResourceNameMapWithCamelCase.salaryUnderFinance, permissionConstToUseWithHasPermission.readOthers) && <Route
          path='/finance/salary'
          element={
            <SuspensedView>
              <Salary />
            </SuspensedView>}
        />}
        <Route
          path='/finance/loans'
          element={
            <SuspensedView>
              <PersonalLoanMain />
            </SuspensedView>}
        />
        <Route
          path='employee/profile/*'
          element={
            <SuspensedView>
              <AccountPage />
            </SuspensedView>
          }
        />
        <Route
          path='apps/chat/*'
          element={
            <SuspensedView>
              <ChatPage />
            </SuspensedView>
          }
        />
        <Route
          path='apps/user-management/*'
          element={
            <SuspensedView>
              <UsersPage />
            </SuspensedView>
          }
        />
        {hasPermission(uiControlResourceNameMapWithCamelCase.holidaysUnderReports, permissionConstToUseWithHasPermission.readOthers) && <Route
          path='/company/public-holiday'
          element={
            <SuspensedView>
              <PublicHoliday onClose={() => console.log('Hey')} setShowNewHolidayForm={undefined} />
            </SuspensedView>}
        />}
        <Route
          path='/company/overview'
          element={
            <SuspensedView>
              <Overview />
            </SuspensedView>}
        />
        {hasPermission(uiControlResourceNameMapWithCamelCase.branchesUnderCompany, permissionConstToUseWithHasPermission.readOthers) && <Route
          path='/company/branches'
          element={
            <SuspensedView>
              <Branches />
            </SuspensedView>}
        />}
        {hasPermission(uiControlResourceNameMapWithCamelCase.departmentsUnderCompany, permissionConstToUseWithHasPermission.readOthers) && <Route
          path='/company/departments'
          element={
            <SuspensedView>
              <Departments />
            </SuspensedView>}
        />}
        {/* <Route
          path='/company/employee-types'
          element={
            <SuspensedView>
              <Masters />
            </SuspensedView>}
        /> */}
        {showAppSettings && <Route
          path='/company/settings'
          element={
            <SuspensedView>
              <Settings />
            </SuspensedView>}
        />}
        <Route
          path='employees'
          element={
            <SuspensedView>
              <EmployeesList />
            </SuspensedView>
          }
        />
        {hasPermission(uiControlResourceNameMapWithCamelCase.calendar, permissionConstToUseWithHasPermission.readOthers) && <Route
          path='employees/calendar'
          element={
            <SuspensedView>
              <Calendar />
            </SuspensedView>
          }
        />}
        <Route
          path='employees/notifications'
          element={
            <SuspensedView>
              <Notifications />
            </SuspensedView>
          }
        />
        {hasPermission(uiControlResourceNameMapWithCamelCase.personalUnderAttendanceAndLeaves, permissionConstToUseWithHasPermission.readOthers) && <Route
          path='employee/attendance-and-leaves'
          element={
            <SuspensedView>
              <PersonalAttendanceView />
            </SuspensedView>
          }
        />}

        {hasPermission(uiControlResourceNameMapWithCamelCase.employeesUnderAttendanceAndLeaves, permissionConstToUseWithHasPermission.readOthers) && <Route
          path='employees/attendance-and-leaves'
          element={
            <SuspensedView>
              <EmployeesAttendanceView />
            </SuspensedView>
          }
        />}
        <Route
          path='employees/create-new'
          element={
            <SuspensedView>
              <NewEmployeeWizard editMode={false} openModal={true} />
            </SuspensedView>
          }
        />
        <Route
          path='employees/edit/:employeeId'
          element={
            <SuspensedView>
              <NewEmployeeWizard editMode={true} openModal={true} />
            </SuspensedView>
          }
        />
        {hasPermission(uiControlResourceNameMapWithCamelCase.documentsUnderPeople, permissionConstToUseWithHasPermission.readOthers) && <Route
          path='/employee/documents'
          element={
            <SuspensedView>
              <Document />
            </SuspensedView>}
        />}
        {hasPermission(uiControlResourceNameMapWithCamelCase.organisationProfileUnderCompany, permissionConstToUseWithHasPermission.readOthers) && <Route
          path='/company/organisation-profile'
          element={
            <SuspensedView>
              <OrganisationProfileMain />
            </SuspensedView>}
        />}
        {hasPermission(uiControlResourceNameMapWithCamelCase.organisationProfileUnderCompany, permissionConstToUseWithHasPermission.readOthers) && <Route
          path='/company/organisation-info'
          element={
            <SuspensedView>
              <OrganisationInfoProfileMain />
            </SuspensedView>}
        />}
        {hasPermission(uiControlResourceNameMapWithCamelCase.announcementsUnderCompany, permissionConstToUseWithHasPermission.readOthers) && <Route
          path='/company/announcements'
          element={
            <SuspensedView>
              <Announcements />
            </SuspensedView>}
        />}
        <Route
          path='/company/branding'
          element={
            <SuspensedView>
              <Branding />
            </SuspensedView>
          }
        />
        {hasPermission(uiControlResourceNameMapWithCamelCase.designationUnderCompany, permissionConstToUseWithHasPermission.readOthers) && <Route
          path='/company/designations'
          element={
            <SuspensedView>
              <Designations />
            </SuspensedView>
          }
        />}
        {hasPermission(uiControlResourceNameMapWithCamelCase.mediaUnderCompany, permissionConstToUseWithHasPermission.readOthers) && <Route
          path='/company/media'
          element={
            <SuspensedView>
              <Media />
            </SuspensedView>
          }
        />}
        {hasPermission(uiControlResourceNameMapWithCamelCase.mediaUnderCompany, permissionConstToUseWithHasPermission.readOthers) && <Route
          path='/company/media/:adminId'
          element={
            <SuspensedView>
              <Media />
            </SuspensedView>
          }
        />}
        {hasPermission(uiControlResourceNameMapWithCamelCase.mediaUnderCompany, permissionConstToUseWithHasPermission.readOthers) && <Route
          path='/company/media/:adminId/:employeeId'
          element={
            <SuspensedView>
              <Media />
            </SuspensedView>
          }
        />}
        {hasPermission(uiControlResourceNameMapWithCamelCase.onboardingDocumentUnderCompany, permissionConstToUseWithHasPermission.readOthers) && <Route
          path='/company/onboardingdocs'
          element={
            <SuspensedView>
              <OnBoardingDocs />
            </SuspensedView>
          }
        />}
        <Route
          path='/company/documents/:employeeId'
          element={
            <SuspensedView>
              <EmployeeDocumentTable />
            </SuspensedView>
          }
        />
        <Route
          path='/finance/loans/:loanId'
          element={
            <SuspensedView>
              <LoanDetails />
            </SuspensedView>
          }
        />
        <Route
          path='employee/report/kpis'
          element={
            <SuspensedView>
              <PersonalKpiMain />
            </SuspensedView>}
        />
        <Route
          path='/qc/leads'
          element={
            <SuspensedView>
              <LeadsMain />
            </SuspensedView>}
        />
        <Route
          path='/tasks'
          element={
            <SuspensedView>
              <TasksMain />
            </SuspensedView>
          }
        />
        <Route
          path='/tasks/timesheet'
          element={
            <SuspensedView>
              <MyTimeSheetMain />
            </SuspensedView>
          }
        />
        <Route
          path='/tasks/:taskId'
          element={
            <SuspensedView>
              <TaskDetails />
            </SuspensedView>
          }
        />
        <Route
          path='/tasks/employee-timesheet'
          element={
            <SuspensedView>
              <EmployeeTimeSheetMain />
            </SuspensedView>
          }
        />
        <Route
          path='/company/teams'
          element={
            <SuspensedView>
              <TasksMainCalenderPage />
            </SuspensedView>
          }
        />
        <Route
          path='/company/employee-level-teams'
          element={
            <SuspensedView>
              <EmployeeTeamLevelMain />
            </SuspensedView>
          }
        />

        <Route
          path='/employee/lead/:leadId'
          element={
            <SuspensedView>
              <LeadDetails />
            </SuspensedView>
          }
        />
        <Route
          path='/qc/projects'
          element={
            <SuspensedView>
              <ProjectsMain />
            </SuspensedView>
          }
        />
        <Route
          path='/qc/contacts'
          element={
            <SuspensedView>
              <ContactsNavbar />
            </SuspensedView>
          }
        />
        <Route
          path='/qc/companies'
          element={
            <SuspensedView>
              <CompaniesMain />
            </SuspensedView>
          }
        />
        <Route
          path='/companies/:companyId'
          element={
            <SuspensedView>
              <AllCompaniesToggle />
            </SuspensedView>
          }
        />
        <Route
          path='/projects/:projectId'
          element={
            <SuspensedView>
              <AllProjectMainToggle />
            </SuspensedView>
          }
        />
        <Route
          path='/employees/:employeeId'
          element={
            <SuspensedView>
              <ShowEmployeeDetailsToggle />
            </SuspensedView>
          }
        />
        <Route
          path='/contacts/:contactId'
          element={
            <SuspensedView>
              <ContactMainToggle />
            </SuspensedView>
          }
        />
        <Route
          path='/tasks/timesheet/:timesheetId/:employeeId/:startDate/:endDate'
          element={
            <SuspensedView>
              <TimeSheetByIdOverview />
            </SuspensedView>
          }
        />
        {/* Page Not Found */}
        <Route path='*' element={<Navigate to='/error/404' />} />
      </Route>
    </Routes>
  )
}

const SuspensedView: FC<WithChildren> = ({ children }) => {
  const baseColor = getCSSVariableValue('--bs-primary')
  TopBarProgress.config({
    barColors: {
      '0': baseColor,
    },
    barThickness: 5,
    shadowBlur: 5,
  })
  return <Suspense fallback={<TopBarProgress />}>{children}</Suspense>
}

export { PrivateRoutes }
