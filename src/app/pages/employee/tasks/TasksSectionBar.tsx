import React from 'react';
import { useNavigate } from 'react-router-dom';
import MaterialHeaderTab, { type TabItem } from '@app/modules/common/components/MaterialHeaderTab';
import { usePermission } from '@hooks/usePermission';
import { tabSlug } from '@app/hooks/useTabRoute';

/**
 * The Tasks section's tabs — ONE list, read by the section page (TasksMain) and by the pages
 * that open inside the section (a task's detail page), so the bar can never differ between
 * them. Configure only for those who may configure: task config is shared by every tenant.
 */
export const useTasksTabs = () => {
    const canConfigure = usePermission('tasks.manage.all');
    return [
        { title: 'Overview', icon: 'bi-grid-1x2' },
        { title: 'Tasks', icon: 'bi-check2-square' },
        ...(canConfigure ? [{ title: 'Configure', icon: 'bi-gear' }] : []),
    ];
};

/**
 * The section's tab bar over a page that lives INSIDE the section but is not one of its tabs
 * (a task's detail page). The Tasks tab is shown as current; picking any tab goes to it —
 * the same sticky bar as the section page, so there is always a way across the section.
 */
const TasksSectionBar: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const navigate = useNavigate();
    const tabs = useTasksTabs();
    const tabItems: TabItem[] = tabs.map((t) => ({ ...t, component: children }));
    return (
        <MaterialHeaderTab
            tabItems={tabItems}
            activeTab={tabs.findIndex((t) => t.title === 'Tasks')}
            onTabChange={(index) => navigate(`/tasks/${tabSlug(tabs[index].title)}`)}
            accessSection="tasks"
        />
    );
};

export default TasksSectionBar;
