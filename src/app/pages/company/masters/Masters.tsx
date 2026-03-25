import { PageHeadingTitle } from '@metronic/layout/components/header/page-title/PageHeadingTitle';
import { PageLink, PageTitle } from '@metronic/layout/core';
import React from 'react'
import EmployeeTypes from './EmployeeTypes';
import Towns from './Towns';
import Departments from '../Departments';
import Designations from '../Designation';
import OrganizationConfigure from './OrganizationConfigure';

const employeeTypeBreadCrumb: Array<PageLink> = [
    {
        title: 'Company',
        path: '#',
        isSeparator: false,
        isActive: false
    },
    {
        title: '',
        path: '',
        isSeparator: true,
        isActive: false
    },
];


function Masters() {
    return (
        <>
            <div className="d-flex flex-wrap justify-content-start align-items-center ">
                {/* <PageTitle breadcrumbs={employeeTypeBreadCrumb}>Masters</PageTitle> */}
                {/* <PageHeadingTitle /> */}
            </div>

            <OrganizationConfigure />

            <Departments />

            <Designations />

            <Towns />
        </>

    )
}

export default Masters