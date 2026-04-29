import { useEffect, useState } from 'react';
import MaterialHeaderTab, { TabItem } from '@app/modules/common/components/MaterialHeaderTab';
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
    const [activeTab, setActiveTab] = useState(0); 
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
            icon: activeTab === 0 ? navbarIcon.overview.active : navbarIcon.overview.default,
        },
        {
            title: 'My Attendance',
            component: <MyAttendanceView resourseAndView={resourseAndView} />,
            icon: activeTab === 1 ? navbarIcon.myAttendance.active : navbarIcon.myAttendance.default,
        },
        {
            title: 'My Leaves',
            component: <PersonalLeaveView />,
            icon: activeTab === 2 ? navbarIcon.leaves.active : navbarIcon.leaves.default,
        },
        {
            title: 'Rules',
            component: <PersonalRules />,
            icon: activeTab === 3 ? leadsIcons.leadsConfigIcon.active
                                  : leadsIcons.leadsConfigIcon.default, // Can be SVG or Image URL
        },
        {
            title: 'FAQS',
            component: <FaqsMainPage hideEditButton={true} />,
            icon: activeTab === 4 ? faqsIcons.faqDefualtIcon?.active
                      : faqsIcons.faqDefualtIcon?.default,
        },
    ];

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
