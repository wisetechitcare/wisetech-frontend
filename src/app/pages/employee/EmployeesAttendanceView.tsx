import { BarChart, CalendarToday, AirplaneTicket, Rule } from '@mui/icons-material';
import MaterialHeaderTab, { TabItem } from '@app/modules/common/components/MaterialHeaderTab';
import { PageLink, PageTitle } from '@metronic/layout/core';
import IndividualView from './attendance/admin/IndividualView';
import OverviewView from './attendance/admin/OverviewView';
import Information from './attendance/admin/Information';
import { faqsIcons, leadsIcons, navbarIcon } from '@metronic/assets/sidepanelicons';
import { useDispatch } from 'react-redux';
import { useEffect, useState } from 'react';
import { fetchRolesAndPermissions } from '@redux/slices/rolesAndPermissions';
import FaqsMainPage from '@pages/company/organisationInfo/faqs/FaqsMainPage';
import DailyShiftTime from './attendance/AttendanceConfig/component/DailyShiftTime';
import AttendanceConfig from './attendance/AttendanceConfig/AttendanceConfig';
import AttendanceAdminFaqs from './adminFaqs/AttendaceAdminFaqs';
import { useVisibility, type VisibilityReq } from '@utils/visibility';
import { loadAllEmployeesIfNeeded } from '@redux/slices/allEmployees';
import { AppDispatch } from '@redux/store';

const EmployeesAttendanceView = () => {
    // Every tab derives from the Visibility Layer (RULE 3). Overview/Individual are
    // team-attendance views; Configure/FAQS are the admin config surface.
    const { canSeeTab } = useVisibility();
    const [activeTab, setActiveTab] = useState(0);
    const [informationKey, setInformationKey] = useState(0);
    const dispatch = useDispatch();

    useEffect(()=>{
        dispatch(fetchRolesAndPermissions() as any);
    },[])

    const dispatchs = useDispatch<AppDispatch>(); 
    useEffect(() => {
        dispatchs(loadAllEmployeesIfNeeded());
    }, [dispatchs]);

    // Force remount of Information tab when it becomes active
    useEffect(() => {
        if (activeTab === 2) {
            setInformationKey(prev => prev + 1);
        }
    }, [activeTab]);

    const allTabs: Array<{ req: VisibilityReq; item: TabItem }> = [
        { req: { capability: 'attendance.view.team' }, item: { title: 'Overview', component: <OverviewView />, icon: 'bi-grid-1x2' } },
        { req: { capability: 'attendance.view.team' }, item: { title: 'Individual', component: <IndividualView />, icon: 'bi-person' } },
        { req: { capability: 'attendance.manage.team' }, item: { title: 'Configure', component: <AttendanceConfig />, icon: 'bi-gear' } },
        { req: { capability: 'attendance.manage.team' }, item: { title: 'FAQS', component: <AttendanceAdminFaqs />, icon: 'bi-question-circle' } },
    ];
    const tabItems: TabItem[] = allTabs.filter((t) => canSeeTab(t.req)).map((t) => t.item);

    const newAttendanceWizardBreadcrumb: Array<PageLink> = [
        {
            title: 'Employess',
            path: '/employee',
            isSeparator: false,
            isActive: false,
        },
        {
            title: '',
            path: '',
            isSeparator: true,
            isActive: false,
        },
    ];

    return (
        <>
            <PageTitle breadcrumbs={newAttendanceWizardBreadcrumb}>Attendance</PageTitle>
            <MaterialHeaderTab tabItems={tabItems} activeTab={Math.min(activeTab, Math.max(0, tabItems.length - 1))} onTabChange={setActiveTab}/>
        </>
    );
};

export default EmployeesAttendanceView;