import { useEffect } from 'react';
import MaterialHeaderTab, { TabItem } from '@app/modules/common/components/MaterialHeaderTab';
import { useTabRoute } from '@app/hooks/useTabRoute';
import {companyLogoIcons, leadsIcons } from '@metronic/assets/sidepanelicons';
import { PageLink, PageTitle } from '@metronic/layout/core';
import EmployeeListContent from './EmployeeListContent';
import EmployeeConfigure from './components/EmployeeConfigure';
import { useDispatch } from 'react-redux';
import { loadAllEmployeesIfNeeded } from '@redux/slices/allEmployees';
import { AppDispatch } from '@redux/store';

const employeesBreadCrumb: Array<PageLink> = [
    {
        title: 'Employees',
        path: '#',
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

function EmployeeList() {
     const dispatch = useDispatch<AppDispatch>();  
      useEffect(() => {
        dispatch(loadAllEmployeesIfNeeded());
      }, [dispatch]);

    const tabItems: TabItem[] = [
        {
            title: "Employees",
            component: <EmployeeListContent />,
            icon: 'bi-people',
        },
        {
            title: "Configure",
            component: <EmployeeConfigure />,
            icon: 'bi-gear',
        }
    ];

    // The tab is the URL (/employees/configure), so it survives a refresh, a shared link, and
    // the remount the header does at the mobile breakpoint. The base is spelled out rather than
    // derived: the first tab's slug is `employees`, which is also this page's own path segment,
    // so the hook could not tell the two apart.
    const { activeTab, setActiveTab } = useTabRoute('/employees', tabItems.map((t) => t.title));

    return (
        <>
            <PageTitle breadcrumbs={employeesBreadCrumb}>Employees Management</PageTitle>
            <MaterialHeaderTab tabItems={tabItems} activeTab={activeTab} onTabChange={setActiveTab} />
        </>
    )
}

export default EmployeeList;
