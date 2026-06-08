import React, { useState } from 'react'
import { PageLink, PageTitle } from '@metronic/layout/core';
import { useSelector } from 'react-redux';
import MaterialHeaderTab, { TabItem } from '@app/modules/common/components/MaterialHeaderTab';
import { companyOverviewIcons, leadsIcons } from '@metronic/assets/sidepanelicons';
import Masters from '../masters/Masters';
import OrganisationProfileForm from '../organisation/OrganisationProfileForm';
import { RootState } from '@redux/store';
import RuleMainPage from './rule/RuleMainPage';
import FaqsMainPage from './faqs/FaqsMainPage';

const OrganisationInfoProfileMain = () => {
  const [activeTab, setActiveTab] = useState(0);
  
      const isAdmin = useSelector(
          (state: RootState) => state.auth.currentUser.isAdmin
      );
  
      const tabItems: TabItem[] = [
          {
              title: "Rule",
            //   component: <OrganisationProfileForm />,
            component: <RuleMainPage />,
            //   icon:
            //       activeTab === 0
            //           ? companyOverviewIcons.companyOverviewIcon.default
            //           : companyOverviewIcons.companyOverviewIcon.default,
          },
          {
              title: "FAQS",
            //   component: <Masters />,
            component: <FaqsMainPage />,
            //   icon:
            //       activeTab === 1
            //           ? leadsIcons.leadsConfigIcon.active
            //           : leadsIcons.leadsConfigIcon.default,
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
              <PageTitle breadcrumbs={overviewBreadcrumbs}>{tabItems[activeTab].title}</PageTitle>
              <MaterialHeaderTab tabItems={tabItems} onTabChange={setActiveTab} />
          </>
      )
}

export default OrganisationInfoProfileMain