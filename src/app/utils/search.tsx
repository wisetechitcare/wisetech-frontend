import React from 'react';
import { getAllClientCompanies, getAllClientContacts } from '@services/companies';
import { getAllLeads } from '@services/leads';
import { getAllProjects } from '@services/projects';
import { fetchAllEmployeesSelectedData } from '@services/employee';
import { getAllTasks } from '@services/tasks';

/**
 * Intelligent Search Filter for Material React Table.
 * Implements OR logic between keywords across all searchable fields.
 */
export const intelligentSearchFilterFn = (row: any, columnId: string, filterValue: any): boolean => {
  if (!filterValue || filterValue.trim() === '') return true;

  const keywords = filterValue.toLowerCase().trim().split(/\s+/).filter((k: string) => k.length > 0);
  if (keywords.length === 0) return true;

  const rowData = row.original;
  const searchableValues: string[] = [];

  const extractValues = (obj: any) => {
    if (!obj) return;
    Object.values(obj).forEach(value => {
      if (value === null || value === undefined) return;
      if (typeof value === 'object') {
        const nestedObj = value as any;
        if (nestedObj.name) searchableValues.push(String(nestedObj.name).toLowerCase());
        if (nestedObj.fullName) searchableValues.push(String(nestedObj.fullName).toLowerCase());
        if (nestedObj.title) searchableValues.push(String(nestedObj.title).toLowerCase());
      } else {
        searchableValues.push(String(value).toLowerCase());
      }
    });
  };

  extractValues(rowData);

  return keywords.some((keyword: string) => 
    searchableValues.some((val: string) => val.includes(keyword))
  );
};

/**
 * HighlightMatch component for highlighting search terms in text.
 */
