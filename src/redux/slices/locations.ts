import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface Locations {
    countries: [] | null;
    states: [] | null;
    cities: [] | null;
}

const initialState: Locations = {
    countries: null,
    states: null,
    cities: null
}

export const locationsSlice = createSlice({
    name: 'locations',
    initialState,
    reducers: {
        saveCountries: (state, action: PayloadAction<[]>) => {
            state.countries = action.payload;
        },
    }
});

export const { saveCountries } = locationsSlice.actions;

export default locationsSlice.reducer;