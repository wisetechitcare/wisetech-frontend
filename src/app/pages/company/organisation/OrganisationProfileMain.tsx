import MaterialHeaderTab, { TabItem } from '@app/modules/common/components/MaterialHeaderTab';
import { calenderIcons, companiesIcons, leadsIcons, companyOverviewIcons } from '@metronic/assets/sidepanelicons';
import { PageLink, PageTitle } from '@metronic/layout/core';
import { RootState } from '@redux/store';
import React, { useState } from 'react'
import { useSelector } from 'react-redux';
import OrganisationProfileForm from './OrganisationProfileForm';
import Masters from '../masters/Masters';

function OrganisationProfileMain() {
    const [activeTab, setActiveTab] = useState(0);

    const isAdmin = useSelector(
        (state: RootState) => state.auth.currentUser.isAdmin
    );

    const tabItems: TabItem[] = [
        {
            title: "Organisation Profile",
            component: <OrganisationProfileForm />,
            icon:
                activeTab === 0
                    ? companyOverviewIcons.companyOverviewIcon.default
                    : companyOverviewIcons.companyOverviewIcon.default,
        },
        {
            title: "Configure",
            component: <Masters />,
            icon:
                activeTab === 1
                    ? leadsIcons.leadsConfigIcon.active
                    : leadsIcons.leadsConfigIcon.default,
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
            <PageTitle breadcrumbs={overviewBreadcrumbs}>Organisation Profile</PageTitle>
            <MaterialHeaderTab tabItems={tabItems} onTabChange={setActiveTab} />
        </>
    )
}

export default OrganisationProfileMain