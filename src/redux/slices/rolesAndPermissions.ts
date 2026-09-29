import { store } from "@redux/store";
import { PayloadAction, createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { fetchCurrentEmployeeByUserId } from "@services/employee";
import { saveCurrentEmployee } from "./employee";
// Holds the signed-in employee (`emp`) for the ownership checks in hasPermission. Access itself
// lives in the authz slice. The name is historical — ~25 screens dispatch this thunk on mount.
interface RolesAndPermissions {
  emp: string;
  isLoading: boolean;
  error: string | null;
}

const initialState: RolesAndPermissions = {
  emp: "",
  isLoading: false,
  error: null,
};

export const fetchRolesAndPermissions = createAsyncThunk(
  "rolesAndPermissions/fetchRolesAndPermissions",
  async () => {
    let employeeDetails = store.getState().employee.currentEmployee;
    
    if(!employeeDetails?.id || !employeeDetails?.userId || !employeeDetails?.roles) {
      
      const ls = localStorage.getItem("wise_tech_login")
      const parsedLs = ls ? JSON.parse(ls) : null
      try {
        
        const { data: currEmpRes } = await fetchCurrentEmployeeByUserId(parsedLs.id)
        
        store.dispatch(saveCurrentEmployee(currEmpRes.employee));
        const { employee } = currEmpRes;
        employeeDetails = employee;
        
      } catch (error) {
        throw error;
      }
      
    }


    return {
      emp: JSON.stringify(employeeDetails)
    };
  }
);

export const rolesAndPermissionsSlice = createSlice({
  name: "rolesAndPermissions",
  initialState,
  reducers: {
    saveRolesAndPermissions: (state, action: PayloadAction<any>) => {
      state = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchRolesAndPermissions.pending, (state) => {
      state.isLoading = true;
    });
    builder.addCase(fetchRolesAndPermissions.fulfilled, (state, action) => {
      state.isLoading = false;
      state.emp = action.payload.emp;
    });
    builder.addCase(fetchRolesAndPermissions.rejected, (state, action) => {
      state.isLoading = false;
      state.error =
        action.error.message || "Failed To Fetch Roles And Permissions";
    });
  },
});

export const { saveRolesAndPermissions } = rolesAndPermissionsSlice.actions;

export default rolesAndPermissionsSlice.reducer;
