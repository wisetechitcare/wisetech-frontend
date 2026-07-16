import { useEffect, useState } from 'react';
import MaterialHeaderTab, { TabItem } from '@app/modules/common/components/MaterialHeaderTab';
import {companyLogoIcons, leadsIcons } from '@metronic/assets/sidepanelicons';
import { PageLink, PageTitle } from '@metronic/layout/core';
import EmployeeListContent from './EmployeeListContent';
import EmployeeConfigure from './components/EmployeeConfigure';
import { useDispatch } from 'react-redux';
import { loadAllEmployeesIfNeeded } from '@redux/slices/allEmployees';
import { AppDispatch } from '@redux/store';
import { canDo } from '@utils/can';

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
    const [activeTab, setActiveTab] = useState(0);

    // Configure is a write-only surface: hidden for read-only viewers, so the
    // whole tab (not each button inside it) is the access control.
    const canConfigure = canDo("users", "update");

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
        ...(canConfigure
            ? [{
                title: "Configure",
                component: <EmployeeConfigure />,
                icon: 'bi-gear',
            }]
            : []),
    ];
    const safeActiveTab = Math.min(activeTab, tabItems.length - 1);

    return (
        <>
            <PageTitle breadcrumbs={employeesBreadCrumb}>Employees Management</PageTitle>
            <MaterialHeaderTab tabItems={tabItems} onTabChange={setActiveTab} activeTab={safeActiveTab} />
        </>
    )
}

export default EmployeeList;
