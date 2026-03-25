import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  createNewConfiguration,
  fetchConfiguration,
  updateConfigurationById,
  upsertEmployeeLPCChartSettings,
  fetchEmployeeLPCChartSettings,
} from "@services/company";
import {
  SHOW_LEADS_STATUS_CHART,
  SHOW_LEADS_BY_SERVICE_CHART,
  SHOW_LEADS_MONTHLY_LEADS_BY_STATUS,
  SHOW_LEADS_BY_PROJECT_CATEGORY_CHART,
  SHOW_LEADS_BY_SOURCE_CHART,
  SHOW_LEADS_FROM_REFERRAL_SOURCES_CHART,
  SHOW_LEADS_FROM_DIRECT_SOURCES_CHART,
  SHOW_LEADS_BY_PROJECT_SUB_CATEGORY_CHART,
  SHOW_LEADS_BY_LOCATION_CHART,
  SHOW_PROJECTS_STATUS_CHART,
  SHOW_PROJECTS_BY_SERVICE_CHART,
  SHOW_PROJECTS_BY_TEAM_CHART,
  SHOW_PROJECTS_BY_LOCATION_CHART,
  SHOW_PROJECTS_BY_PROJECT_CATEGORY_CHART,
  SHOW_PROJECTS_BY_PROJECT_SUB_CATEGORY_CHART,
  SHOW_PROJECTS_BY_MONTHLY_PROJECT_STATUS_CHART,
  SHOW_COMPANIES_BY_TYPE_CHART,
  SHOW_COMPANIES_BY_ROLES_CHART,
  SHOW_COMPANIES_BY_LOCATION_CHART,
  SHOW_COMPANIES_BY_STATUS_CHART,
  SHOW_TOP_LEADS,
  SHOW_LEADS_BY_COMPANY_TYPE_CHART,
} from "@constants/configurations-key";

interface IConfigMap {
  [module: string]: string;
}

interface ILeadProjectCompanies {
  // Leads settings
  showLeadsStatusChart: boolean;
  showLeadsByServiceChart: boolean;
  showLeadsMonthlyByStatus: boolean;
  showLeadsByProjectCategory: boolean;
  showLeadsBySource: boolean;
  showLeadsFromReferral: boolean;
  showLeadsFromDirect: boolean;
  showLeadsBySubCategory: boolean;
  showLeadsByLocation: boolean;
  showTopLeads: boolean;
  showLeadsByCompanyType: boolean;
  
  // Projects settings
  showProjectsStatus: boolean;
  showProjectsByService: boolean;
  showProjectsByTeam: boolean;
  showProjectsByLocation: boolean;
  showProjectsByCategory: boolean;
  showProjectsBySubCategory: boolean;
  showProjectsMonthlyStatus: boolean;
  showProjectsMonthlyCompanyType: boolean;
  showProjectYealyCustomCompanyType: boolean;
  
  // Companies settings
  showCompaniesByType: boolean;
  showCompaniesByRoles: boolean;
  showCompaniesByLocation: boolean;
  showCompaniesByStatus: boolean;
  showCompaniesByRating: boolean;
  showUpcomingContactBirthdays: boolean;
  
  // Meta states
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  configMap: IConfigMap;
}

const initialState: ILeadProjectCompanies = {
  // Leads settings - default to true
  showLeadsStatusChart: true,
  showLeadsByServiceChart: true,
  showLeadsMonthlyByStatus: true,
  showLeadsByProjectCategory: true,
  showLeadsBySource: true,
  showLeadsFromReferral: true,
  showLeadsFromDirect: true,
  showLeadsBySubCategory: true,
  showLeadsByLocation: true,
  showTopLeads: true,
  showLeadsByCompanyType: true,
  
  // Projects settings - default to true
  showProjectsStatus: true,
  showProjectsByService: true,
  showProjectsByTeam: true,
  showProjectsByLocation: true,
  showProjectsByCategory: true,
  showProjectsBySubCategory: true,
  showProjectsMonthlyStatus: true,
  showProjectsMonthlyCompanyType: true,
  showProjectYealyCustomCompanyType: true,
  
  // Companies settings - default to true
  showCompaniesByType: true,
  showCompaniesByRoles: true,
  showCompaniesByLocation: true,
  showCompaniesByStatus: true,
  showCompaniesByRating: true,
  showUpcomingContactBirthdays: true,
  
  // Meta states
  isLoading: false,
  error: null,
  isInitialized: false,
  configMap: {},
};

// Helper type for configuration keys
type ConfigKey = keyof Omit<ILeadProjectCompanies, 'isLoading' | 'error' | 'isInitialized' | 'configMap'>;

