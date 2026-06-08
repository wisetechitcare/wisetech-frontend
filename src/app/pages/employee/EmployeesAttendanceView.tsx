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
import { hasPermission } from '@utils/authAbac';
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from '@constants/statistics';
import { loadAllEmployeesIfNeeded } from '@redux/slices/allEmployees';
import { AppDispatch } from '@redux/store';

const EmployeesAttendanceView = () => {
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

    const tabItems: TabItem[] = [
        {
            title: 'Overview',
            component: <OverviewView />,
            icon: activeTab === 0 ? navbarIcon.overview.active : navbarIcon.overview.default, // Can be SVG or Image URL
        },
        {
            title: 'Individual',
            component: <IndividualView />,
            icon: activeTab === 1 ? navbarIcon.individualIcon.active : navbarIcon.individualIcon.default, // Can be SVG or Image URL
        },
        // {
        //     title: 'Configure',
        //     component: <Information key={informationKey} />,
        //     icon: activeTab === 2 ? leadsIcons.leadsConfigIcon.active
        //               : leadsIcons.leadsConfigIcon.default, // Can be SVG or Image URL
        // },
        // {
        //     title: 'FAQS',
        //     component: <FaqsMainPage />,
        //     icon: activeTab === 3 ? faqsIcons.faqDefualtIcon?.active
        //               : faqsIcons.faqDefualtIcon?.default, // Can be SVG or Image URL
        // },
         ...(hasPermission(resourceNameMapWithCamelCase.attendanceConfig, permissionConstToUseWithHasPermission.readOthers)
            ? [{
                title: 'Configure',
                component: <AttendanceConfig/>,
                icon: activeTab === 2 ? leadsIcons.leadsConfigIcon.active : leadsIcons.leadsConfigIcon.default, // Can be SVG or Image URL
            }]
            : []
        ),
        
          ...(hasPermission(resourceNameMapWithCamelCase.attendanceConfig, permissionConstToUseWithHasPermission.readOthers)
            ? [{
            title: 'FAQS',
            component: <AttendanceAdminFaqs />,
            icon: activeTab === 3 ? faqsIcons.faqDefualtIcon?.active
                      : faqsIcons.faqDefualtIcon?.default, // Can be SVG or Image URL
        }]: []),

    ];

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
            <MaterialHeaderTab tabItems={tabItems} activeTab={activeTab} onTabChange={setActiveTab}/>
        </>
    );
};

export default EmployeesAttendanceView;