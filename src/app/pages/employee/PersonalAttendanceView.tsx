import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import MaterialHeaderTab, { TabItem } from '@app/modules/common/components/MaterialHeaderTab';
import { useVisibility, type VisibilityReq } from '@utils/visibility';
import { PageLink, PageTitle } from '@metronic/layout/core';
import OverviewView from './attendance/personal/OverviewView';
import MyAttendanceView from './attendance/personal/MyAttendanceView';
import PersonalLeaveView from './attendance/personal/MyLeaveView';
import Information from './attendance/personal/Information';
import { faqsIcons, leadsIcons, navbarIcon } from '@metronic/assets/sidepanelicons';
import { resourceNameMapWithCamelCase } from '@constants/statistics';
import { useDispatch } from 'react-redux';
import { fetchRolesAndPermissions } from '@redux/slices/rolesAndPermissions';
import FaqsMainPage from '@pages/company/organisationInfo/faqs/FaqsMainPage';
import PersonalRules from './personal-rules/PersonalRules';
import { loadAllEmployeesIfNeeded } from '@redux/slices/allEmployees';
import { AppDispatch } from '@redux/store';

const PersonalAttendanceView = () => {
    const dispatch = useDispatch();
    const [searchParams] = useSearchParams();
    const initialTab = Math.min(Math.max(Number(searchParams.get('tab') ?? 0), 0), 4);
    const [activeTab, setActiveTab] = useState(initialTab);
    const resourseAndView = [
        {
            resource: resourceNameMapWithCamelCase.attendanceRequest,
            viewOwn: true,
            viewOthers: false
        },
        {
            resource: resourceNameMapWithCamelCase.attendanceReport,
            viewOwn: true,
            viewOthers: false
        }
    ]
    
    // Tabs are navigation → every tab derives from the Visibility Layer (RULE 3).
    // No leaves.view → the "My Leaves" tab is removed entirely (not disabled).
    const { canSeeTab } = useVisibility();
    const allTabs: Array<{ req: VisibilityReq; item: TabItem }> = [
        { req: { capability: 'attendance.view.self' }, item: { title: 'Overview', component: <OverviewView />, icon: 'bi-grid-1x2' } },
        { req: { capability: 'attendance.view.self' }, item: { title: 'My Attendance', component: <MyAttendanceView resourseAndView={resourseAndView} />, icon: 'bi-calendar-check' } },
        { req: { capability: 'leaves.view.self' }, item: { title: 'My Leaves', component: <PersonalLeaveView />, icon: 'bi-calendar-x' } },
        { req: 'universal', item: { title: 'Rules', component: <PersonalRules />, icon: 'bi-journal-text' } },
        { req: 'universal', item: { title: 'FAQS', component: <FaqsMainPage hideEditButton={true} />, icon: 'bi-question-circle' } },
    ];
    const tabItems: TabItem[] = allTabs.filter((t) => canSeeTab(t.req)).map((t) => t.item);

    const newAttendanceWizardBreadcrumb: Array<PageLink> = [
        {
            title: 'Personal',
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

    useEffect(() => {
        dispatch(fetchRolesAndPermissions() as any);
    }, []);

    const dispatchs = useDispatch<AppDispatch>(); 
    useEffect(() => {
        dispatchs(loadAllEmployeesIfNeeded());
    }, [dispatchs]);

    return (
        <>
            <PageTitle breadcrumbs={newAttendanceWizardBreadcrumb}>Attendance</PageTitle>
            <MaterialHeaderTab tabItems={tabItems} onTabChange={setActiveTab} activeTab={Math.min(activeTab, Math.max(0, tabItems.length - 1))} />
        </>
    );
};

export default PersonalAttendanceView;
