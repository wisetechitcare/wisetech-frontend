import axios from "axios";
import { LEAD_PROJECT_COMPANY } from "@constants/api-endpoint";
const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;


export const getPorjectById = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_PROJECT_BY_ID.replace(":id", id)}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}
// Get All Project Categories
export const getAllProjectCategories = async () => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_ALL_PROJECT_CATEGORIES}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Get Project Category By Id
export const getProjectCategoryById = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_PROJECT_CATEGORY_BY_ID}?id=${id}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Create Project Category
export const createProjectCategory = async (payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.CREATE_PROJECT_CATEGORY}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
}

// Update Project Category
export const updateProjectCategory = async (id: string, payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.UPDATE_PROJECT_CATEGORY.replace(":id", id)}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
}

// Delete Project Category
export const deleteProjectCategory = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.DELETE_PROJECT_CATEGORY.replace(":id", id)}`;
        const { data } = await axios.delete(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Get All Project Subcategories
export const getAllProjectSubcategories = async () => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_ALL_PROJECT_SUBCATEGORIES}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Get Project Subcategory By Id
export const getProjectSubcategoryById = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_PROJECT_SUBCATEGORY_BY_ID}?id=${id}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Create Project Subcategory
export const createProjectSubcategory = async (payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.CREATE_PROJECT_SUBCATEGORY}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
}

// Update Project Subcategory
export const updateProjectSubcategory = async (id: string, payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.UPDATE_PROJECT_SUBCATEGORY.replace(":id", id)}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
}

// Delete Project Subcategory
export const deleteProjectSubcategory = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.DELETE_PROJECT_SUBCATEGORY.replace(":id", id)}`;
        const { data } = await axios.delete(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Get All Project Services
export const getAllProjectServices = async () => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_ALL_PROJECT_SERVICES}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Get Project Service By Id
export const getProjectServiceById = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_PROJECT_SERVICE_BY_ID}?id=${id}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Create Project Service
export const createProjectService = async (payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.CREATE_PROJECT_SERVICE}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
}

// Update Project Service
export const updateProjectService = async (id: string, payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.UPDATE_PROJECT_SERVICE.replace(":id", id)}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
}

// Delete Project Service
export const deleteProjectService = async (id: string, targetId?: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.DELETE_PROJECT_SERVICE.replace(":id", id)}`;
        const payload = targetId ? { targetId } : {};
        const { data } = await axios.delete(endpoint, { data: payload });
        return data;
    } catch (err) {
        throw err;
    }
}

// Get All Project Statuses
export const getAllProjectStatuses = async () => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_ALL_PROJECT_STATUSES}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Get Project Status By Id
export const getProjectStatusById = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_PROJECT_STATUS_BY_ID}?id=${id}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}


// Create Project Status
export const createProjectStatus = async (payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.CREATE_PROJECT_STATUS}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
}

// Update Project Status
export const updateProjectStatus = async (id: string, payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.UPDATE_PROJECT_STATUS.replace(":id", id)}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
}

// Delete Project Status
export const deleteProjectStatus = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.DELETE_PROJECT_STATUS.replace(":id", id)}`;
        const { data } = await axios.delete(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Get Project status count
export const getProjectStatusCount = async (startDate: string, endDate: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_PROJECT_COUNT_BY_STATUS}`;
        const { data } = await axios.get(endpoint, {
            params: {
                startDate,
                endDate
            }
        });
        return data;
    } catch (err) {
        throw err;
    }
}


// Get Project team
export const getProjectTeamCount = async (startDate: string, endDate: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_PROJECT_COUNT_BY_TEAM}`;
        const { data } = await axios.get(endpoint, {
            params: {
                startDate,
                endDate
            }
        });
        return data;
    } catch (err) {
        throw err;
    }
}

// Get Project category count
export const getProjectCategoryCount = async (startDate: string, endDate: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_PROJECT_COUNT_BY_CATEGORY}`;
        const { data } = await axios.get(endpoint, {
            params: {
                startDate,
                endDate
            }
        });
        return data;
    } catch (err) {
        throw err;
    }
}

// Get all project services count
export const getProjectServiceCount = async (startDate: string, endDate: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_PROJECT_COUNT_BY_SERVICES}`;
        const { data } = await axios.get(endpoint, {
            params: {
                startDate,
                endDate
            }
        });
        return data;
    } catch (err) {
        throw err;
    }
}

// Get project subcategory count
export const getProjectSubcategoryCount = async (startDate: string, endDate: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_PROJECT_COUNT_BY_SUBCATEGORY}`;
        const { data } = await axios.get(endpoint, {
            params: {
                startDate,
                endDate
            }
        });
        return data;
    } catch (err) {
        throw err;
    }
}

// Get project status count yearly
export const getProjectStatusCountYearly = async (year: string, endDate: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_PROJECT_COUNT_BY_STATUS_YEARLY}`;
        const { data } = await axios.get(endpoint, {
            params: {
                year,
                endDate
            }
        });
        return data;
    } catch (err) {
        throw err;
    }
}

