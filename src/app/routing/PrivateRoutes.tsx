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

const PublicHoliday = lazy(() => import('@pages/company/PublicHoliday'))
const CustomCalendar = lazy(() => import('@pages/employee/CustomCalendar'))
const Overview = lazy(() => import('@pages/company/Overview'))
const NewEmployeeWizard = lazy(() => import('@pages/employee/wizard/NewEmployeeWizard'))
const Branches = lazy(() => import('@pages/company/Branches'))
const Departments = lazy(() => import('@pages/company/Departments'))
// Documents module. The HR directory and one employee's wall are separate routes;
// `MyDocumentsPage` is the same wall scoped to the signed-in employee.
const DocumentsDirectory = lazy(() => import('@pages/employee/documents/DocumentsDirectory'))
const EmployeeDocumentsPage = lazy(() => import('@pages/employee/documents/EmployeeDocumentsPage'))
const MyDocumentsPage = lazy(() => import('@pages/employee/documents/MyDocumentsPage'))
const Branding = lazy(() => import('@pages/company/organisation/Branding'))
const Designations = lazy(() => import('@pages/company/Designation'))
const OnBoardingDocs = lazy(() => import('@pages/company/OnboardingDocs'))
const PersonalAttendanceView = lazy(() => import('@pages/employee/PersonalAttendanceView'))
const EmployeesAttendanceView = lazy(() => import('@pages/employee/EmployeesAttendanceView'))
const AdminAndEmployeeReimbursementViewer = lazy(() => import('@pages/employee/reimbursement/AdminAndEmployeeReimbursementViewer'))
const BillingRoutes = lazy(() => import('@pages/billing/routes/BillingRoutes'))
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
const RecruitmentMain = lazy(() => import('@pages/employee/recruitment/RecruitmentMain'))
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
// Phase 4 — the rebuilt Task UI (Kanban-first workspace + task detail workspace)
const TasksWorkspace = lazy(() => import('@pages/employee/tasks/TasksWorkspace'))
const TaskDetailPage = lazy(() => import('@pages/employee/tasks/TaskDetailPage'))
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
const RolesPermissions = lazy(() => import('@pages/admin/RolesPermissions').then(m => ({ default: m.RolesPermissions })))
// Workspace shell (launcher-morph navigation) — Phase 1: additive only. See
// src/components/workspace/WorkspaceShell.tsx for why it is a pathless LAYOUT route.
const WorkspaceShell = lazy(() => import('@components/workspace/WorkspaceShell'))
const WorkspaceHomeStage = lazy(() => import('@components/workspace/pages/HomeStage'))
const AppWorkspacePage = lazy(() => import('@components/workspace/pages/AppWorkspacePage'))
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
        {/* ── THE WORKSPACE SHELL WRAPS EVERY ROUTE ─────────────────────────────
            A PATHLESS layout route. React Router does not remount a parent element when a
            child route changes, so the application rail mounted inside it PERSISTS across
            every destination — the launcher and the rail are one component in two layout
            states, not two components faking continuity.

            It wraps everything on purpose. While it only wrapped /workspace/*, opening an
            actual module (/employees, /qc/companies) unmounted the shell and the rail
            vanished mid-journey, which is exactly the "it doesn't navigate through the
            section" problem. A workspace you fall out of is not a workspace.

            Route PATHS below are untouched — every existing URL, bookmark, redirect and
            deep link still resolves exactly as before. Rollback: delete this one wrapper
            element and its closing tag. */}
        <Route element={<SuspensedView><WorkspaceShell /></SuspensedView>}>
        {/* Redirect to Dashboard after success login/registartion */}
        <Route path='auth/*' element={<Navigate to='/dashboard' />} />
        {/* Pages */}
        <Route path='dashboard' element={<DashboardWrapper />} />
        {/* `/home` was the legacy Transform launcher; the workspace shell supersedes it.
            In classic-sidebar mode WorkspaceShell bounces /workspace/* to /dashboard, so this
            resolves correctly in both navigation modes without reading the flag twice. */}
        <Route path='home' element={<Navigate to='/workspace' replace />} />
        {/* The shell's own two destinations: the launcher, and an application landing. */}
        <Route path='workspace'>
          <Route index element={<SuspensedView><WorkspaceHomeStage /></SuspensedView>} />
          <Route path=':appId' element={<SuspensedView><AppWorkspacePage /></SuspensedView>} />
        </Route>

        {NEW_MY_TEAM_IA && <Route path='my-team' element={<MyTeamLayout />}>
          <Route index element={<Navigate to='/my-team/overview' replace />} />
          <Route path='overview' element={<MyTeamOverview />} />
          <Route path='members' element={<Navigate to='/employees' replace />} />
          <Route path='attendance' element={<Navigate to='/my-team/overview' replace />} />
          <Route path='leaves' element={<Navigate to='/my-team/overview' replace />} />

          <Route path='salary' element={<Navigate to='/finance/salary' replace />} />
          {/* Phase 4 §27 — was '/tasks/employee-level-teams', a route that never existed: it fell
              through to '/tasks/:taskId' and rendered a crashed detail page on every click. */}
          <Route path='tasks' element={<Navigate to='/tasks' replace />} />
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
            <SuspensedView>
              <TemplateDocumentationBuilderPage />
            </SuspensedView>}
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

        {/* Billing is its own top-level ERP module: one nested route tree that owns its
            header tabs, so every Billing page is a real URL under /billing/*. Access per
            tab is handled inside via the `billing.*` access areas. */}
        <Route
          path='/billing/*'
          element={
            <SuspensedView>
              <BillingRoutes />
            </SuspensedView>
          }
        />
        {/* The Accounts queue used to live under Finance; keep the old link working. */}
        <Route path='/finance/billing-queue' element={<Navigate to='/billing/accounts' replace />} />
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
        {/* HR directory + one employee's wall. Both are cross-employee views, so both
            sit behind the same readOthers gate the nav entry uses; the API enforces it
            again per employee. */}
        {hasPermission(uiControlResourceNameMapWithCamelCase.documentsUnderPeople, permissionConstToUseWithHasPermission.readOthers) && <Route
          path='/employee/documents'
          element={
            <SuspensedView>
              <DocumentsDirectory />
            </SuspensedView>}
        />}
        {hasPermission(uiControlResourceNameMapWithCamelCase.documentsUnderPeople, permissionConstToUseWithHasPermission.readOthers) && <Route
          path='/employee/documents/:employeeId'
          element={
            <SuspensedView>
              <EmployeeDocumentsPage />
            </SuspensedView>}
        />}
        {/* Every employee has their own documents — no permission gate, because the
            server resolves "me" from the token and can only ever return their own. */}
        <Route
          path='/my-documents'
          element={
            <SuspensedView>
              <MyDocumentsPage />
            </SuspensedView>}
        />
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
            <SuspensedView>
              <ProposalConfigurationPage />
            </SuspensedView>}
        />
        <Route
          path='/qc/leads'
          element={
            <SectionGuard module='crm.leads'>
              <SuspensedView>
                <LeadsMain />
              </SuspensedView>
            </SectionGuard>}
        />
        <Route
          path='/recruitment'
          element={
            <SectionGuard module='recruitment'>
              <SuspensedView>
                <RecruitmentMain />
              </SuspensedView>
            </SectionGuard>}
        />
        {/* Opt-in beta: migrated EnterpriseForm wizard UI (classic flow stays default) */}
        <Route
          path='/qc/leads/wizard-beta'
          element={
            <SuspensedView>
              <LeadWizardBetaPage />
            </SuspensedView>}
        />
        <Route
          path='/qc/leads/wizard-beta/:id'
          element={
            <SuspensedView>
              <LeadWizardBetaPage />
            </SuspensedView>}
        />
        <Route
          path='/leads/:id'
          element={
            <SuspensedView>
              <EntityDetailPage />
            </SuspensedView>
          }
        />
        <Route
          path='/tasks'
          element={
            <SectionGuard module='tasks'>
              <SuspensedView>
                <TasksWorkspace />
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
            // Phase 0 audit §4.4 — this route had NO SectionGuard, so a user with the tasks
            // section blocked could deep-link straight to a task and read, edit and delete it.
            <SectionGuard module='tasks'>
              <SuspensedView>
                <TaskDetailPage />
              </SuspensedView>
            </SectionGuard>
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
              <EntityDetailPage />
            </SuspensedView>
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
        <Route
          path='/admin/app-settings'
          element={
            <SuspensedView>
              <AppSettings />
            </SuspensedView>
          }
        />
        <Route
          path='/admin/roles-permissions'
          element={
            <SuspensedView>
              <RolesPermissions />
            </SuspensedView>
          }
        />
        {/* Page Not Found */}
        <Route path='*' element={<Navigate to='/error/404' />} />
        </Route>{/* ── end workspace shell wrapper ── */}
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
