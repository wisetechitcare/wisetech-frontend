
import axios from "axios";
import { COMPANY, EMPLOYEE, OPTIONS } from "@constants/api-endpoint";
import { ICompanyDesignation, ICompanyEmployeeTypeUpdate } from "@models/company";
import { RootState } from "@redux/store";
import { useDispatch, useSelector } from "react-redux";
import { saveCountries } from "@redux/slices/locations";
import { IReimbursementType, IReimbursementTypeCreate, IReimbursementTypeFetch } from "@models/employee";

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;

export const fetchAllCountries = async () => {
    try {
        const headers = {
            'X-CSCAPI-KEY': 'NUtqYkpPTjNVMmlRbUhCM3FxMnVlSnlUTXRPSE93cGY4VnJKMXVaQw==',
        };

        const { data } = await axios.get('https://api.countrystatecity.in/v1/countries', { headers });

        return data;
    } catch (err) {
        throw err;
    }
}

// Prefix Settings API
export const fetchAllPrefixSettings = async () => {
    try {
        const endpoint = `${API_BASE_URL}/${OPTIONS.GET_ALL_PREFIX_SETTINGS}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
};


export const createPrefixSetting = async (payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${OPTIONS.CREATE_PREFIX_SETTING}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
};

export const updatePrefixSetting = async (id: string, payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${OPTIONS.UPDATE_PREFIX_SETTING.replace(':id', id)}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
};

export const deletePrefixSetting = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${OPTIONS.DELETE_PREFIX_SETTING.replace(':id', id)}`;
        const { data } = await axios.delete(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
};

export const fetchCountryName = async (ciso: string) => {
    try {
        const headers = {
            'X-CSCAPI-KEY': 'NUtqYkpPTjNVMmlRbUhCM3FxMnVlSnlUTXRPSE93cGY4VnJKMXVaQw==',
        };

        const url = `https://api.countrystatecity.in/v1/countries/${ciso}`;

        const { data } = await axios.get(url, { headers });

        return data;
    } catch (err) {
        throw err;
    }
}

export const fetchAllStates = async (ciso: string) => {
    try {
        const headers = {
            'X-CSCAPI-KEY': 'NUtqYkpPTjNVMmlRbUhCM3FxMnVlSnlUTXRPSE93cGY4VnJKMXVaQw==',
        };

        const url = `https://api.countrystatecity.in/v1/countries/${ciso}/states`;

        const { data } = await axios.get(url, { headers });

        return data;
    } catch (err) {
        throw err;
    }
}

export const fetchStateName = async (ciso: string, siso: string) => {
    try {
        const headers = {
            'X-CSCAPI-KEY': 'NUtqYkpPTjNVMmlRbUhCM3FxMnVlSnlUTXRPSE93cGY4VnJKMXVaQw==',
        };

        const url = `https://api.countrystatecity.in/v1/countries/${ciso}/states/${siso}`;

        const { data } = await axios.get(url, { headers });

        return data;
    } catch (err) {
        throw err;
    }
}

export const fetchAllCities = async (ciso: string, siso: string) => {
    try {
        const headers = {
            'X-CSCAPI-KEY': 'NUtqYkpPTjNVMmlRbUhCM3FxMnVlSnlUTXRPSE93cGY4VnJKMXVaQw==',
        };

        const url = `https://api.countrystatecity.in/v1/countries/${ciso}/states/${siso}/cities`;

        const { data } = await axios.get(url, { headers });

        return data;
    } catch (err) {
        throw err;
    }
}

export const fetchAllTowns = async () => {
    try {
        const endpoint = `${API_BASE_URL}/${OPTIONS.TOWNS}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}
export const createNewTowns = async (payload: { companyId: string, towns: string[] }) => {
  try {
    const endpoint = `${API_BASE_URL}/${OPTIONS.CREATE_TOWN}`;
    // Extract the town name from the towns array and send only the name
    const name = payload.towns[0];
    const { data } = await axios.post(endpoint, { name });
    return data;
  } catch (err: any) {
    console.error("Error creating town:", err.response?.data || err.message);
    throw err;
  }
};

export const updateTownById = async (id: string, payload: { name: string }) => {
    try {
        const endpoint = `${API_BASE_URL}/${OPTIONS.UPDATE_TOWN_BY_ID}?id=${id}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    }
    catch (err) {
        throw err;
    }
}


export const fetchDepartments = async () => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.GET_ALL_DEPARTMENTS}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const fetchDesignations = async () => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.GET_ALL_DESIGNATION}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const createDesignation = async (designations: ICompanyDesignation[]) => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.CREATE_DESIGNATION}`;
        const { data } = await axios.post(endpoint, { designations });
        return data;
    } catch (err) {
        throw err;
    }
};



export const updateDesignationById = async (designationId: string, payload: ICompanyDesignation) => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.UPDATE_DESIGNATION_BY_ID.replace(':designationId', designationId)}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    }
    catch (err) {
        throw err;
    }

}


// Fetch Onboarding Docs
export const fetchOnboardingDocs = async (companyId: string) => {
    try {
        // Passing companyId as query parameter in the endpoint
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.GET_ONBOARDING_DOC_LIST}?companyId=${companyId}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Create Onboarding Docs
export const createOnboardingDocs = async (payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/api/employee/onboarding-documents`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
}

