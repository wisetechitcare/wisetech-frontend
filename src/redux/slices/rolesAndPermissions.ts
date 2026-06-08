import { store } from "@redux/store";
import { PayloadAction, createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { fetchCurrentEmployeeByUserId } from "@services/employee";
import { getDynamicRolesObject } from "@utils/dynamicRoles";
import { saveCurrentEmployee } from "./employee";
interface RolesAndPermissions {
  rap: string;
  emp: string;
  isLoading: boolean;
  error: string | null;
}

const initialState: RolesAndPermissions = {
  rap: "",
  emp: "",
  isLoading: false,
  error: null,
};

export const fetchRolesAndPermissions = createAsyncThunk(
  "rolesAndPermissions/fetchRolesAndPermissions",
  async () => {
    
    const response = await getDynamicRolesObject();
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
      rap: JSON.stringify(response || {}),
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
      state.rap = action.payload.rap;
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
