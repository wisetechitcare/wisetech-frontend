import React from 'react';
import { getAllClientCompanies, getAllClientContacts } from '@services/companies';
import { getAllLeads } from '@services/leads';
import { getAllProjects } from '@services/projects';
import { fetchAllEmployeesSelectedData } from '@services/employee';
import { getAllTasks } from '@services/tasks';

/**
 * Compact a string to alphanumeric-only (drops spaces, punctuation, @, dashes,
 * underscores). Used for space/punctuation-insensitive matching so that a query
 * typed without spaces still matches a spaced value: "dmart" ↔ "D Mart".
 */
const compact = (text: string): string => text.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Intelligent Search Filter for Material React Table (used when the built-in
 * global filter is active, i.e. enableColumnSpecificSearch=false).
 *
 * Matching is robust but predictable — every query keyword must be found in the
 * row (AND logic), each keyword matching either as a plain substring OR, space-
 * and punctuation-insensitively, in the row's compacted form. This makes
 * "dmart", "d mart", "d-mart" and "d_mart" all match "D Mart @ Cancer Hospital",
 * while a multi-word query still narrows the result set instead of widening it.
 */
export const intelligentSearchFilterFn = (row: any, columnId: string, filterValue: any): boolean => {
  if (!filterValue || String(filterValue).trim() === '') return true;

  // Keep spaces here so multi-word queries stay multi-keyword (AND). Treat
  // dashes/underscores as spaces so "d-mart" → keywords ["d", "mart"].
  const normalizedQuery = String(filterValue).toLowerCase().trim().replace(/[-_]/g, ' ').replace(/\s+/g, ' ');
  const queryKeywords = normalizedQuery.split(' ').filter(Boolean);
  if (queryKeywords.length === 0) return true;

  const rowData = row.original || row;
  const searchableValues: string[] = [];

  const extractValues = (obj: any, depth = 0) => {
    if (depth > 10 || !obj || typeof obj !== 'object') return; // prevent infinite recursion
    Object.values(obj).forEach((value) => {
      if (value === null || value === undefined) return;
      if (typeof value === 'object') extractValues(value, depth + 1);
      else searchableValues.push(String(value).toLowerCase());
    });
  };
  extractValues(rowData);

  // Whole-row text (spaced) + its compacted form, computed once.
  const rowText = searchableValues.join(' ');
  const rowTextCompact = compact(rowText);

  // AND logic: every keyword must match — plain substring, or compacted (no-space) substring.
  return queryKeywords.every((keyword) => {
    if (rowText.includes(keyword)) return true;
    const k = compact(keyword);
    return k.length > 0 && rowTextCompact.includes(k);
  });
};



/**
 * HighlightMatch — highlights the parts of `text` that match `query`.
 *
 * Matching is space/punctuation-insensitive to mirror the search filter: typing
 * "dmart" highlights the whole "D Mart" span in "D Mart @ Cancer Hospital". It
 * works on a compacted (alphanumeric-only) view of the text and maps matches
 * back to the original characters, so the spaces/punctuation inside a matched
 * run stay highlighted too. Whole-phrase matches get a stronger emphasis than
 * individual word matches.
 */
