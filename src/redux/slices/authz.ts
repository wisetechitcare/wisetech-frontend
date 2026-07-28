import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { fetchCapabilities } from '@services/auth';

interface AuthzState {
  capabilities: string[];
  blockedSections: string[];
  // True if the employee is staffed on at least one project (PM, execution-team
  // member, or internal roster entry) — lets the Projects section reveal itself
  // even without a general crm.leads/projects grant, since the list narrows to
  // just the projects they're actually on.
  hasProjectMemberships: boolean;
  // True only for a genuine Super Admin — gates Super-Admin-only UI.
  isSuperAdmin: boolean;
  // True if the actor can see across sub-orgs (Super Admin / Group Admin). When
  // false the scope bar locks to their own sub-org/branch (homeCompanyId/Branch).
  isGroupWide: boolean;
  homeCompanyId: string | null;
  homeBranchId: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthzState = {
  capabilities: [],
  blockedSections: [],
  hasProjectMemberships: false,
  isSuperAdmin: false,
  isGroupWide: false,
  homeCompanyId: null,
  homeBranchId: null,
  isLoading: false,
  error: null,
};

export const fetchAuthzCapabilities = createAsyncThunk('authz/fetchCapabilities', async () => {
  const response = await fetchCapabilities();
  return {
    capabilities: response?.data?.capabilities || [],
    blockedSections: response?.data?.blockedSections || [],
    hasProjectMemberships: response?.data?.hasProjectMemberships || false,
    isSuperAdmin: response?.data?.isSuperAdmin || false,
    isGroupWide: response?.data?.isGroupWide || false,
    homeCompanyId: response?.data?.homeCompanyId ?? null,
    homeBranchId: response?.data?.homeBranchId ?? null,
  };
});

export const authzSlice = createSlice({
  name: 'authz',
  initialState,
  reducers: {
    saveCapabilities: (state, action: PayloadAction<string[]>) => {
      state.capabilities = action.payload;
    },
    clearCapabilities: (state) => {
      state.capabilities = [];
      state.blockedSections = [];
      state.hasProjectMemberships = false;
      state.isSuperAdmin = false;
      state.isGroupWide = false;
      state.homeCompanyId = null;
      state.homeBranchId = null;
      state.error = null;
      state.isLoading = false;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchAuthzCapabilities.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchAuthzCapabilities.fulfilled, (state, action) => {
      state.isLoading = false;
      state.capabilities = action.payload.capabilities;
      state.blockedSections = action.payload.blockedSections;
      state.hasProjectMemberships = action.payload.hasProjectMemberships;
      state.isSuperAdmin = action.payload.isSuperAdmin;
      state.isGroupWide = action.payload.isGroupWide;
      state.homeCompanyId = action.payload.homeCompanyId;
      state.homeBranchId = action.payload.homeBranchId;
    });
    builder.addCase(fetchAuthzCapabilities.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.error.message || 'Failed to fetch capabilities';
    });
  },
});

export const { saveCapabilities, clearCapabilities } = authzSlice.actions;

export default authzSlice.reducer;
