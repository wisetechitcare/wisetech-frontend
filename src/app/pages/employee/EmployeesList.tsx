import { useEffect, useState } from 'react';
import MaterialHeaderTab, { TabItem } from '@app/modules/common/components/MaterialHeaderTab';
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
    const [activeTab, setActiveTab] = useState(0);

     const dispatch = useDispatch<AppDispatch>();  
      useEffect(() => {
        dispatch(loadAllEmployeesIfNeeded());
      }, [dispatch]);

    const tabItems: TabItem[] = [
        {
            title: "Employees",
            component: <EmployeeListContent />,
            icon:
                activeTab === 0
                    ? companyLogoIcons.employeeConfigIcon.active
                    : companyLogoIcons.employeeConfigIcon.default,
        },
        {
            title: "Configure",
            component: <EmployeeConfigure />,
            icon:
                activeTab === 1
                    ? leadsIcons.leadsConfigIcon.active
                    : leadsIcons.leadsConfigIcon.default,
        }
    ];

    return (
        <>
            <PageTitle breadcrumbs={employeesBreadCrumb}>Employees Management</PageTitle>
            <MaterialHeaderTab tabItems={tabItems} onTabChange={setActiveTab} />
        </>
    )
}

export default EmployeeList;
