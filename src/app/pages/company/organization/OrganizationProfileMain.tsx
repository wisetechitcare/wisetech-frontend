import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Building2, Settings } from 'lucide-react';
import { PageTabs, type PageTabItem } from '@/ds/patterns/page-tabs';
import { PageLink, PageTitle } from '@metronic/layout/core';
import type { RootState } from '@redux/store';
import { IOrgNode } from '@models/company';
import { useTabRoute } from '@app/hooks/useTabRoute';
import { isSectionTabHidden } from '@utils/sectionTabs';
import OrganizationsPage from './OrganizationsPage';
import Masters from '../masters/Masters';

const ACCESS_SECTION = 'settings.profile';

const breadcrumbs: Array<PageLink> = [
    { title: 'Company', path: '#', isSeparator: false, isActive: false },
    { title: '', path: '', isSeparator: true, isActive: false },
];

function OrganizationProfileMain() {
    const navigate = useNavigate();

    // Open a specific organization's profile as its own routed page.
    const handleOpenOrg = (org: IOrgNode) => navigate(`/company/organization-profile/${org.id}`);

    const tabItems = [
        { title: 'Organizations', component: <OrganizationsPage onOpenOrg={handleOpenOrg} />, icon: Building2 },
        { title: 'Configure', component: <Masters />, icon: Settings },
    ];

    // The tab is the URL (/company/organization-profile/configure), so it survives a refresh,
    // a shared link, and the remount the header does at the mobile breakpoint. The base is
    // explicit: this route has no splat of its own (it shares its base with /:orgId), so an
    // omitted base picked up the app-wide `/*` splat and redirected to /organizations → 404.
    const { activeTab, setActiveTab } = useTabRoute('/company/organization-profile', tabItems.map((t) => t.title));

    // Tabs turned off for this person (Access → Advanced), and Configure without Write on the
    // section. Subscribed so a live access change re-renders the bar.
    useSelector((s: RootState) => (s as any).authz?.deniedTabs);
    useSelector((s: RootState) => (s as any).authz?.access);

    const pageTabs: PageTabItem[] = tabItems.map((t) => ({
        value: t.title,
        label: t.title,
        icon: t.icon,
        content: t.component,
        hidden: isSectionTabHidden(ACCESS_SECTION, t.title),
    }));

    return (
        <>
            <PageTitle breadcrumbs={breadcrumbs}>Organization Profile</PageTitle>
            <PageTabs
                // The masthead is fixed from 992px up and 74px tall; below that it scrolls away.
                className="min-[992px]:[--page-tabs-offset:74px]"
                items={pageTabs}
                value={tabItems[activeTab]?.title}
                onValueChange={(title) => {
                    const idx = tabItems.findIndex((t) => t.title === title);
                    if (idx >= 0) setActiveTab(idx);
                }}
            />
        </>
    );
}

export default OrganizationProfileMain;
