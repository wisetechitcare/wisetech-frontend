export interface ProjectType {
    id: string;
    title: string;
    subtitle: string;
}

export interface ChartData {
  label: string;
  value: number;
  color: string;
  totalCost?: number;
  id?: string;
}

export interface ChartState {
  statusData: ChartData[];
  teamData: ChartData[];
  categoryData: ChartData[];
  serviceData: ChartData[];
  subcategoryData: ChartData[];
  yearlyData: any[];
  locationData: any[];
  companyTypeData?: any[];
  companyTypeYearlyData?: any[];
}

export interface ProjectItem {
  id: string;
  name: string;
  color: string;
  isActive: boolean;
  categoryId?: string;
  createdAt?: string;
  updatedAt?: string;
  subCategories?: number;
  // Preset tasks only — the main preset task this one is filed under
  // (null/absent = it is a main task itself).
  parentId?: string | null;
  // Lifecycle-flow position (project statuses only) — drives display order
  // everywhere the status list/picker is shown. Set via the reorder controls
  // in Project Configuration, not hand-typed.
  sortOrder?: number;
}


export interface ProjectCategory {
  id: string;
  name: string;
  color: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConfigItem {
  id?: string;
  name: string;
  color: string;
  isActive: boolean;
  categoryId?: string; // For subcategory
  parentId?: string | null; // For preset tasks — the main task this one sits under
  // Stages only — the preset tasks in this stage, in stage order. `tasks` is what the API
  // returns (each row wrapping a preset task); `presetTaskIds` is what a save sends back.
  tasks?: StageTaskLink[];
  presetTaskIds?: string[];
  // Stages only — the project type the stage belongs to. `subCategoryId` null = the whole
  // category. (`categoryId` above is the legacy subcategory-form field; a stage reuses it.)
  subCategoryId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  sortOrder?: number;
}

/** One preset task's membership in a stage, as the stages API returns it. */
export interface StageTaskLink {
  presetTaskId: string;
  sortOrder?: number;
  presetTask?: { id: string; name: string; parentId?: string | null };
}