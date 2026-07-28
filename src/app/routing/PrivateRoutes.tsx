import { FC, lazy, Suspense, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useParams } from 'react-router-dom'
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
const AppSettings = lazy(() => import('@pages/admin/AppSettings').then(m => ({ default: m.AppSettings })))
// Redirect that preserves route params (e.g. :personId) when forwarding a legacy
// URL to its canonical Access Control route. Used only for backward-compat redirects.
const ParamRedirect = ({ to }: { to: string }) => {
  const params = useParams()
  let target = to
  for (const [k, v] of Object.entries(params)) if (v) target = target.replace(`:${k}`, v)
  return <Navigate to={target} replace />
}
// Access Control (Phase 5.1) — read-only role browsing. Lazy so the module is a
// separate chunk and never loads for users who don't open it.
const AccessControlRoles = lazy(() => import('@modules/access-control/pages/RoleDashboardPage').then(m => ({ default: m.RoleDashboardPage })))
const AccessControlRoleDetails = lazy(() => import('@modules/access-control/pages/RoleDetailsPage').then(m => ({ default: m.RoleDetailsPage })))
// Shared layout: mounts the Global Scope Bar + AccessScopeProvider once for the whole module.
const AccessControlLayout = lazy(() => import('@modules/access-control/scope/AccessControlLayout').then(m => ({ default: m.AccessControlLayout })))
// Organization Management (Phase 6.1) — multi-tenant org structure. Lazy so the
// module is a separate chunk and never loads for users who don't open it.
const OrganizationTenants = lazy(() => import('@modules/organization/pages/TenantDashboardPage').then(m => ({ default: m.TenantDashboardPage })))
const OrganizationTenantDetails = lazy(() => import('@modules/organization/pages/OrganizationPage').then(m => ({ default: m.OrganizationPage })))
// Access Control → Assignments (Phase 6.2) — role assignment & access management.
// Lazy so the module is a separate chunk and never loads for users who don't open it.
// Employee Access — the unified employee-centric experience (Step 4). Reuses the
// assignment/effective/history pages internally as tabs.
const EmployeeAccessList = lazy(() => import('@modules/access-control/employee/EmployeeAccessListPage').then(m => ({ default: m.EmployeeAccessListPage })))
const EmployeeAccessDetail = lazy(() => import('@modules/access-control/employee/EmployeeAccessDetailPage').then(m => ({ default: m.EmployeeAccessDetailPage })))
// Audit Logs — the read-only access-governance history (Step 5).
const AuditLogs = lazy(() => import('@modules/access-control/audit/AuditLogsPage').then(m => ({ default: m.AuditLogsPage })))
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
        <Route
          path='dashboard'
          element={
            <SectionGuard module='dashboard'>
              <DashboardWrapper />
            </SectionGuard>
          }
        />
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

        {/* Finance's children are universal-default-eligible (like dashboard/
            calendar): every employee gets baseline access unless an admin
            explicitly blocks it via the Access tab, so these are block-only
            (no requireGrant) rather than deny-unless-granted. Was previously
            legacy hasPermission()-gated (or, for /finance/loans, completely
            unguarded) - neither consulted an explicit per-employee block. */}
        <Route
          path='/finance/bills'
          element={
            <SectionGuard module='finance.reimbursements'>
              <SuspensedView>
                <AdminAndEmployeeReimbursementViewer />
              </SuspensedView>
            </SectionGuard>
          }
        />
        <Route
          path='/finance/salary'
          element={
            <SectionGuard module='finance.salary'>
              <SuspensedView>
                <Salary />
              </SuspensedView>
            </SectionGuard>
          }
        />
        <Route
          path='/finance/increment'
          element={
            <SectionGuard module='finance.increment'>
              <SuspensedView>
                <Increment />
              </SuspensedView>
            </SectionGuard>
          }
        />
        <Route
          path='/finance/loans'
          element={
            <SectionGuard module='finance.loans'>
              <SuspensedView>
                <PersonalLoanMain />
              </SuspensedView>
            </SectionGuard>
          }
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
        <Route
          path='/company/public-holiday'
          element={
            <SectionGuard module='reports' requireGrant>
              <SuspensedView>
                <PublicHoliday onClose={() => console.log('Hey')} setShowNewHolidayForm={undefined} />
              </SuspensedView>
            </SectionGuard>
          }
        />
        <Route
          path='/company/overview'
          element={
            <SuspensedView>
              <Overview />
            </SuspensedView>}
        />
        {/* These "company->X" legacy resources all canonicalize to the same
            bare `settings.manage.all` key (no distinct ACCESS_AREAS leaf, and
            a `manage` action rather than `view`), so canViewModule('settings')
            would never see them - allowIf preserves the existing legacy-role
            path while requireGrant+isBlocked lets an explicit block win. */}
        <Route
          path='/company/branches'
          element={
            <SectionGuard
              module='settings'
              requireGrant
              allowIf={hasPermission(uiControlResourceNameMapWithCamelCase.branchesUnderCompany, permissionConstToUseWithHasPermission.readOthers)}
            >
              <SuspensedView>
                <Branches />
              </SuspensedView>
            </SectionGuard>
          }
        />
        <Route
          path='/company/departments'
          element={
            <SectionGuard
              module='settings'
              requireGrant
              allowIf={hasPermission(uiControlResourceNameMapWithCamelCase.departmentsUnderCompany, permissionConstToUseWithHasPermission.readOthers)}
            >
              <SuspensedView>
                <Departments />
              </SuspensedView>
            </SectionGuard>
          }
        />
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
            <SectionGuard module='users' requireGrant>
              <SuspensedView>
                <EmployeesList />
              </SuspensedView>
            </SectionGuard>
          }
        />
        <Route
          path='employees/calendar'
          element={
            <SectionGuard module='calendar'>
              <SuspensedView>
                <Calendar />
              </SuspensedView>
            </SectionGuard>
          }
        />
        <Route
          path='employees/notifications'
          element={
            <SuspensedView>
              <Notifications />
            </SuspensedView>
          }
        />
        <Route
          path='employee/attendance-and-leaves'
          element={
            <SectionGuard module='attendance.personal'>
              <SuspensedView>
                <PersonalAttendanceView />
              </SuspensedView>
            </SectionGuard>
          }
        />

        <Route
          path='employees/attendance-and-leaves'
          element={
            // attendance.employees isn't a universal default, so this needs
            // requireGrant - but its legacy resource canonicalizes to the
            // bare `attendance.view.all` key (not `attendance.employees.view.*`),
            // which canViewModule('attendance.employees') would never see. allowIf
            // preserves that legacy-role access; an explicit block still wins
            // regardless (isBlocked is checked independently of allowIf).
            <SectionGuard
              module='attendance.employees'
              requireGrant
              allowIf={hasPermission(uiControlResourceNameMapWithCamelCase.employeesUnderAttendanceAndLeaves, permissionConstToUseWithHasPermission.readOthers) || can('attendance.employees.view.all')}
            >
              <SuspensedView>
                <EmployeesAttendanceView />
              </SuspensedView>
            </SectionGuard>
          }
        />
        <Route
          path='employees/create-new'
          element={
            <SectionGuard module='users' requireGrant>
              <SuspensedView>
                <NewEmployeeWizard editMode={false} openModal={true} />
              </SuspensedView>
            </SectionGuard>
          }
        />
        <Route
          path='employees/edit/:employeeId'
          element={
            <SectionGuard module='users' requireGrant>
              <SuspensedView>
                <NewEmployeeWizard editMode={true} openModal={true} />
              </SuspensedView>
            </SectionGuard>
          }
        />
        <Route
          path='/employee/documents'
          element={
            <SectionGuard module='users' requireGrant>
              <SuspensedView>
                <Document />
              </SuspensedView>
            </SectionGuard>
          }
        />
        <Route
          path='/company/organisation-profile'
          element={
            <SectionGuard
              module='settings.profile'
              requireGrant
              allowIf={hasPermission(uiControlResourceNameMapWithCamelCase.organisationProfileUnderCompany, permissionConstToUseWithHasPermission.readOthers)}
            >
              <SuspensedView>
                <OrganisationProfileMain />
              </SuspensedView>
            </SectionGuard>
          }
        />
        <Route
          path='/company/organisation-profile/:orgId'
          element={
            <SectionGuard
              module='settings.profile'
              requireGrant
              allowIf={hasPermission(uiControlResourceNameMapWithCamelCase.organisationProfileUnderCompany, permissionConstToUseWithHasPermission.readOthers)}
            >
              <SuspensedView>
                <OrganizationProfilePage />
              </SuspensedView>
            </SectionGuard>
          }
        />
        <Route
          path='/company/organisation-info'
          element={
            <SectionGuard
              module='settings.profile'
              requireGrant
              allowIf={hasPermission(uiControlResourceNameMapWithCamelCase.organisationProfileUnderCompany, permissionConstToUseWithHasPermission.readOthers)}
            >
              <SuspensedView>
                <OrganisationInfoProfileMain />
              </SuspensedView>
            </SectionGuard>
          }
        />
        <Route
          path='/company/announcements'
          element={
            <SectionGuard
              module='settings.announcements'
              requireGrant
              allowIf={hasPermission(uiControlResourceNameMapWithCamelCase.announcementsUnderCompany, permissionConstToUseWithHasPermission.readOthers)}
            >
              <SuspensedView>
                <Announcements />
              </SuspensedView>
            </SectionGuard>
          }
        />
        <Route
          path='/company/branding'
          element={
            <SuspensedView>
              <Branding />
            </SuspensedView>
          }
        />
        <Route
          path='/company/designations'
          element={
            <SectionGuard
              module='settings'
              requireGrant
              allowIf={hasPermission(uiControlResourceNameMapWithCamelCase.designationUnderCompany, permissionConstToUseWithHasPermission.readOthers)}
            >
              <SuspensedView>
                <Designations />
              </SuspensedView>
            </SectionGuard>
          }
        />
        <Route
          path='/company/media'
          element={
            <SectionGuard
              module='settings.media'
              requireGrant
              allowIf={hasPermission(uiControlResourceNameMapWithCamelCase.mediaUnderCompany, permissionConstToUseWithHasPermission.readOthers)}
            >
              <SuspensedView>
                <Media />
              </SuspensedView>
            </SectionGuard>
          }
        />
        <Route
          path='/company/media/:adminId'
          element={
            <SectionGuard
              module='settings.media'
              requireGrant
              allowIf={hasPermission(uiControlResourceNameMapWithCamelCase.mediaUnderCompany, permissionConstToUseWithHasPermission.readOthers)}
            >
              <SuspensedView>
                <Media />
              </SuspensedView>
            </SectionGuard>
          }
        />
        <Route
          path='/company/media/:adminId/:employeeId'
          element={
            <SectionGuard
              module='settings.media'
              requireGrant
              allowIf={hasPermission(uiControlResourceNameMapWithCamelCase.mediaUnderCompany, permissionConstToUseWithHasPermission.readOthers)}
            >
              <SuspensedView>
                <Media />
              </SuspensedView>
            </SectionGuard>
          }
        />
        <Route
          path='/company/onboardingdocs'
          element={
            <SectionGuard
              module='settings.onboarding'
              requireGrant
              allowIf={hasPermission(uiControlResourceNameMapWithCamelCase.onboardingDocumentUnderCompany, permissionConstToUseWithHasPermission.readOthers)}
            >
              <SuspensedView>
                <OnBoardingDocs />
              </SuspensedView>
            </SectionGuard>
          }
        />
        <Route
          path='/company/documents/:employeeId'
          element={
            <SectionGuard module='users' requireGrant>
              <SuspensedView>
                <EmployeeDocumentTable />
              </SuspensedView>
            </SectionGuard>
          }
        />
        <Route
          path='/finance/loans/:loanId'
          element={
            <SectionGuard module='finance.loans'>
              <SuspensedView>
                <LoanDetails />
              </SuspensedView>
            </SectionGuard>
          }
        />
        <Route
          path='employee/report/kpis'
          element={
            // Not a universal default - a missing grant should deny, not just
            // an explicit block. This was previously block-only, which is why
            // an ungranted employee fell through to the page's own inline
            // "Not Allowed To View" fallback instead of a redirect.
            <SectionGuard module='kpi' requireGrant>
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
            // Strict: no crm.leads grant means this page is fully invisible,
            // even to an employee staffed on the specific project — an
            // explicit permission grant is required no matter what.
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
            <SectionGuard module='projects' requireGrant>
              <SuspensedView>
                <ProjectsMain />
              </SuspensedView>
            </SectionGuard>
          }
        />
        <Route
          path='/qc/contacts'
          element={
            <SectionGuard module='crm.contacts' requireGrant>
              <SuspensedView>
                <ContactsNavbar />
              </SuspensedView>
            </SectionGuard>
          }
        />
        <Route
          path='/qc/companies'
          element={
            <SectionGuard module='crm.companies' requireGrant>
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
            <SectionGuard module='users' requireGrant>
              <SuspensedView>
                <ShowEmployeeDetailsToggle />
              </SuspensedView>
            </SectionGuard>
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
        <Route
          path='/admin/app-settings'
          element={
            <SuspensedView>
              <AppSettings />
            </SuspensedView>
          }
        />
        {/* Legacy Access Control entry → canonical Roles route (stub page retained, not deleted). */}
        <Route path='/admin/roles-permissions' element={<Navigate to='/access-control/roles' replace />} />

        {/* ── Access Control — single entry, one shared scope (Global Scope Bar) ──
            The layout mounts the AccessScopeProvider + Global Scope Bar once; child
            pages render through <Outlet/> and share the same organizational scope.
            The module guard sits on the layout, so it applies to every child once. */}
        <Route
          path='/access-control'
          element={
            <SectionGuard module='accesscontrol' permission="accesscontrol.view.all">
              <SuspensedView>
                <AccessControlLayout />
              </SuspensedView>
            </SectionGuard>
          }
        >
          <Route index element={<Navigate to='/access-control/roles' replace />} />
          <Route path='roles' element={<SuspensedView><AccessControlRoles /></SuspensedView>} />
          <Route path='roles/:id' element={<SuspensedView><AccessControlRoleDetails /></SuspensedView>} />
          {/* Employee Access — one employee, one place (search → shell with tabs). */}
          <Route path='employees' element={<SuspensedView><EmployeeAccessList /></SuspensedView>} />
          <Route path='employees/:personId' element={<SuspensedView><EmployeeAccessDetail /></SuspensedView>} />
          {/* Audit Logs — the read-only access-governance history. */}
          <Route path='audit' element={<SuspensedView><AuditLogs /></SuspensedView>} />
          {/* Legacy assignment routes → Employee Access (params preserved; pages retained). */}
          <Route path='assignments' element={<Navigate to='/access-control/employees' replace />} />
          <Route path='assignments/effective/:personId' element={<ParamRedirect to='/access-control/employees/:personId' />} />
          <Route path='assignments/history/:personId' element={<ParamRedirect to='/access-control/employees/:personId' />} />
        </Route>

        {/* Organization Management — multi-tenant org structure (Phase 6.1) */}
        <Route
          path='/organization'
          element={
            <SectionGuard module='settings' permission="users.view.all">
              <SuspensedView>
                <OrganizationTenants />
              </SuspensedView>
            </SectionGuard>
          }
        />
        <Route
          path='/organization/tenants/:tenantId'
          element={
            <SectionGuard module='settings' permission="users.view.all">
              <SuspensedView>
                <OrganizationTenantDetails />
              </SuspensedView>
            </SectionGuard>
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
