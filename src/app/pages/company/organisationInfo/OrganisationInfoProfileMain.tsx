import React from 'react'
import { PageLink, PageTitle } from '@metronic/layout/core';
import { useSelector } from 'react-redux';
import MaterialHeaderTab, { TabItem } from '@app/modules/common/components/MaterialHeaderTab';
import { companyOverviewIcons, leadsIcons } from '@metronic/assets/sidepanelicons';
import Masters from '../masters/Masters';
import OrganisationProfileForm from '../organisation/OrganisationProfileForm';
import { RootState } from '@redux/store';
import RuleMainPage from './rule/RuleMainPage';
import FaqsMainPage from './faqs/FaqsMainPage';
import { useTabRoute } from '@app/hooks/useTabRoute';

const OrganisationInfoProfileMain = () => {
      const isAdmin = useSelector(
          (state: RootState) => state.auth.currentUser.isAdmin
      );
  
      const tabItems: TabItem[] = [
          {
              title: "Rule",
            //   component: <OrganisationProfileForm />,
            component: <RuleMainPage />,
            icon: 'bi-journal-text',
          },
          {
              title: "FAQS",
            //   component: <Masters />,
            component: <FaqsMainPage />,
            icon: 'bi-question-circle',
          }
      ];

      // The tab is the URL (/company/organisation-info/faqs), so it survives a refresh, a
      // shared link, and the remount the header does at the mobile breakpoint.
      const { activeTab, setActiveTab } = useTabRoute(undefined, tabItems.map((t) => t.title));

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
              <MaterialHeaderTab tabItems={tabItems} activeTab={activeTab} onTabChange={setActiveTab} />
          </>
      )
}

export default OrganisationInfoProfileMain