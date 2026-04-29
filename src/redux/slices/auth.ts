import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface CurrentUser {
  id: string;
  emailId: string;
  firstName: string;
  lastName: string;
  isAdmin: boolean;
  isActive: boolean;
  dateOfBirth: string;
}

export interface AuthState {
  redirectToDashboard: boolean;
  jwtToken: string;
  currentUser: CurrentUser
}

const initialState: AuthState = {
  redirectToDashboard: false,
  jwtToken: '',
  currentUser: {
    id: '',
    emailId: '',
    firstName: '',
    lastName: '',
    isActive: false,
    isAdmin: false,
    dateOfBirth: ''
  }
}

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    saveToken: (state, action: PayloadAction<string>) => {
      state.jwtToken = action.payload;
    },
    saveCurrentUser: (state, action: PayloadAction<CurrentUser>) => {
      state.currentUser = action.payload;
    },
    redirect: (state, action: PayloadAction<boolean>) => {
      state.redirectToDashboard = action.payload;
    },
    logoutUser: (state) => {
      state.currentUser = initialState.currentUser;
      state.jwtToken = initialState.jwtToken;
    }
  }
})

export const { saveToken, saveCurrentUser, logoutUser, redirect } = authSlice.actions;

export default authSlice.reducer;