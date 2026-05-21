import { useIntl } from 'react-intl'
import { AsideMenuItemWithSub } from './AsideMenuItemWithSub'
import { AsideMenuItem } from './AsideMenuItem'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '@redux/store'
import { sidePanelIcons } from '../../../assets/sidepanelicons/index'
import { Suspense, useEffect, useState } from 'react'
import { fetchRolesAndPermissions } from '@redux/slices/rolesAndPermissions'
import { permissionConstToUseWithHasPermission, uiControlResourceNameMapWithCamelCase } from '@constants/statistics';
import { hasPermission } from '@utils/authAbac'
import { fetchCurrentEmployeeByEmpId } from '@services/employee'

export function AsideMenuMain() {
  const intl = useIntl()
  const dispatch = useDispatch();
  const isAdmin = useSelector((state: RootState) => state.auth.currentUser?.isAdmin);
  const [showAppSettings, setShowAppSettings] = useState(false);
  const employeeId = useSelector(
    (state: RootState) => state.employee.currentEmployee.id
  );

  async function fetchEmployeeAppVisibility(employeeId: string) {
    const response = await fetchCurrentEmployeeByEmpId(employeeId);
    if (!response.hasError) {
      setShowAppSettings(response.data?.employee?.showAppSettings);
    }
  }
  useEffect(() => {
    dispatch(fetchRolesAndPermissions() as any)
  }, [])

  useEffect(() => {
    if (!employeeId) return;
    fetchEmployeeAppVisibility(employeeId)
  }, [employeeId])

  return (
    <>
      <AsideMenuItem
        to='/dashboard'
        icon={sidePanelIcons.dashboard.default}
        activeIcon={sidePanelIcons.dashboard.active}
        title={intl.formatMessage({ id: 'MENU.DASHBOARD' })}
        fontIcon='bi-app-indicator'
      />

      {hasPermission(uiControlResourceNameMapWithCamelCase.calendar, permissionConstToUseWithHasPermission.readOthers) && <AsideMenuItem
        to='/employees/calendar'
        icon={sidePanelIcons.calendar.default}
        activeIcon={sidePanelIcons.calendar.active}
        title='Calendar'
        fontIcon='bi-layers'
      />}

      {(!hasPermission(uiControlResourceNameMapWithCamelCase.personalUnderAttendanceAndLeaves, permissionConstToUseWithHasPermission.readOthers) && !hasPermission(uiControlResourceNameMapWithCamelCase.employeesUnderAttendanceAndLeaves, permissionConstToUseWithHasPermission.readOthers)) &&
        <Suspense fallback={<div className="d-flex justify-content-center align-items-center" style={{ minHeight: '40px' }}>
          <div className="spinner-border spinner-border-sm text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>}>
          <AsideMenuItem
            to='/employee/attendance-and-leaves'
            icon={sidePanelIcons.attendance}
            title='Attendance & Leaves'
            fontIcon='bi-layers'
          />
        </Suspense>}

      {((hasPermission(uiControlResourceNameMapWithCamelCase.personalUnderAttendanceAndLeaves, permissionConstToUseWithHasPermission.readOthers) || hasPermission(uiControlResourceNameMapWithCamelCase.employeesUnderAttendanceAndLeaves, permissionConstToUseWithHasPermission.readOthers))) && <AsideMenuItemWithSub to='' icon={sidePanelIcons.attendance} title='Attendance & Leaves' fontIcon='bi-layers'>
        {hasPermission(uiControlResourceNameMapWithCamelCase.personalUnderAttendanceAndLeaves, permissionConstToUseWithHasPermission.readOthers) && <AsideMenuItem to='/employee/attendance-and-leaves' title='Personal' icon={sidePanelIcons.rectangle.default} activeIcon={sidePanelIcons.rectangle.active} fontIcon='bi-layers' />}
        {hasPermission(uiControlResourceNameMapWithCamelCase.employeesUnderAttendanceAndLeaves, permissionConstToUseWithHasPermission.readOthers) && <AsideMenuItem to='/employees/attendance-and-leaves' title='Employees' icon={sidePanelIcons.rectangle.default} activeIcon={sidePanelIcons.rectangle.active} fontIcon='bi-layers' />}
      </AsideMenuItemWithSub>}

      {/* {showAppSettings &&
        <>
          {hasPermission(uiControlResourceNameMapWithCamelCase.leadProjectCompaniesContact, permissionConstToUseWithHasPermission.readOthers) && <> */}
          <div className='menu-item'>
            <div className='menu-content py-2'>
              <span className='menu-section text-muted text-uppercase fs-5 ls-1 fw-semibold'>Project Management</span>
            </div>
          </div>
            <AsideMenuItem to='/qc/leads' icon={sidePanelIcons.leads.default} activeIcon={sidePanelIcons.leads.active} title='Leads' fontIcon='bi-layers' />
            <AsideMenuItem to='/qc/projects' icon={sidePanelIcons.projects.default} activeIcon={sidePanelIcons.projects.active} title='Projects' fontIcon='bi-layers' />
            <AsideMenuItem to='/qc/companies' icon={sidePanelIcons.companiesIcon.default} activeIcon={sidePanelIcons.companiesIcon.active} title='Companies' fontIcon='bi-layers' />
            <AsideMenuItem to='/qc/contacts' icon={sidePanelIcons.contactsIcon.default} activeIcon={sidePanelIcons.contactsIcon.active} title='Contacts' fontIcon='bi-layers' />
          {/* </>}
        </>} */}
 
      {/* {showAppSettings && <> */}
      <div className='menu-item'>
        <div className='menu-content py-2'>
          <span className='menu-section text-muted text-uppercase fs-5 ls-1 fw-semibold'>Tasks and TimeSheet</span>
        </div>
      </div>
      <AsideMenuItem to='/tasks' icon={sidePanelIcons.projects.default} activeIcon={sidePanelIcons.projects.active} title='Task' fontIcon='bi-layers' />
    
      <AsideMenuItemWithSub to='' icon={sidePanelIcons.timeTracker.default} title='TimeSheet' fontIcon='bi-layers'>
        {hasPermission(uiControlResourceNameMapWithCamelCase.personalUnderAttendanceAndLeaves, permissionConstToUseWithHasPermission.readOthers) && <AsideMenuItem to='/tasks/timesheet' title='My TimeSheet' icon={sidePanelIcons.rectangle.default} activeIcon={sidePanelIcons.rectangle.active} fontIcon='bi-layers' />}
        {hasPermission(uiControlResourceNameMapWithCamelCase.employeesUnderAttendanceAndLeaves, permissionConstToUseWithHasPermission.readOthers) && <AsideMenuItem to='/tasks/employee-timesheet' title='Employees TimeSheet' icon={sidePanelIcons.rectangle.default} activeIcon={sidePanelIcons.rectangle.active} fontIcon='bi-layers' />}
      </AsideMenuItemWithSub>
      {/* </>} */}

      <div className='menu-item'>
        <div className='menu-content py-2'>
          <span className='menu-section text-muted text-uppercase fs-5 ls-1 fw-semibold'>Other </span>
        </div>
      </div>
      <AsideMenuItemWithSub to='' icon={sidePanelIcons.people} title='People' fontIcon='bi-layers'>
        <AsideMenuItem to='/employees' title='Employees' icon={sidePanelIcons.rectangle.default} activeIcon={sidePanelIcons.rectangle.active} fontIcon='bi-layers' />
        {hasPermission(uiControlResourceNameMapWithCamelCase.documentsUnderPeople, permissionConstToUseWithHasPermission.readOthers) && <AsideMenuItem to='/employee/documents' title='Documents' icon={sidePanelIcons.rectangle.default} activeIcon={sidePanelIcons.rectangle.active} fontIcon='bi-layers' />}
      </AsideMenuItemWithSub>
      {(hasPermission(uiControlResourceNameMapWithCamelCase.organisationProfileUnderCompany, permissionConstToUseWithHasPermission.readOthers) || hasPermission(uiControlResourceNameMapWithCamelCase.announcementsUnderCompany, permissionConstToUseWithHasPermission.readOthers) || hasPermission(uiControlResourceNameMapWithCamelCase.branchesUnderCompany, permissionConstToUseWithHasPermission.readOthers) || hasPermission(uiControlResourceNameMapWithCamelCase.departmentsUnderCompany, permissionConstToUseWithHasPermission.readOthers) || hasPermission(uiControlResourceNameMapWithCamelCase.designationUnderCompany, permissionConstToUseWithHasPermission.readOthers) || hasPermission(uiControlResourceNameMapWithCamelCase.mediaUnderCompany, permissionConstToUseWithHasPermission.readOthers) || hasPermission(uiControlResourceNameMapWithCamelCase.onboardingDocumentUnderCompany, permissionConstToUseWithHasPermission.readOthers)) && <AsideMenuItemWithSub to='/company' icon={sidePanelIcons.company} title='Company' fontIcon='bi-layers'>
        {hasPermission(uiControlResourceNameMapWithCamelCase.organisationProfileUnderCompany, permissionConstToUseWithHasPermission.readOthers) && <AsideMenuItem to='/company/organisation-profile' title='Organisation Profile' icon={sidePanelIcons.rectangle.default} activeIcon={sidePanelIcons.rectangle.active} fontIcon='bi-layers' />}
       {/* {hasPermission(uiControlResourceNameMapWithCamelCase.organisationProfileUnderCompany, permissionConstToUseWithHasPermission.readOthers) && <AsideMenuItem to='/company/organisation-info' title='Organisation Info' icon={sidePanelIcons.rectangle.default} activeIcon={sidePanelIcons.rectangle.active} fontIcon='bi-layers' />} */}
        {hasPermission(uiControlResourceNameMapWithCamelCase.announcementsUnderCompany, permissionConstToUseWithHasPermission.readOthers) && <AsideMenuItem to='/company/announcements' title='Announcements' icon={sidePanelIcons.rectangle.default} activeIcon={sidePanelIcons.rectangle.active} fontIcon='bi-layers' />}
        {hasPermission(uiControlResourceNameMapWithCamelCase.branchesUnderCompany, permissionConstToUseWithHasPermission.readOthers) && <AsideMenuItem to='/company/branches' title='Branches' icon={sidePanelIcons.rectangle.default} activeIcon={sidePanelIcons.rectangle.active} fontIcon='bi-layers' />}
        {/* {hasPermission(uiControlResourceNameMapWithCamelCase.departmentsUnderCompany, permissionConstToUseWithHasPermission.readOthers) && <AsideMenuItem to='/company/departments' title='Departments' icon={sidePanelIcons.rectangle.default} activeIcon={sidePanelIcons.rectangle.active} fontIcon='bi-layers' />} */}
        {/* {hasPermission(uiControlResourceNameMapWithCamelCase.designationUnderCompany, permissionConstToUseWithHasPermission.readOthers) && <AsideMenuItem to='/company/designations' title='Designations' icon={sidePanelIcons.rectangle.default} activeIcon={sidePanelIcons.rectangle.active} fontIcon='bi-layers' />} */}
        {/* <AsideMenuItem to='/company/employee-types' title='Masters' icon={sidePanelIcons.rectangle.default} activeIcon={sidePanelIcons.rectangle.active} fontIcon='bi-layers'/> */}
        {hasPermission(uiControlResourceNameMapWithCamelCase.mediaUnderCompany, permissionConstToUseWithHasPermission.readOthers) && <AsideMenuItem to='/company/media' title='Media' icon={sidePanelIcons.rectangle.default} activeIcon={sidePanelIcons.rectangle.active} fontIcon='bi-layers' />}
        {/* {hasPermission(uiControlResourceNameMapWithCamelCase.mediaUnderCompany, permissionConstToUseWithHasPermission.readOthers) && <AsideMenuItem to='/company/documents' title='Media' icon={sidePanelIcons.rectangle.default} activeIcon={sidePanelIcons.rectangle.active} fontIcon='bi-layers' />} */}
        {hasPermission(uiControlResourceNameMapWithCamelCase.onboardingDocumentUnderCompany, permissionConstToUseWithHasPermission.readOthers) && <AsideMenuItem to='/company/onboardingDocs' title='Onboarding Docs' icon={sidePanelIcons.rectangle.default} activeIcon={sidePanelIcons.rectangle.active} fontIcon='bi-layers' />}
        {hasPermission(uiControlResourceNameMapWithCamelCase.onboardingDocumentUnderCompany, permissionConstToUseWithHasPermission.readOthers) && <AsideMenuItem to='/company/teams' icon={sidePanelIcons.rectangle.default} activeIcon={sidePanelIcons.rectangle.active} title='Teams' fontIcon='bi-layers' />}
         {hasPermission(uiControlResourceNameMapWithCamelCase.onboardingDocumentUnderCompany, permissionConstToUseWithHasPermission.readOthers) &&<AsideMenuItem to='/company/employee-level-teams' icon={sidePanelIcons.rectangle.default} activeIcon={sidePanelIcons.rectangle.active} title='Employee-Level' fontIcon='bi-layers' />}
      </AsideMenuItemWithSub>}
      <AsideMenuItemWithSub to='' icon={sidePanelIcons.reports} title='Reports' fontIcon='bi-layers'>
        {/* {hasPermission(uiControlResourceNameMapWithCamelCase.holidaysUnderReports, permissionConstToUseWithHasPermission.readOthers) && <AsideMenuItem to='/company/public-holiday' title='Holidays' icon={sidePanelIcons.rectangle.default} activeIcon={sidePanelIcons.rectangle.active} fontIcon='bi-layers'/>} */}
        {hasPermission(uiControlResourceNameMapWithCamelCase.kpiUnderReports, permissionConstToUseWithHasPermission.readOthers) && <AsideMenuItem to='/employee/report/kpis' title='KPI' icon={sidePanelIcons.rectangle.default} activeIcon={sidePanelIcons.rectangle.active} fontIcon='bi-layers' />}
      </AsideMenuItemWithSub>
      <AsideMenuItemWithSub to='' icon={sidePanelIcons.finance} title='Finance' fontIcon='bi-layers'>
        {/* {hasPermission(uiControlResourceNameMapWithCamelCase.holidaysUnderReports, permissionConstToUseWithHasPermission.readOthers) && <AsideMenuItem to='/company/public-holiday' title='Holidays' icon={sidePanelIcons.rectangle.default} activeIcon={sidePanelIcons.rectangle.active} fontIcon='bi-layers'/>} */}
        {hasPermission(uiControlResourceNameMapWithCamelCase.loanUnderFinance, permissionConstToUseWithHasPermission.readOthers) && <AsideMenuItem to='/finance/loans' title='Loans' icon={sidePanelIcons.rectangle.default} activeIcon={sidePanelIcons.rectangle.active} fontIcon='price-tag' />}
        {hasPermission(uiControlResourceNameMapWithCamelCase.reimbursementsUnderFinance, permissionConstToUseWithHasPermission.readOthers) && <AsideMenuItem to='/finance/bills' title='Reimbursements' icon={sidePanelIcons.rectangle.default} activeIcon={sidePanelIcons.rectangle.active} fontIcon='price-tag' />}
        {hasPermission(uiControlResourceNameMapWithCamelCase.salaryUnderFinance, permissionConstToUseWithHasPermission.readOthers) && <AsideMenuItem to='/finance/salary' title='Salary' icon={sidePanelIcons.rectangle.default} activeIcon={sidePanelIcons.rectangle.active} fontIcon='dollar' />}
      </AsideMenuItemWithSub>
    </>
  )
  return (
    <>
      <AsideMenuItem
        to='/dashboard'
        icon='abstract-25'
        title={intl.formatMessage({ id: 'MENU.DASHBOARD' })}
        fontIcon='bi-app-indicator'
      />

      <AsideMenuItem to='/employees/calendar' icon='calendar' title='Calendar' fontIcon='bi-layers' />
      <AsideMenuItem to='#' icon='notification-status' title='Notifications' fontIcon='bi-layers' />
      <AsideMenuItem to='/employees/attendance' icon='files-tablet' title='Attendance' fontIcon='bi-layers' />

      <div className='menu-item'>
        <div className='menu-content pt-8 pb-2'>
          <span className='menu-section text-muted text-uppercase fs-8 ls-1'>Work</span>
        </div>
      </div>

      <AsideMenuItem to='#' icon='brifecase-tick' title='Projects' fontIcon='bi-layers' />
      <AsideMenuItem to='#' icon='questionnaire-tablet' title='Tasks' fontIcon='bi-layers' />
      <AsideMenuItem to='#' icon='timer' title='Time Tracker' fontIcon='bi-layers' />
      <AsideMenuItem to='#' icon='note-2' title='Reports' fontIcon='bi-layers' />
      <AsideMenuItem to='#' icon='courier-express' title='Vendors' fontIcon='bi-layers' />


      <div className='menu-item'>
        <div className='menu-content pt-8 pb-2'>
          <span className='menu-section text-muted text-uppercase fs-8 ls-1'>Connections</span>
        </div>
      </div>

      <AsideMenuItem to='#' icon='user-tick' title='Customers' fontIcon='bi-layers' />
      <AsideMenuItem to='/employees' icon='profile-user' title='Employees' fontIcon='bi-layers' />


      <div className='menu-item'>
        <div className='menu-content pt-8 pb-2'>
          <span className='menu-section text-muted text-uppercase fs-8 ls-1'>Other</span>
        </div>
      </div>

      <AsideMenuItemWithSub to='/company' icon='home' title='Company' fontIcon='bi-layers'>
        <AsideMenuItem to='/company/public-holiday' title='Holidays' icon='calendar-remove' fontIcon='bi-layers' />
        <AsideMenuItem to='/company/overview' title='Overview' icon='setting-4' fontIcon='bi-layers' />
        <AsideMenuItem to='/company/branches' title='Branches' icon='geolocation-home' fontIcon='bi-layers' />
        <AsideMenuItem to='/company/departments' title='Departments' icon='abstract-29' fontIcon='bi-layers' />
      </AsideMenuItemWithSub>
      <AsideMenuItem to='#' icon='data' title='Rules' fontIcon='bi-layers' />
      <AsideMenuItem to='#' icon='bill' title='Finance' fontIcon='bi-layers' />
      <AsideMenuItem to='#' icon='information-3' title='Issues' fontIcon='bi-layers' />
      {/* <AsideMenuItem to='/builder' icon='switch' title='Layout Builder' fontIcon='bi-layers' /> */}
      <div className='menu-item'>
        <div className='menu-content pt-8 pb-2'>
          <span className='menu-section text-muted text-uppercase fs-8 ls-1'>Crafted</span>
        </div>
      </div>
      <AsideMenuItemWithSub
        to='/crafted/pages'
        title='Pages'
        fontIcon='bi-archive'
        icon='element-plus'
      >
        <AsideMenuItemWithSub to='/crafted/pages/profile' title='Profile' hasBullet={true}>
          <AsideMenuItem to='/crafted/pages/profile/overview' title='Overview' hasBullet={true} />
          <AsideMenuItem to='/crafted/pages/profile/projects' title='Projects' hasBullet={true} />
          <AsideMenuItem to='/crafted/pages/profile/campaigns' title='Campaigns' hasBullet={true} />
          <AsideMenuItem to='/crafted/pages/profile/documents' title='Documents' hasBullet={true} />
          <AsideMenuItem
            to='/crafted/pages/profile/connections'
            title='Connections'
            hasBullet={true}
          />
        </AsideMenuItemWithSub>

        <AsideMenuItemWithSub to='/crafted/pages/wizards' title='Wizards' hasBullet={true}>
          <AsideMenuItem
            to='/crafted/pages/wizards/horizontal'
            title='Horizontal'
            hasBullet={true}
          />
          <AsideMenuItem to='/crafted/pages/wizards/vertical' title='Vertical' hasBullet={true} />
        </AsideMenuItemWithSub>
      </AsideMenuItemWithSub>
      <AsideMenuItemWithSub
        to='/crafted/accounts'
        title='Accounts'
        icon='profile-circle'
        fontIcon='bi-person'
      >
        <AsideMenuItem to='/crafted/account/overview' title='Overview' hasBullet={true} />
        <AsideMenuItem to='/crafted/account/settings' title='Settings' hasBullet={true} />
      </AsideMenuItemWithSub>
      <AsideMenuItemWithSub to='/error' title='Errors' fontIcon='bi-sticky' icon='cross-circle'>
        <AsideMenuItem to='/error/404' title='Error 404' hasBullet={true} />
        <AsideMenuItem to='/error/500' title='Error 500' hasBullet={true} />
      </AsideMenuItemWithSub>
      <AsideMenuItemWithSub
        to='/crafted/widgets'
        title='Widgets'
        icon='element-11'
        fontIcon='bi-layers'
      >
        <AsideMenuItem to='/crafted/widgets/lists' title='Lists' hasBullet={true} />
        <AsideMenuItem to='/crafted/widgets/statistics' title='Statistics' hasBullet={true} />
        <AsideMenuItem to='/crafted/widgets/charts' title='Charts' hasBullet={true} />
        <AsideMenuItem to='/crafted/widgets/mixed' title='Mixed' hasBullet={true} />
        <AsideMenuItem to='/crafted/widgets/tables' title='Tables' hasBullet={true} />
        <AsideMenuItem to='/crafted/widgets/feeds' title='Feeds' hasBullet={true} />
      </AsideMenuItemWithSub>
      <div className='menu-item'>
        <div className='menu-content pt-8 pb-2'>
          <span className='menu-section text-muted text-uppercase fs-8 ls-1'>Apps</span>
        </div>
      </div>
      <AsideMenuItemWithSub
        to='/apps/chat'
        title='Chat'
        fontIcon='bi-chat-left'
        icon='message-text-2'
      >
        <AsideMenuItem to='/apps/chat/private-chat' title='Private Chat' hasBullet={true} />
        <AsideMenuItem to='/apps/chat/group-chat' title='Group Chart' hasBullet={true} />
        <AsideMenuItem to='/apps/chat/drawer-chat' title='Drawer Chart' hasBullet={true} />
      </AsideMenuItemWithSub>
      <AsideMenuItem
        to='/apps/user-management/users'
        icon='shield-tick'
        title='User management'
        fontIcon='bi-layers'
      />
    </>
  )
}