export const HighlightMatch: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  const raw = String(text ?? '');
  if (!query || !query.trim() || !raw) return <>{raw}</>;

  const toCompact = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Compacted text + a map from each compacted index back to the original index.
  const lower = raw.toLowerCase();
  let compactText = '';
  const mapToOrig: number[] = [];
  for (let i = 0; i < lower.length; i++) {
    const ch = lower[i];
    if ((ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9')) {
      compactText += ch;
      mapToOrig.push(i);
    }
  }
  if (!compactText) return <>{raw}</>;

  // Highlight level per original char: 0 = none, 1 = word match, 2 = full phrase.
  const levels = new Array(raw.length).fill(0);
  const mark = (needle: string, level: number) => {
    if (!needle) return;
    let from = 0;
    let idx = compactText.indexOf(needle, from);
    while (idx !== -1) {
      const origStart = mapToOrig[idx];
      const origEnd = mapToOrig[idx + needle.length - 1]; // inclusive
      for (let j = origStart; j <= origEnd; j++) {
        if (levels[j] < level) levels[j] = level;
      }
      from = idx + needle.length;
      idx = compactText.indexOf(needle, from);
    }
  };

  const normalizedQuery = query.toLowerCase().trim().replace(/[-_]/g, ' ').replace(/\s+/g, ' ');
  const words = normalizedQuery.split(' ').filter(Boolean);
  words.forEach((w) => mark(toCompact(w), 1));
  if (words.length > 1) mark(toCompact(normalizedQuery), 2); // whole phrase = stronger

  if (levels.every((l) => l === 0)) return <>{raw}</>;

  // Group consecutive characters of the same level into runs.
  const runs: { text: string; level: number }[] = [];
  let cur = raw[0];
  let curLevel = levels[0];
  for (let i = 1; i < raw.length; i++) {
    if (levels[i] === curLevel) {
      cur += raw[i];
    } else {
      runs.push({ text: cur, level: curLevel });
      cur = raw[i];
      curLevel = levels[i];
    }
  }
  runs.push({ text: cur, level: curLevel });

  return (
    <>
      {runs.map((run, i) => {
        if (run.level === 0) return <React.Fragment key={i}>{run.text}</React.Fragment>;
        const isPhrase = run.level === 2;
        return (
          <mark
            key={i}
            style={{
              backgroundColor: isPhrase ? '#ffe066' : '#fff3cd',
              color: 'inherit',
              padding: '0 1px',
              borderRadius: '2px',
              borderBottom: isPhrase ? '2px solid #fab005' : '1px solid #ffd33d',
              fontWeight: isPhrase ? 'bold' : 'normal',
              boxShadow: isPhrase ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            {run.text}
          </mark>
        );
      })}
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
  { title: 'Leads', subtitle: 'Manage Inquiries', type: 'Navigation', path: '/leads', icon: 'graph-3', tags: ['inquiry', 'sales', 'potential'] },
  { title: 'Companies', subtitle: 'Client Companies', type: 'Navigation', path: '/companies', icon: 'briefcase', tags: ['client', 'organization', 'firm'] },
  { title: 'Contacts', subtitle: 'Client Contacts', type: 'Navigation', path: '/contacts', icon: 'profile-circle', tags: ['people', 'person', 'phonebook'] },
  { title: 'Projects', subtitle: 'Manage Projects', type: 'Navigation', path: '/projects', icon: 'element-11', tags: ['work', 'plan', 'active'] },
  { title: 'Employees', subtitle: 'Staff Management', type: 'Navigation', path: '/employees', icon: 'profile-user', tags: ['staff', 'workers', 'team'] },
  { title: 'Tasks', subtitle: 'Daily Tasks', type: 'Navigation', path: '/tasks', icon: 'check-square', tags: ['todo', 'action', 'assignment'] },
  
  // Finance & HR
  { title: 'Attendance', subtitle: 'Attendance & Leaves', type: 'Navigation', path: '/employees/attendance-and-leaves', icon: 'calendar-tick', tags: ['leave', 'holiday', 'absent', 'present', 'clock'] },
  { title: 'Salary', subtitle: 'Payroll & Salary', type: 'Navigation', path: '/finance/salary', icon: 'wallet', tags: ['pay', 'money', 'income', 'payroll', 'slip'] },
  { title: 'Loans', subtitle: 'Employee Loans', type: 'Navigation', path: '/finance/loans', icon: 'bank', tags: ['advance', 'borrow', 'credit', 'money'] },
  { title: 'Reimbursements', subtitle: 'Bills & Expenses', type: 'Navigation', path: '/finance/reimbursements', icon: 'bill', tags: ['expense', 'claim', 'money', 'refund'] },
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

/**
 * Advanced Query Processing (Phase 1)
 */
export const processSearchQuery = (rawQuery: string) => {
  const normalized = rawQuery.toLowerCase().trim().replace(/[^\w\s]/gi, '');
  const tokens = normalized.split(/\s+/).filter(t => t.length > 0);
  
  const partialPhrases: string[] = [];
  if (tokens.length > 1) {
    for (let i = 0; i < tokens.length - 1; i++) {
      partialPhrases.push(`${tokens[i]} ${tokens[i+1]}`);
    }
  }

  return {
    original: rawQuery,
    normalized,
    tokens,
    fullPhrase: normalized,
    partialPhrases
  };
};

/**
 * Fuzzy Matching (Phase 1 & 5)
 */
const levenshteinDistance = (s: string, t: string): number => {
  if (!s.length) return t.length;
  if (!t.length) return s.length;
  const arr = [];
  for (let i = 0; i <= t.length; i++) {
    arr[i] = [i];
    for (let j = 1; j <= s.length; j++) {
      arr[i][j] = i === 0 ? j : Math.min(arr[i - 1][j] + 1, arr[i][j - 1] + 1, arr[i - 1][j - 1] + (s[j - 1] === t[i - 1] ? 0 : 1));
    }
  }
  return arr[t.length][s.length];
};

export const isFuzzyMatch = (target: string, query: string, threshold = 0.3): boolean => {
  if (!target || !query) return false;
  const t = target.toLowerCase();
  const q = query.toLowerCase();
  if (t.includes(q)) return true;
  const distance = levenshteinDistance(t, q);
  return distance / Math.max(t.length, q.length) <= threshold;
};

export const calculateMatchScore = (fieldValue: string, queryInfo: ReturnType<typeof processSearchQuery>): number => {
  if (!fieldValue) return 0;
  const val = fieldValue.toLowerCase();
  
  // 1. EXACT PHRASE MATCH (+100)
  if (val.includes(queryInfo.fullPhrase)) return 100;

  // 2. ORDERED WORD MATCH (+70)
  let lastIdx = -1;
  let allOrdered = true;
  for (const token of queryInfo.tokens) {
    const idx = val.indexOf(token, lastIdx + 1);
    if (idx === -1) {
      allOrdered = false;
      break;
    }
    lastIdx = idx;
  }
  if (allOrdered && queryInfo.tokens.length > 0) return 70;

  // 3. PARTIAL PHRASE MATCH (+50)
  if (queryInfo.partialPhrases.some(pp => val.includes(pp))) return 50;

  // 4. ALL WORDS PRESENT (ANY ORDER) (+30)
  if (queryInfo.tokens.every(token => val.includes(token))) return 30;

  // 5. PARTIAL WORD MATCH (+10 per word)
  const matchedTokens = queryInfo.tokens.filter(token => {
    if (token.length <= 2) {
      // For very short tokens, require word boundary match (e.g. start of word)
      return new RegExp(`\\b${token}`).test(val);
    }
    return val.includes(token);
  });
  if (matchedTokens.length > 0) return 10 * matchedTokens.length;

  return 0;
};

const FIELD_WEIGHTS: Record<string, number> = {
  projectName: 10,
  title: 10,
  client: 8,
  companyName: 8,
  fullName: 8,
  category: 6,
  subcategory: 6,
  service: 5,
  status: 4,
  code: 4,
  others: 3
};

import axios from 'axios';

export const performGlobalSearch = async (query: string, signal?: AbortSignal): Promise<UnifiedSearchResult[]> => {
  if (!query || query.trim().length < 2) return [];

  try {
    const queryInfo = processSearchQuery(query);
    const results: (UnifiedSearchResult & { score: number })[] = [];

    // 1. Concurrent Search: Static Local + Dynamic Backend
    const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND || '';
    const [backendRes] = await Promise.all([
      axios.get(`${API_BASE_URL}/api/search/global-search`, {
        params: { q: query, limit: 50 },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        signal,
      }).catch((err) => {
        if (axios.isCancel(err)) return { data: { results: {} } };
        console.error('Backend Search Failed:', err);
        return { data: { results: {} } };
      })
    ]);

    // 2. Static Navigation & Label Search (Local for speed)
    STATIC_SEARCH_INDEX.forEach((item, idx) => {
      const titleScore = calculateMatchScore(item.title, queryInfo) * (FIELD_WEIGHTS.title || 3);
      const subtitleScore = calculateMatchScore(item.subtitle, queryInfo) * (FIELD_WEIGHTS.others || 3);
      const tagScore = item.tags ? Math.max(...item.tags.map(t => calculateMatchScore(t, queryInfo))) * (FIELD_WEIGHTS.others || 3) : 0;
      
      let score = titleScore + subtitleScore + tagScore;
      
      // Fuzzy fallback for static items
      if (score === 0 && isFuzzyMatch(item.title, query)) {
        score = 20;
      }

      if (score > 0) {
        results.push({
          ...item,
          id: `static-${idx}`,
          score
        } as any);
      }
    });

    // 3. Process Backend Results
    const backendData = backendRes.data?.results || {};
    
    // Helper to map backend results to UnifiedSearchResult
    const mapResult = (item: any, type: UnifiedSearchResult['type'], pathBase: string, icon: string) => {
      results.push({
        id: item.id,
        title: item.title,
        subtitle: `${type} • ${item.subtitle || ''}`,
        type,
        path: `${pathBase}/${item.id}`,
        icon,
        score: item.score,
        metadata: item.data
      });
    };

    if (backendData.projects) backendData.projects.forEach((p: any) => mapResult(p, 'Project', '/projects', 'element-11'));
    if (backendData.leads) backendData.leads.forEach((l: any) => mapResult(l, 'Lead', '/employee/lead', 'graph-3'));
    if (backendData.companies) backendData.companies.forEach((c: any) => mapResult(c, 'Company', '/companies', 'briefcase'));
    if (backendData.contacts) backendData.contacts.forEach((c: any) => mapResult(c, 'Contact', '/contacts', 'profile-circle'));
    if (backendData.employees) backendData.employees.forEach((e: any) => mapResult(e, 'Employee', '/employees', 'profile-user'));
    if (backendData.pages) backendData.pages.forEach((pg: any) => mapResult(pg, 'Navigation', '', 'explore'));

    // Sort by score DESC and limit (Phase 7)
    return results.sort((a, b) => b.score - a.score).slice(0, 50);
  } catch (error) {
    console.error('Unified Search Error:', error);
    return [];
  }
};


