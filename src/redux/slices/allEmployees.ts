import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { fetchAllEmployees, fetchAllEmployeesSelectedData } from "@services/employee";
import { AppDispatch, RootState } from "../store";

interface IAllEmployees {
  employeeId: string;
  employeeName: string;
  avatar: string;
  gender: string;
  roles: string[];
}

interface AllEmployeesState {
  list: IAllEmployees[];
  isLoading: boolean;
  isInitialized: boolean;
}

const initialState: AllEmployeesState = {
  list: [],
  isLoading: false,
  isInitialized: false,
};

// Async thunk to fetch and trim data
export const fetchAllEmployeesAsync = createAsyncThunk(
  "allEmployees/fetchAllEmployeesAsync",
  async () => {
    const response = await fetchAllEmployeesSelectedData();

    
    const employees = response?.data?.employees ?? [];
    // console.log("fetchAllEmployeesfetchAllEmployees: ",employees);
    
    return employees.map((emp: any) => ({
      employeeId: emp.id,
      employeeName: `${emp.users?.firstName || ""} ${emp.users?.lastName || ""}`.trim(),
      avatar: emp?.avatar,
      gender: emp?.gender,
      roles: emp?.roles?.map((role: any) => role?.name).filter(Boolean) || [],
    }));
  }
);

// Slice
const allEmployeesSlice = createSlice({
  name: "allEmployees",
  initialState,
  reducers: {
    setAllEmployees: (state, action: PayloadAction<IAllEmployees[]>) => {
      state.list = action.payload;
      state.isInitialized = true;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllEmployeesAsync.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchAllEmployeesAsync.fulfilled, (state, action) => {
        state.list = action.payload;
        state.isLoading = false;
        state.isInitialized = true;
      })
      .addCase(fetchAllEmployeesAsync.rejected, (state) => {
        state.isLoading = false;
        state.isInitialized = true;
      });
  },
});

export const { setAllEmployees } = allEmployeesSlice.actions;
export default allEmployeesSlice.reducer;

export const loadAllEmployeesIfNeeded = () => (dispatch: AppDispatch, getState: () => RootState) => {
  const { isInitialized } = getState().allEmployees;
  if (!isInitialized) {
    dispatch(fetchAllEmployeesAsync());
  }
};
