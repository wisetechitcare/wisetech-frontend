// Translates technical permission keys (`module.action.scope`) into plain
// English for non-technical admins. The UI shows these labels everywhere a raw
// key would otherwise appear.

export const MODULE_LABELS: Record<string, string> = {
  users: "Employees",
  attendance: "Attendance",
  leaves: "Leaves",
  projects: "Projects",
  tasks: "Tasks",
  timesheets: "Timesheets",
  "crm.leads": "Leads",
  "crm.companies": "Companies",
  "crm.contacts": "Contacts",
  kpi: "Performance (KPI)",
  finance: "Finance & Payroll",
  reports: "Reports",
  approvals: "Approvals",
  settings: "Settings",
  profile: "Profile",
  dashboard: "Dashboard",
};

export const ACTION_LABELS: Record<string, string> = {
  view: "View",
  create: "Add",
  update: "Edit",
  delete: "Delete",
  approve: "Approve",
  export: "Export",
  assign: "Assign",
  manage: "Full control",
};

// Who the permission applies to, phrased for a non-technical reader.
export const SCOPE_LABELS: Record<string, string> = {
  self: "their own records",
  team: "their team",
  department: "their department",
  all: "the whole organization",
  global: "everywhere",
};

const titleCase = (s: string) => s.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export interface HumanPermission {
  raw: string;
  module: string;
  action: string;
  scope: string;
  moduleLabel: string;
  actionLabel: string;
  scopeLabel: string;
  /** e.g. "Edit Attendance for the whole organization" */
  sentence: string;
}

/**
 * Parse a `module.action.scope` key (module may itself contain a dot, e.g.
 * `crm.leads`) into friendly parts. Handles the admin wildcard keys too.
 */
export const humanizeKey = (key: string): HumanPermission => {
  if (key === "*.*.global" || key === "*.*.all") {
    return {
      raw: key,
      module: "*",
      action: "manage",
      scope: key.endsWith("global") ? "global" : "all",
      moduleLabel: "Everything",
      actionLabel: "Full control",
      scopeLabel: SCOPE_LABELS[key.endsWith("global") ? "global" : "all"],
      sentence: "Full administrator access to everything",
    };
  }

  const parts = key.split(".");
  const scope = parts.pop() || "";
  const action = parts.pop() || "";
  const module = parts.join(".");

  const moduleLabel = MODULE_LABELS[module] || titleCase(module);
  const actionLabel = ACTION_LABELS[action] || titleCase(action);
  const scopeLabel = SCOPE_LABELS[scope] || titleCase(scope);

  return {
    raw: key,
    module,
    action,
    scope,
    moduleLabel,
    actionLabel,
    scopeLabel,
    sentence: `${actionLabel} ${moduleLabel} for ${scopeLabel}`,
  };
};

export interface ModuleGroup {
  module: string;
  moduleLabel: string;
  items: HumanPermission[];
}

/** Group a flat list of keys by module, sorted, for a readable layout. */
export const groupKeysByModule = (keys: string[]): ModuleGroup[] => {
  const map = new Map<string, ModuleGroup>();
  for (const key of keys) {
    const h = humanizeKey(key);
    if (!map.has(h.module)) {
      map.set(h.module, { module: h.module, moduleLabel: h.moduleLabel, items: [] });
    }
    map.get(h.module)!.items.push(h);
  }
  return Array.from(map.values()).sort((a, b) => a.moduleLabel.localeCompare(b.moduleLabel));
};