// Async thunk to fetch all configurations (employee-specific)
export const fetchAllConfigurations = createAsyncThunk(
  'chartSettings/fetchAllConfigurations',
  async (_, { rejectWithValue, getState }) => {
    try {
      // Get current employee ID from state
      const state = getState() as any;
      const employeeId = state.employee?.currentEmployee?.id;
      
      if (!employeeId) {
        return rejectWithValue('Employee ID not found');
      }

      // Try to fetch employee-specific settings first
      try {
        const employeeSettings = await fetchEmployeeLPCChartSettings(employeeId);
        if (employeeSettings?.data?.chartSettings?.settings) {
          const settings = employeeSettings.data.chartSettings.settings;
          return { values: settings, configMap: {} };
        }
      } catch (error) {
        // If no employee-specific settings found, continue with default values
        // console.log('No employee-specific settings found, using defaults');
      }

      // Return default values if no employee-specific settings
      const defaultValues: Partial<ILeadProjectCompanies> = {
        // Leads settings - default to true
        showLeadsStatusChart: true,
        showLeadsByServiceChart: true,
        showLeadsMonthlyByStatus: true,
        showLeadsByProjectCategory: true,
        showLeadsBySource: true,
        showLeadsFromReferral: true,
        showLeadsFromDirect: true,
        showLeadsBySubCategory: true,
        showLeadsByLocation: true,
        showTopLeads: true,
        showLeadsByCompanyType: true,
        
        // Projects settings - default to true
        showProjectsStatus: true,
        showProjectsByService: true,
        showProjectsByTeam: true,
        showProjectsByLocation: true,
        showProjectsByCategory: true,
        showProjectsBySubCategory: true,
        showProjectsMonthlyStatus: true,
        showProjectsMonthlyCompanyType:true,
        showProjectYealyCustomCompanyType:true,
        
        // Companies settings - default to true
        showCompaniesByType: true,
        showCompaniesByRoles: true,
        showCompaniesByLocation: true,
        showCompaniesByStatus: true,
        showCompaniesByRating: true,
        showUpcomingContactBirthdays: true,
      };
      
      return { values: defaultValues, configMap: {} };
    } catch (error) {
      return rejectWithValue('Failed to fetch configurations');
    }
  }
);

// Async thunk to save all configurations (employee-specific)
export const saveAllConfigurations = createAsyncThunk(
  'chartSettings/saveAllConfigurations',
  async (values: Partial<ILeadProjectCompanies>, { getState, rejectWithValue }) => {
    try {
      // Get current employee ID from state
      const state = getState() as any;
      const employeeId = state.employee?.currentEmployee?.id;
      
      if (!employeeId) {
        return rejectWithValue('Employee ID not found');
      }

      // Filter out meta properties and prepare settings for upsert
      const settingsToSave = { ...values };
      delete settingsToSave.isLoading;
      delete settingsToSave.error;
      delete settingsToSave.isInitialized;
      delete settingsToSave.configMap;

      // Upsert employee-specific chart settings
      await upsertEmployeeLPCChartSettings(employeeId, settingsToSave);
      
      return values;
    } catch (error) {
      return rejectWithValue('Failed to save configurations');
    }
  }
);

// Async thunk to initialize settings
export const initializeChartSettings = createAsyncThunk(
  'chartSettings/initialize',
  async (_, { dispatch }) => {
    await dispatch(fetchAllConfigurations());
    return true;
  }
);

const chartSettingsSlice = createSlice({
  name: "chartSettings",
  initialState,
  reducers: {
    updateSetting: (state, action: PayloadAction<{ key: ConfigKey; value: boolean }>) => {
      const { key, value } = action.payload;
      if (key in state) {
        (state as any)[key] = value;
      }
    },
    resetSettings: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Fetch configurations
      .addCase(fetchAllConfigurations.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAllConfigurations.fulfilled, (state, action) => {
        state.isLoading = false;
        Object.assign(state, action.payload.values);
        state.configMap = action.payload.configMap;
      })
      .addCase(fetchAllConfigurations.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Save configurations
      .addCase(saveAllConfigurations.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(saveAllConfigurations.fulfilled, (state, action) => {
        state.isLoading = false;
        Object.assign(state, action.payload);
      })
      .addCase(saveAllConfigurations.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Initialize
      .addCase(initializeChartSettings.fulfilled, (state) => {
        state.isInitialized = true;
      });
  },
});

export const { updateSetting, resetSettings } = chartSettingsSlice.actions;
export default chartSettingsSlice.reducer;

// Selectors
export const selectChartSettings = (state: { chartSettings: ILeadProjectCompanies }) => state.chartSettings;
export const selectIsLoading = (state: { chartSettings: ILeadProjectCompanies }) => state.chartSettings.isLoading;
export const selectError = (state: { chartSettings: ILeadProjectCompanies }) => state.chartSettings.error;
export const selectIsInitialized = (state: { chartSettings: ILeadProjectCompanies }) => state.chartSettings.isInitialized;