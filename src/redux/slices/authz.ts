import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { fetchCapabilities } from '@services/auth';

interface AuthzState {
  capabilities: string[];
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthzState = {
  capabilities: [],
  isLoading: false,
  error: null,
};

export const fetchAuthzCapabilities = createAsyncThunk('authz/fetchCapabilities', async () => {
  const response = await fetchCapabilities();
  return response?.data?.capabilities || [];
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
      state.capabilities = action.payload;
    });
    builder.addCase(fetchAuthzCapabilities.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.error.message || 'Failed to fetch capabilities';
    });
  },
});

export const { saveCapabilities, clearCapabilities } = authzSlice.actions;

export default authzSlice.reducer;
