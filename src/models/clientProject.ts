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
  createdAt?: string;
  updatedAt?: string;
  sortOrder?: number;
}