import MaterialHeaderTab, { TabItem } from '@app/modules/common/components/MaterialHeaderTab';
import { calenderIcons, companiesIcons, leadsIcons, companyOverviewIcons } from '@metronic/assets/sidepanelicons';
import { PageLink, PageTitle } from '@metronic/layout/core';
import { RootState } from '@redux/store';
import React, { useState } from 'react'
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import OrganizationsPage from './OrganizationsPage';
import Masters from '../masters/Masters';
import { IOrgNode } from '@models/company';

function OrganisationProfileMain() {
    const [activeTab, setActiveTab] = useState(0);
    const navigate = useNavigate();

    const isAdmin = useSelector(
        (state: RootState) => state.auth.currentUser.isAdmin
    );

    // Open a specific organization's profile as its own routed page.
    const handleOpenOrg = (org: IOrgNode) => navigate(`/company/organisation-profile/${org.id}`);

    const tabItems: TabItem[] = [
        {
            title: "Organizations",
            component: <OrganizationsPage onOpenOrg={handleOpenOrg} />,
            icon: 'bi-building',
        },
        {
            title: "Configure",
            component: <Masters />,
            icon: 'bi-gear',
        }
    ];

    const overviewBreadcrumbs: Array<PageLink> = [
        {
            title: 'Company',
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

    return (
        <>
            <PageTitle breadcrumbs={overviewBreadcrumbs}>Organization Profile</PageTitle>
            <MaterialHeaderTab tabItems={tabItems} onTabChange={setActiveTab} />
        </>
    )
}

export default OrganisationProfileMain