export const HighlightMatch: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  if (!query || !query.trim() || !text) return <>{text || ''}</>;

  const keywords = query.toLowerCase().trim().split(/\s+/).filter((k: string) => k.length > 0);
  if (keywords.length === 0) return <>{text}</>;

  const escapedKeywords = keywords.map((k: string) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escapedKeywords.join('|')})`, 'gi');
  
  const parts = String(text).split(regex);

  return (
    <>
      {parts.map((part, i) => (
        regex.test(part) ? (
          <mark 
            key={i} 
            style={{ 
              backgroundColor: '#fff3cd', 
              color: 'inherit',
              padding: '0 1px', 
              borderRadius: '2px',
              borderBottom: '1px solid #ffd33d'
            }}
          >
            {part}
          </mark>
        ) : part
      ))}
    </>
  );
};

export interface SearchMatchField {
  label: string;
  value: string;
  isMatch: boolean;
}

export interface UnifiedSearchResult {
  id: string;
  title: string;
  subtitle: string;
  type: 'Company' | 'Contact' | 'Lead' | 'Project' | 'Employee' | 'Task' | 'Navigation' | 'KPI';
  path: string;
  icon: string;
  matches?: SearchMatchField[];
  tags?: string[];
  metadata?: any;
}

/**
 * Static Search Index for Pages, Navigation, and KPIs
 */
export const STATIC_SEARCH_INDEX: Omit<UnifiedSearchResult, 'id'>[] = [
  // Core Pages
  { title: 'Dashboard', subtitle: 'Main Overview', type: 'Navigation', path: '/dashboard', icon: 'element-11', tags: ['home', 'main', 'index'] },
  { title: 'Leads', subtitle: 'Manage Inquiries', type: 'Navigation', path: '/qc/leads', icon: 'graph-3', tags: ['inquiry', 'sales', 'potential'] },
  { title: 'Companies', subtitle: 'Client Companies', type: 'Navigation', path: '/qc/companies', icon: 'briefcase', tags: ['client', 'organization', 'firm'] },
  { title: 'Contacts', subtitle: 'Client Contacts', type: 'Navigation', path: '/qc/contacts', icon: 'profile-circle', tags: ['people', 'person', 'phonebook'] },
  { title: 'Projects', subtitle: 'Manage Projects', type: 'Navigation', path: '/qc/projects', icon: 'element-11', tags: ['work', 'plan', 'active'] },
  { title: 'Employees', subtitle: 'Staff Management', type: 'Navigation', path: '/employees', icon: 'profile-user', tags: ['staff', 'workers', 'team'] },
  { title: 'Tasks', subtitle: 'Daily Tasks', type: 'Navigation', path: '/tasks', icon: 'check-square', tags: ['todo', 'action', 'assignment'] },
  
  // Finance & HR
  { title: 'Attendance', subtitle: 'Attendance & Leaves', type: 'Navigation', path: '/employees/attendance-and-leaves', icon: 'calendar-tick', tags: ['leave', 'holiday', 'absent', 'present', 'clock'] },
  { title: 'Salary', subtitle: 'Payroll & Salary', type: 'Navigation', path: '/finance/salary', icon: 'wallet', tags: ['pay', 'money', 'income', 'payroll', 'slip'] },
  { title: 'Loans', subtitle: 'Employee Loans', type: 'Navigation', path: '/finance/loans', icon: 'bank', tags: ['advance', 'borrow', 'credit', 'money'] },
  { title: 'Reimbursements', subtitle: 'Bills & Expenses', type: 'Navigation', path: '/finance/bills', icon: 'bill', tags: ['expense', 'claim', 'money', 'refund'] },
  { title: 'Timesheet', subtitle: 'My Time Sheet', type: 'Navigation', path: '/tasks/timesheet', icon: 'time', tags: ['hours', 'log', 'work'] },
  { title: 'Employee Timesheet', subtitle: 'Team Time Sheets', type: 'Navigation', path: '/tasks/employee-timesheet', icon: 'timer', tags: ['team', 'hours', 'log'] },
  
  // Company Admin
  { title: 'Departments', subtitle: 'Organization Departments', type: 'Navigation', path: '/company/departments', icon: 'category', tags: ['group', 'unit', 'team'] },
  { title: 'Designations', subtitle: 'Job Roles', type: 'Navigation', path: '/company/designations', icon: 'crown', tags: ['position', 'role', 'title'] },
  { title: 'Branches', subtitle: 'Office Locations', type: 'Navigation', path: '/company/branches', icon: 'map', tags: ['location', 'office', 'site'] },
  { title: 'Public Holidays', subtitle: 'Holiday Calendar', type: 'Navigation', path: '/company/public-holiday', icon: 'calendar', tags: ['off', 'vacation', 'festival'] },
  { title: 'Media', subtitle: 'Company Assets', type: 'Navigation', path: '/company/media', icon: 'gallery', tags: ['image', 'video', 'file', 'attachment'] },
  { title: 'Announcements', subtitle: 'Notices & News', type: 'Navigation', path: '/company/announcements', icon: 'notification', tags: ['broadcast', 'alert', 'message'] },
  { title: 'Settings', subtitle: 'Global Settings', type: 'Navigation', path: '/settings', icon: 'setting-2', tags: ['config', 'setup', 'admin'] },
  
  // KPI / Dashboard Labels
  { title: 'Absent Employees', subtitle: 'KPI • Who is off today', type: 'KPI', path: '/employees/attendance-and-leaves', icon: 'user-cross', tags: ['leave', 'not here', 'absent'] },
  { title: 'Working Employees', subtitle: 'KPI • Who is working', type: 'KPI', path: '/employees/attendance-and-leaves', icon: 'user-tick', tags: ['present', 'duty', 'active'] },
  { title: 'Pending Tasks', subtitle: 'KPI • Overdue tasks', type: 'KPI', path: '/tasks', icon: 'notification-bing', tags: ['late', 'todo', 'pending'] },
  { title: 'Active Leads', subtitle: 'KPI • Hot leads', type: 'KPI', path: '/leads', icon: 'star', tags: ['priority', 'hot', 'new'] },
];

export const performGlobalSearch = async (query: string): Promise<UnifiedSearchResult[]> => {
  if (!query || query.trim().length < 2) return [];

  try {
    const [companiesRes, contactsRes, leadsRes, projectsRes, employeesRes, tasksRes] = await Promise.all([
      getAllClientCompanies(),
      getAllClientContacts(),
      getAllLeads(),
      getAllProjects(),
      fetchAllEmployeesSelectedData(),
      getAllTasks()
    ]);

    const getArr = (res: any, key: string) => {
      if (!res) return [];
      if (Array.isArray(res)) return res;
      if (Array.isArray(res[key])) return res[key];
      if (res.data && Array.isArray(res.data[key])) return res.data[key];
      if (res.data && res.data.data && Array.isArray(res.data.data[key])) return res.data.data[key];
      if (res.data && Array.isArray(res.data)) return res.data;
      return [];
    };

    const keywords = query.toLowerCase().trim().split(/\s+/).filter(k => k.length > 0);
    const results: UnifiedSearchResult[] = [];

    // 1. Static Navigation & Label Search
    STATIC_SEARCH_INDEX.filter(item => 
      keywords.some(k => 
        item.title.toLowerCase().includes(k) || 
        item.subtitle.toLowerCase().includes(k) ||
        (item.tags && item.tags.some(tag => tag.includes(k)))
      )
    ).forEach((item, idx) => results.push({
      ...item,
      id: `static-${idx}`,
    } as UnifiedSearchResult));

    // 2. Dynamic Data Search
    // Companies
    const comps = getArr(companiesRes, 'companies');
    console.log('Global Search Debug - Companies:', comps.length);
    comps.filter((c: any) => 
      keywords.some(k => 
        (c.companyName || '').toLowerCase().includes(k) || 
        (c.companyType?.name || '').toLowerCase().includes(k) ||
        (c.prefix || '').toLowerCase().includes(k) ||
        (c.email || '').toLowerCase().includes(k) ||
        (c.phone || '').toLowerCase().includes(k) ||
        (c.city || '').toLowerCase().includes(k) ||
        (c.state || '').toLowerCase().includes(k)
      )
    ).forEach((c: any) => {
      const matches: SearchMatchField[] = [
        { label: 'Type', value: c.companyType?.name || 'N/A', isMatch: keywords.some(k => (c.companyType?.name || '').toLowerCase().includes(k)) },
        { label: 'ID', value: c.prefix || 'N/A', isMatch: keywords.some(k => (c.prefix || '').toLowerCase().includes(k)) },
        { label: 'Location', value: `${c.city || ''} ${c.state || ''}`.trim() || 'N/A', isMatch: keywords.some(k => (c.city || '').toLowerCase().includes(k) || (c.state || '').toLowerCase().includes(k)) }
      ];
      results.push({
        id: c.id,
        title: c.companyName || 'Unnamed Company',
        subtitle: `Company • ${c.companyType?.name || 'N/A'}`,
        type: 'Company',
        path: `/companies/${c.id}`,
        icon: 'briefcase',
        matches,
        metadata: c
      });
    });

    // Contacts
    const conts = getArr(contactsRes, 'contacts');
    console.log('Global Search Debug - Contacts:', conts.length);
    conts.filter((c: any) => 
      keywords.some(k => 
        (c.fullName || '').toLowerCase().includes(k) || 
        (c.phone || '').includes(k) || 
        (c.email || '').toLowerCase().includes(k) ||
        (c.department || '').toLowerCase().includes(k) ||
        (c.designation || '').toLowerCase().includes(k) ||
        (c.company?.companyName || '').toLowerCase().includes(k)
      )
    ).forEach((c: any) => {
      const matches: SearchMatchField[] = [
        { label: 'Phone', value: c.phone || 'N/A', isMatch: keywords.some(k => (c.phone || '').includes(k)) },
        { label: 'Email', value: c.email || 'N/A', isMatch: keywords.some(k => (c.email || '').toLowerCase().includes(k)) },
        { label: 'Company', value: c.company?.companyName || 'N/A', isMatch: keywords.some(k => (c.company?.companyName || '').toLowerCase().includes(k)) }
      ];
      results.push({
        id: c.id,
        title: c.fullName || 'Unnamed Contact',
        subtitle: `Contact • ${c.designation || 'Staff'}`,
        type: 'Contact',
        path: `/contacts/${c.id}`,
        icon: 'profile-circle',
        matches,
        metadata: c
      });
    });

    // Leads
    const lds = getArr(leadsRes, 'leads');
    console.log('Global Search Debug - Leads:', lds.length);
    lds.filter((l: any) => 
      keywords.some(k => 
        (l.title || '').toLowerCase().includes(k) || 
        (l.prefix || '').toLowerCase().includes(k) || 
        (l.status?.name || '').toLowerCase().includes(k) ||
        (l.company?.companyName || '').toLowerCase().includes(k) ||
        (l.contact?.fullName || '').toLowerCase().includes(k)
      )
    ).forEach((l: any) => {
      const matches: SearchMatchField[] = [
        { label: 'Inquiry ID', value: l.prefix || 'N/A', isMatch: keywords.some(k => (l.prefix || '').toLowerCase().includes(k)) },
        { label: 'Client', value: l.company?.companyName || l.contact?.fullName || 'N/A', isMatch: keywords.some(k => (l.company?.companyName || '').toLowerCase().includes(k) || (l.contact?.fullName || '').toLowerCase().includes(k)) },
        { label: 'Status', value: l.status?.name || 'New', isMatch: keywords.some(k => (l.status?.name || '').toLowerCase().includes(k)) }
      ];
      results.push({
        id: l.id,
        title: l.title || 'Untitled Lead',
        subtitle: `Lead • ${l.status?.name || 'New'}`,
        type: 'Lead',
        path: `/employee/lead/${l.id}`,
        icon: 'graph-3',
        matches,
        metadata: l
      });
    });

    // Projects
    const projs = getArr(projectsRes, 'projects');
    console.log('Global Search Debug - Projects:', projs.length);
    projs.filter((p: any) => 
      keywords.some(k => 
        (p.title || '').toLowerCase().includes(k) || 
        (p.projectCode || '').toLowerCase().includes(k) || 
        (p.status?.name || '').toLowerCase().includes(k) ||
        (p.branchNames || '').toLowerCase().includes(k) ||
        (p.clientCompanies || '').toLowerCase().includes(k)
      )
    ).forEach((p: any) => {
      const matches: SearchMatchField[] = [
        { label: 'Code', value: p.projectCode || 'N/A', isMatch: keywords.some(k => (p.projectCode || '').toLowerCase().includes(k)) },
        { label: 'Status', value: p.status?.name || 'Active', isMatch: keywords.some(k => (p.status?.name || '').toLowerCase().includes(k)) }
      ];
      results.push({
        id: p.id,
        title: p.title || 'Untitled Project',
        subtitle: `Project • ${p.projectCode || p.status?.name || 'Active'}`,
        type: 'Project',
        path: `/projects/${p.id}`,
        icon: 'element-11',
        matches,
        metadata: p
      });
    });

    // Employees
    const emps = getArr(employeesRes, 'employees');
    console.log('Global Search Debug - Employees:', emps.length);
    emps.filter((e: any) => 
      keywords.some(k => 
        (e.users?.firstName || '').toLowerCase().includes(k) || 
        (e.users?.lastName || '').toLowerCase().includes(k) || 
        (e.employeeCode || '').toLowerCase().includes(k) || 
        (e.companyEmailId || '').toLowerCase().includes(k)
      )
    ).forEach((e: any) => {
      const matches: SearchMatchField[] = [
        { label: 'Code', value: e.employeeCode || 'N/A', isMatch: keywords.some(k => (e.employeeCode || '').toLowerCase().includes(k)) },
        { label: 'Email', value: e.companyEmailId || 'N/A', isMatch: keywords.some(k => (e.companyEmailId || '').toLowerCase().includes(k)) }
      ];
      results.push({
        id: e.id,
        title: e.users ? `${e.users.firstName} ${e.users.lastName}` : 'Unknown Employee',
        subtitle: `Employee • ${e.employeeCode || ''}`,
        type: 'Employee',
        path: `/employees/${e.id}`,
        icon: 'profile-user',
        matches,
        metadata: e
      });
    });

    // Tasks
    const tsks = getArr(tasksRes, 'tasks');
    console.log('Global Search Debug - Tasks:', tsks.length);
    tsks.filter((t: any) => 
      keywords.some(k => 
        (t.taskName || '').toLowerCase().includes(k) || 
        (t.taskDescription || '').toLowerCase().includes(k) || 
        (t.status?.name || '').toLowerCase().includes(k)
      )
    ).forEach((t: any) => {
      const matches: SearchMatchField[] = [
        { label: 'Description', value: t.taskDescription || 'N/A', isMatch: keywords.some(k => (t.taskDescription || '').toLowerCase().includes(k)) },
        { label: 'Status', value: t.status?.name || 'Pending', isMatch: keywords.some(k => (t.status?.name || '').toLowerCase().includes(k)) }
      ];
      results.push({
        id: t.id,
        title: t.taskName || 'Untitled Task',
        subtitle: `Task • ${t.status?.name || 'Pending'}`,
        type: 'Task',
        path: `/tasks/${t.id}`,
        icon: 'check-square',
        matches,
        metadata: t
      });
    });

    return results;
  } catch (error) {
    console.error('Unified Search Error:', error);
    return [];
  }
};