export const updateOnboardingDocs = async (id: string, payload: any) => {
    try {
        // Endpoint with query parameter 'id' and sending 'payload' as the request body
        const endpoint = `${API_BASE_URL}/api/employee/onboarding-documents?id=${id}`;
        const { data } = await axios.put(endpoint, payload); // Pass 'payload' in body
        return data;
    } catch (err) {
        throw err;
    }
}



export const fetchBranches = async () => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.GET_ALL_BRANCHES}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const fetchEmployeeStatus = async () => {
    try {
        const endpoint = `${API_BASE_URL}/${OPTIONS.GET_EMPLOYEE_STATUS}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const fetchEmployeeTypes = async () => {
    try {
        const endpoint = `${API_BASE_URL}/${OPTIONS.GET_EMPLOYEE_TYPES}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const fetchSrcOfHire = async () => {
    try {
        const endpoint = `${API_BASE_URL}/${OPTIONS.GET_SOURCE_OF_HIRE}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const fetchWorkingMethods = async () => {
    try {
        const endpoint = `${API_BASE_URL}/${OPTIONS.GET_WORKING_METHODS}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const fetchAllReimbursementTypes = async () => {
    try {
        const endpoint = `${API_BASE_URL}/${OPTIONS.GET_ALL_REIMBURSEMENT_TYPES}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const deleteReimbursementTypeById = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${OPTIONS.DELETE_REIMBURSEMENT_TYPES_BY_ID}?id=${id}`;
        const { data } = await axios.delete(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const createNewReimbursementType = async (reimbursementTypeData: IReimbursementTypeCreate) => {
    try {
        const endpoint = `${API_BASE_URL}/${OPTIONS.CREATE_REIMBURSEMENT_TYPE}`;
        const { data } = await axios.post(endpoint, { ...reimbursementTypeData });
        return data;
    } catch (err) {
        throw err;
    }
}

export const updateCurrReimbursementTypeById = async (reimbursementTypeData: IReimbursementTypeCreate, id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${OPTIONS.UPDATE_REIMBURSEMENT_TYPE_BY_ID}?id=${id}`;
        const { data } = await axios.put(endpoint, { ...reimbursementTypeData });
        return data;
    } catch (err) {
        throw err;
    }
}

export const fetchCompanySettings = async () => {
    try {
        const endpoint = `${API_BASE_URL}/${OPTIONS.GET_COMPANY_SETTINGS}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const updateCompanySettings = async (payload: any, id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${OPTIONS.UPDATE_COMPANY_SETTINGS}?id=${id}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const createNewEmployeeType = async (payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${OPTIONS.CREATE_EMPLOYEE_TYPES}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const updateEmployeeTypeById = async (payload: ICompanyEmployeeTypeUpdate) => {
    try {
        const endpoint = `${API_BASE_URL}/${OPTIONS.UPDATE_EMPLOYEE_TYPE_BY_ID}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    }
    catch (err) {
        throw err;
    }

}


export const createSourceOfHire = async (payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${OPTIONS.CREATE_SOURCE_OF_HIRE}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const createEmployeeStatus = async (payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${OPTIONS.CREATE_EMPLOYEE_STATUS}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    }
    catch (err) {
        throw err;
    }
}
export const fetchAllColors = async () => {
    try {
        const endpoint = `${API_BASE_URL}/${OPTIONS.GET_ALL_COLORS}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}
export const createColors = async (colorData: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${OPTIONS.CREATE_COLOR}`;
        const { data } = await axios.post(endpoint, { ...colorData });
        return data;
    } catch (err) {
        throw err;
    }
}

export const updateColorsById = async (colorData: any, id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${OPTIONS.UPDATE_COLOR_BY_ID}?id=${id}`;
        const { data } = await axios.put(endpoint, { ...colorData });
        return data;
    } catch (err) {
        throw err;
    }
}

export const fetchAllCurrencies = async () => {
    try {
        const endpoint = `${API_BASE_URL}/${OPTIONS.GET_CURRENCIES}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}