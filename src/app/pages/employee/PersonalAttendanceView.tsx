import { useEffect } from 'react';
import MaterialHeaderTab, { TabItem } from '@app/modules/common/components/MaterialHeaderTab';
import { useTabRoute } from '@app/hooks/useTabRoute';
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
    
    const tabItems: TabItem[] = [
        {
            title: 'Overview',
            component: <OverviewView />,
            icon: 'bi-grid-1x2',
        },
        {
            title: 'My Attendance',
            component: <MyAttendanceView resourseAndView={resourseAndView} />,
            icon: 'bi-calendar-check',
        },
        {
            title: 'My Leaves',
            component: <PersonalLeaveView />,
            icon: 'bi-calendar-x',
        },
        {
            title: 'Rules',
            component: <PersonalRules />,
            icon: 'bi-journal-text',
        },
        {
            title: 'FAQS',
            component: <FaqsMainPage hideEditButton={true} />,
            icon: 'bi-question-circle',
        },
    ];

    // The tab is the URL (/employee/attendance-and-leaves/my-attendance), so it survives a
    // refresh, a shared link, and the remount the header does at the mobile breakpoint.
    const { activeTab, setActiveTab } = useTabRoute(undefined, tabItems.map((t) => t.title));

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
            <MaterialHeaderTab tabItems={tabItems} onTabChange={setActiveTab} activeTab={activeTab} />
        </>
    );
};

export default PersonalAttendanceView;
