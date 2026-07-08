import { FC, lazy, Suspense, useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { MasterLayout } from '../../_metronic/layout/MasterLayout'
import TopBarProgress from 'react-topbar-progress-indicator'
import { DashboardWrapper } from '../pages/dashboard/DashboardWrapper'
import { MenuTestPage } from '../pages/MenuTestPage'
import { getCSSVariableValue } from '../../_metronic/assets/ts/_utils'
import { WithChildren } from '../../_metronic/helpers'
import BuilderPageWrapper from '../pages/layout-builder/BuilderPageWrapper'
import { hasPermission } from '@utils/authAbac'
import { permissionConstToUseWithHasPermission, uiControlResourceNameMapWithCamelCase } from '@constants/statistics'
import { RootState, store } from '@redux/store'
import { fetchRolesAndPermissions } from '@redux/slices/rolesAndPermissions'
import { fetchAuthzCapabilities } from '@redux/slices/authz'
import { fetchCurrentEmployeeByEmpId } from '@services/employee'
import { useSelector } from 'react-redux'
import { NEW_MY_TEAM_IA } from '@utils/featureFlags'
import { SectionGuard } from '@app/modules/common/components/SectionGuard'
import { can } from '@utils/can'
import { usePermissionsRealtime } from '@hooks/usePermissionsRealtime'

const PublicHoliday = lazy(() => import('@pages/company/PublicHoliday'))
const CustomCalendar = lazy(() => import('@pages/employee/CustomCalendar'))
const Overview = lazy(() => import('@pages/company/Overview'))
const NewEmployeeWizard = lazy(() => import('@pages/employee/wizard/NewEmployeeWizard'))
const Branches = lazy(() => import('@pages/company/Branches'))
const Departments = lazy(() => import('@pages/company/Departments'))
const Document = lazy(() => import('@pages/employee/Document'))
const Branding = lazy(() => import('@pages/company/organisation/Branding'))
const Designations = lazy(() => import('@pages/company/Designation'))
const OnBoardingDocs = lazy(() => import('@pages/company/OnboardingDocs'))
const PersonalAttendanceView = lazy(() => import('@pages/employee/PersonalAttendanceView'))
const EmployeesAttendanceView = lazy(() => import('@pages/employee/EmployeesAttendanceView'))
const AdminAndEmployeeReimbursementViewer = lazy(() => import('@pages/employee/reimbursement/AdminAndEmployeeReimbursementViewer'))
const Salary = lazy(() => import('@pages/employee/salary/Salary'))
const Increment = lazy(() => import('@pages/employee/increment/Increment'))
const Media = lazy(() => import('@pages/company/Media'))
const EmployeeDocumentTable = lazy(() => import('@app/modules/accounts/components/documents/EmployeeDocumentTable'))
const Settings = lazy(() => import('@pages/company/Settings'))
const Calendar = lazy(() => import('@pages/employee/calendar/Calendar'))
const Announcements = lazy(() => import('@pages/company/announcement/Announcements'))
const Notifications = lazy(() => import('@pages/employee/notifications/Notifications'))
const PersonalLoanMain = lazy(() => import('@pages/employee/loans/personal/PersonalLoanMain'))
const LoanDetails = lazy(() => import('@pages/employee/loans/personal/views/LoanDetails'))
const EmployeesLoanMain = lazy(() => import('@pages/employee/loans/admin/EmployeesLoanMain'))
const PersonalKpiMain = lazy(() => import('@pages/employee/kpis/personal/PersonalKpiMain'))
const LeadsMain = lazy(() => import('@pages/employee/leads/LeadsMain'))
// Opt-in beta: migrated EnterpriseForm wizard (parallel to classic LeadFormModal)
const LeadWizardBetaPage = lazy(() => import('@pages/employee/leads/lead/LeadWizardBetaPage'))
const ProjectsMain = lazy(() => import('@pages/employee/projects/ProjectsMain'))
const CompaniesMain = lazy(() => import('@pages/employee/companies/CompaniesMain'))
const AllCompaniesToggle = lazy(() => import('@pages/employee/companies/companies/components/AllCompaniesToggle'))
// Unified Entity (Lead = Project): one detail page for both; legacy
// /projects/:id URLs resolve to the owning lead via ProjectEntityRedirect.
const EntityDetailPage = lazy(() => import('@pages/employee/entity/EntityDetailPage'))
const ProjectEntityRedirect = lazy(() => import('@pages/employee/entity/ProjectEntityRedirect'))
const OrganisationProfileMain = lazy(() => import('@pages/company/organisation/OrganisationProfileMain'))
const OrganizationProfilePage = lazy(() => import('@pages/company/organisation/OrganizationProfilePage'))
const ContactMainToggle = lazy(() => import('@pages/employee/companies/contacts/components/ContactMainToggle'))
const TasksMain = lazy(() => import('@pages/employee/tasks/TasksMain'))
const MyTimeSheetMain = lazy(() => import('@pages/employee/timesheet/mytimesheet/MyTimeSheetMain'))
const EmployeeTimeSheetMain = lazy(() => import('@pages/employee/timesheet/employeetimesheet/EmployeeTimeSheetMain'))
const TimeSheetByIdOverview = lazy(() => import('@pages/employee/timesheet/mytimesheet/component/TimeSheetByIdOverview'))
const ShowEmployeeDetailsToggle = lazy(() => import('@pages/employee/ShowEmployeeDetailsToggle'))
const TaskDetails = lazy(() => import('@pages/employee/tasks/tasks/components/TaskDetails'))
const TasksMainCalenderPage = lazy(() => import('@pages/employee/tasks/calender/TasksMainCalenderPage'))
const EmployeeTeamLevelMain = lazy(() => import('@pages/employee/tasks/employeTeamLevel/EmployeeTeamLevelMain'))
const ContactsNavbar = lazy(() => import('@pages/employee/companies/contacts/contactsNavbar'))
const OrganisationInfoProfileMain = lazy(() => import('@pages/company/organisationInfo/OrganisationInfoProfileMain'))
const SearchResultsPage = lazy(() => import('@pages/employee/search/SearchResultsPage'))
const ProposalConfigurationPage = lazy(() => import('@pages/employee/leads/lead/components/ProposalConfigurationPage'))
const TemplateDocumentationBuilderPage = lazy(() => import('@pages/employee/leads/template-builder/TemplateDocumentationBuilderPage'))
const MyTeamLayout = lazy(() => import('@pages/my-team/MyTeamLayout'))
const MyTeamOverview = lazy(() => import('@pages/my-team/Overview'))
const MyTeamApprovals = lazy(() => import('@pages/my-team/Approvals'))
const MyTeamDelegations = lazy(() => import('@pages/my-team/Delegations'))
const ProfilePage = lazy(() => import('../modules/profile/ProfilePage'))
const WizardsPage = lazy(() => import('../modules/wizards/WizardsPage'))
const AccountPage = lazy(() => import('../modules/accounts/AccountPage'))
const WidgetsPage = lazy(() => import('../modules/widgets/WidgetsPage'))
const ChatPage = lazy(() => import('../modules/apps/chat/ChatPage'))
const UsersPage = lazy(() => import('../modules/apps/user-management/UsersPage'))
const EmployeesList = lazy(() => import('@pages/employee/EmployeesList'))
const PrivateRoutes = () => {
  const [isStored, setIsStored] = useState(false)
  const employeeId = useSelector(
    (state: RootState) => state.employee.currentEmployee.id
  );
  const [showAppSettings, setShowAppSettings] = useState(false);
  useEffect(() => {
    async function fetchAndStore() {
      await store.dispatch(fetchRolesAndPermissions());
      await store.dispatch(fetchAuthzCapabilities());
      setIsStored(true);
    }
    fetchAndStore()
  }, [])

  // Live permission updates: when an admin changes this employee's role
  // permissions, section access, or role assignment, the backend pushes a
  // targeted socket event and this refetches both permission systems
  // immediately - so a revoked/changed user's access updates without them
  // needing to log out or refresh.
  //
  // Refetching alone isn't enough: most permission checks in this app (can(),
  // hasPermission()) read the store as a one-time snapshot at render time, not
  // a reactive subscription - so an update to Redux doesn't by itself repaint
  // buttons/sections that were already rendered. Bumping `routesKey` after the
  // refetch resolves forces React to fully unmount and remount the entire
  // routed tree (sidebar included), so every single permission-gated element
  // re-evaluates fresh against the new data - instantly, without a hard
  // page reload (which would also drop the socket connection and re-auth).
  const [routesKey, setRoutesKey] = useState(0);
  usePermissionsRealtime(async () => {
    await store.dispatch(fetchRolesAndPermissions());
    await store.dispatch(fetchAuthzCapabilities());
    setRoutesKey((k) => k + 1);
  })

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
    isStored && <Routes key={routesKey}>
      <Route element={<MasterLayout />}>
        {/* Redirect to Dashboard after success login/registartion */}
        <Route path='auth/*' element={<Navigate to='/dashboard' />} />
        {/* Pages */}
        <Route path='dashboard' element={<DashboardWrapper />} />
        {NEW_MY_TEAM_IA && <Route path='my-team' element={<MyTeamLayout />}>
          <Route index element={<Navigate to='/my-team/overview' replace />} />
          <Route path='overview' element={<MyTeamOverview />} />
          <Route path='members' element={<Navigate to='/employees' replace />} />
          <Route path='attendance' element={<Navigate to='/my-team/overview' replace />} />
          <Route path='leaves' element={<Navigate to='/my-team/overview' replace />} />

          <Route path='salary' element={<Navigate to='/finance/salary' replace />} />
          <Route path='tasks' element={<Navigate to='/tasks/employee-level-teams' replace />} />
          <Route path='projects' element={<Navigate to='/qc/projects' replace />} />
          <Route path='leads' element={<Navigate to='/qc/leads' replace />} />
          <Route path='approvals' element={<MyTeamApprovals />} />
          <Route path='delegations' element={<MyTeamDelegations />} />
        </Route>}

        {NEW_MY_TEAM_IA && <Route path='approvals/inbox/*' element={<Navigate to='/my-team/approvals' replace />} />}
        {NEW_MY_TEAM_IA && <Route path='approvals/my-team/*' element={<Navigate to='/my-team/overview' replace />} />}
        {NEW_MY_TEAM_IA && <Route path='approvals/delegations/*' element={<Navigate to='/my-team/delegations' replace />} />}
        {NEW_MY_TEAM_IA && <Route path='attendance-leaves/my-team/*' element={<Navigate to='/my-team/overview' replace />} />}
        {NEW_MY_TEAM_IA && <Route path='attendance-leaves/approval-inbox/*' element={<Navigate to='/my-team/approvals' replace />} />}
        {NEW_MY_TEAM_IA && <Route path='attendance-leaves/delegations/*' element={<Navigate to='/my-team/delegations' replace />} />}
        {!NEW_MY_TEAM_IA && <Route path='approvals/inbox' element={<MyTeamApprovals />} />}
        {!NEW_MY_TEAM_IA && <Route path='approvals/my-team' element={<MyTeamOverview />} />}
        {!NEW_MY_TEAM_IA && <Route path='approvals/delegations' element={<MyTeamDelegations />} />}
        <Route path='builder' element={<BuilderPageWrapper />} />
        <Route path='menu-test' element={<MenuTestPage />} />
        <Route
          path='/qc/leads/documentation-builder'
          element={
            <SectionGuard module='crm.leads' requireGrant>
              <SuspensedView>
                <TemplateDocumentationBuilderPage />
              </SuspensedView>
            </SectionGuard>}
        />
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
        {hasPermission(uiControlResourceNameMapWithCamelCase.incrementUnderFinance, permissionConstToUseWithHasPermission.readOthers) && <Route
          path='/finance/increment'
          element={
            <SuspensedView>
              <Increment />
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
            <SectionGuard module='calendar'>
              <SuspensedView>
                <Calendar />
              </SuspensedView>
            </SectionGuard>
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

        {(hasPermission(uiControlResourceNameMapWithCamelCase.employeesUnderAttendanceAndLeaves, permissionConstToUseWithHasPermission.readOthers) || can('attendance.employees.view.all')) && <Route
          path='employees/attendance-and-leaves'
          element={
            <SectionGuard module='attendance.employees'>
              <SuspensedView>
                <EmployeesAttendanceView />
              </SuspensedView>
            </SectionGuard>
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
          path='/company/organisation-profile/:orgId'
          element={
            <SuspensedView>
              <OrganizationProfilePage />
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
            <SectionGuard module='reports.kpi'>
              <SuspensedView>
                <PersonalKpiMain />
              </SuspensedView>
            </SectionGuard>}
        />
        <Route
          path='/qc/leads/configuration'
          element={
            <SectionGuard module='crm.leads' requireGrant>
              <SuspensedView>
                <ProposalConfigurationPage />
              </SuspensedView>
            </SectionGuard>}
        />
        <Route
          path='/qc/leads'
          element={
            <SectionGuard module='crm.leads' requireGrant>
              <SuspensedView>
                <LeadsMain />
              </SuspensedView>
            </SectionGuard>}
        />
        {/* Opt-in beta: migrated EnterpriseForm wizard UI (classic flow stays default) */}
        <Route
          path='/qc/leads/wizard-beta'
          element={
            <SectionGuard module='crm.leads' requireGrant>
              <SuspensedView>
                <LeadWizardBetaPage />
              </SuspensedView>
            </SectionGuard>}
        />
        <Route
          path='/qc/leads/wizard-beta/:id'
          element={
            <SectionGuard module='crm.leads' requireGrant>
              <SuspensedView>
                <LeadWizardBetaPage />
              </SuspensedView>
            </SectionGuard>}
        />
        <Route
          path='/leads/:id'
          element={
            <SectionGuard module='crm.leads' requireGrant>
              <SuspensedView>
                <EntityDetailPage />
              </SuspensedView>
            </SectionGuard>
          }
        />
        <Route
          path='/tasks'
          element={
            <SectionGuard module='tasks'>
              <SuspensedView>
                <TasksMain />
              </SuspensedView>
            </SectionGuard>
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
            <SectionGuard module='crm.leads' requireGrant>
              <SuspensedView>
                <EntityDetailPage />
              </SuspensedView>
            </SectionGuard>
          }
        />
        <Route
          path='/qc/projects'
          element={
            <SectionGuard module='projects'>
              <SuspensedView>
                <ProjectsMain />
              </SuspensedView>
            </SectionGuard>
          }
        />
        <Route
          path='/qc/contacts'
          element={
            <SectionGuard module='crm.contacts'>
              <SuspensedView>
                <ContactsNavbar />
              </SuspensedView>
            </SectionGuard>
          }
        />
        <Route
          path='/qc/companies'
          element={
            <SectionGuard module='crm.companies'>
              <SuspensedView>
                <CompaniesMain />
              </SuspensedView>
            </SectionGuard>
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
              <ProjectEntityRedirect />
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
        <Route
          path='/search-results'
          element={
            <SuspensedView>
              <SearchResultsPage />
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
