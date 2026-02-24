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
  createdAt?: string;
  updatedAt?: string;
}