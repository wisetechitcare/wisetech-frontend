import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { fetchCapabilities } from '@services/auth';

// The signed-in employee's section access, as GET /api/auth/capabilities returns it. Read through
// @utils/can (canSection / can) — never directly — so every screen follows one decision.
interface AuthzState {
  tier: 'SUPER_ADMIN' | 'ADMIN' | null;
  access: Record<string, { read: boolean; write: boolean }>;
  keys: string[];
  /** Leads / projects: see records not their own, and their money. */
  records: Record<string, { readAll: boolean; commercial: boolean }>;
  /** Tabs turned off for this person (Access → Advanced), as `<section>/<tab>`. */
  deniedTabs: string[];
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthzState = {
  tier: null,
  access: {},
  keys: [],
  records: {},
  deniedTabs: [],
  isLoading: false,
  error: null,
};

export const fetchAuthzCapabilities = createAsyncThunk('authz/fetchCapabilities', async () => {
  const response = await fetchCapabilities();
  return {
    tier: response?.data?.tier ?? null,
    access: response?.data?.access || {},
    keys: response?.data?.keys || [],
    records: response?.data?.records || {},
    deniedTabs: response?.data?.deniedTabs || [],
  };
});

export const authzSlice = createSlice({
  name: 'authz',
  initialState,
  reducers: {
    clearCapabilities: () => initialState,
  },
  extraReducers: (builder) => {
    builder.addCase(fetchAuthzCapabilities.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchAuthzCapabilities.fulfilled, (state, action) => {
      state.isLoading = false;
      state.tier = action.payload.tier;
      state.access = action.payload.access;
      state.keys = action.payload.keys;
      state.records = action.payload.records;
      state.deniedTabs = action.payload.deniedTabs;
    });
    builder.addCase(fetchAuthzCapabilities.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.error.message || 'Failed to fetch capabilities';
    });
  },
});

export const { clearCapabilities } = authzSlice.actions;

export default authzSlice.reducer;