// Get project location count
export const getProjectLocationCount = async (startDate: string, endDate: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_PROJECT_COUNT_BY_LOCATION}`;
        const { data } = await axios.get(endpoint, {
            params: {
                startDate,
                endDate
            }
        });
        return data;
    } catch (err) {
        throw err;
    }
}

// Get All Projects
export const getAllProjects = async () => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_ALL_PROJECTS}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

export const getAllProjectCountForPrefix = async () => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_PROJECT_COUNT_FOR_PREFIX}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Get All Teams
export const getAllTeams = async (page: number = 1, limit: number = 5) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_ALL_TEAMS}`;
        const { data } = await axios.get(endpoint, {
            params: {
                page,
                limit
            }
        });
        return data;
    } catch (err) {
        throw err;
    }
}
//CREATE TEAM
export const createTeam = async (payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.CREATE_TEAM}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    } catch (err) {
        console.log("create team error", err);
        throw err;
    }
}

// CREATE TEAM WITH MEMBERS
export const createTeamWithMembers = async (payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.CREATE_TEAM_WITH_MEMBERS}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    } catch (err) {
        console.log("create team with members error", err);
        throw err;
    }
}
export const updateTeam = async (id: string, payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.UPDATE_TEAM_BY_ID.replace(":id", id)}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    } catch (err) {
        console.log("update team error", err);
        throw err;
    }
}
export const deleteTeam = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.DELETE_TEAM_BY_ID.replace(":id", id)}`;
        const { data } = await axios.delete(endpoint);
        return data;
    } catch (err) {
        console.log("delete team error", err);
        throw err;
    }
}

export const getAllTeamsMember = async () => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_ALL_TEAMS_MEMBERS}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        console.log("teams error", err);
        throw err;
    }
}

export const deleteMember = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.DELETE_MEMBER.replace(":id", id)}`;
        const { data } = await axios.delete(endpoint);
        return data;
    } catch (err) {
        console.log("teams error", err);
        throw err;
    }
}

// Delete Team


export const updateMemberRole = async (id: string, role: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.UPDATE_MEMBER_ROLE.replace(":id", id)}`;
        const { data } = await axios.put(endpoint, { role });
        return data;
    } catch (err) {
        console.log("update member role error", err);
        throw err;
    }
}

export const createMultipleTeamMembers = async (payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.CREATE_MULTIPLE_TEAMS_MEMBERS}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    } catch (err) {
        console.log("create multiple team members error", err);
        throw err;
    }
}

// Get All stakeholders services
export const getAllStakeholders = async () => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_ALL_STAKEHOLDER_SERVICES}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Create stakeholder service
export const createStakeholder = async (payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.CREATE_STAKEHOLDER_SERVICE}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
}

// Update stakeholder service
export const updateStakeholderService = async (id: string, payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.UPDATE_STAKEHOLDER_SERVICE.replace(":id", id)}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
}

// Delete stakeholder service
export const deleteStakeholderService = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.DELETE_STAKEHOLDER_SERVICE.replace(":id", id)}`;
        const { data } = await axios.delete(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Get projects by company id
export const getProjectsByCompanyId = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_PROJECTS_BY_COMPANY_ID.replace(":companyId", id)}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Get rating by company id
export const getRatingByCompanyId = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_RATING_BY_COMPANY_ID.replace(":companyId", id)}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Get all project data for overview by id
export const getAllProjectDataForOverviewById = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_ALL_PROJECT_DATA_FOR_OVERVIEW_BY_ID.replace(":id", id)}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Get Project by id
export const getProjectById = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_PROJECT_BY_ID.replace(":id", id)}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}


// Update Project by id
export const updateProjectById = async (id: string, payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.UPDATE_PROJECT.replace(":id", id)}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
}

// Create Project
export const createProject = async (payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.CREATE_PROJECT}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
}

// Delete Project by id
export const deleteProjectById = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.DELETE_PROJECT.replace(":id", id)}`;
        const { data } = await axios.delete(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Get Project count by company type
export const getProjectCountByCompanyType = async (startDate: string, endDate: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_PROJECT_COUNT_BY_COMPANY_TYPE}`;
        const { data } = await axios.get(endpoint, {
            params: {
                startDate,
                endDate
            }
        });
        return data;
    } catch (err) {
        throw err;
    }
}

// Get Project count by company type yearly
export const getProjectCountByCompanyTypeYearly = async (startDate: string, endDate: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_PROJECT_COUNT_BY_COMPANY_TYPE_YEARLY}`;
        const { data } = await axios.get(endpoint, {
            params: {
                startDate,
                endDate
            }
        });
        return data;
    } catch (err) {
        throw err;
    }
}