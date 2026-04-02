import axios from "axios";
import { TASKS } from "@constants/api-endpoint";
import { Task } from "@mui/icons-material";
const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;


export const getAllTasksStatus = async () => {
    try {
        const endpoint = `${API_BASE_URL}/${TASKS.GET_ALL_TASK_STATUSES}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

export const createTasksStatus = async (payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${TASKS.CREATE_TASK_STATUS}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
}

export const updateTasksStatus = async (id: string, payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${TASKS.UPDATE_TASK_STATUS}/${id}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
}


export const getAllPriority = async () =>{
    try{
        const endpoint = `${API_BASE_URL}/${TASKS.GET_ALL_TASK_PRIORITIES}`;
        const { data } = await axios.get(endpoint);
        return data;    
    }catch(error){
        throw error;
    }
}

export const createPriority = async (payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${TASKS.CREATE_TASK_PRIORITY}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
}

export const updatePriority = async (id: string, payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${TASKS.UPDATE_TASK_PRIORITY}/${id}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
}

export const getAllPersetTasks = async () =>{
    try{
        const endpoint = `${API_BASE_URL}/${TASKS.GET_ALL_PRESET_TASKS_STATUSES}`;
        const { data } = await axios.get(endpoint);
        return data;
    }catch(error){
        throw error;
    }
}

export const createPresetTask = async (payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${TASKS.CREATE_PRESET_TASKS_STATUS}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
}

export const updatePresetTask = async (id: string, payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${TASKS.UPDATE_PRESET_TASKS_STATUS}/${id}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
}

export const deletePresetTask = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${TASKS.DELETE_PRESET_TASKS_STATUS}/${id}`;
        const { data } = await axios.delete(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

export const getAllTasks = async () =>{
    try {
        const endpoint = `${API_BASE_URL}/${TASKS.GET_ALL_TASKS}`;
        const { data } = await axios.get(endpoint);
         // Ensure data is in the expected format
        return data;
    } catch (err) {
        throw err;
    }
}

export const createTask = async (taskData: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${TASKS.CREATE_TASK}`;
        const { data } = await axios.post(endpoint, taskData);
        return data;
    } catch (error) {
        throw error;
    }
};

export const updateTask = async (taskId: string, taskData: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${TASKS.UPDATE_TASK}/${taskId}`; 
        const { data } = await axios.put(endpoint, taskData);
        return data;
    } catch (error) {
        throw error;
    }
};

export const getTimesheetsEmployeeIdStartDateEndDate = async (employeeId: string,startDate: string,endDate: string) => {
    try {
      const endpoint = `${API_BASE_URL}/${TASKS.GET_TIMESHEETS_EMPLOYEEID_STARTDATE_ENDDATE}`
        .replace(":employeeId", employeeId)
        .replace(":startDate", startDate)
        .replace(":endDate", endDate);   
      const { data } = await axios.get(endpoint);
      return data;
    } catch (error) {
      throw error;
    }
  };


export const getAllTimeSheetsByStartDateEndDate = async (startDate: string,endDate: string) => {
    try {
      const endpoint = `${API_BASE_URL}/${TASKS.GET_ALL_TIME_SHEETS_BY_START_DATE_END_DATE}?startDate=${startDate}&endDate=${endDate}`;

      const { data } = await axios.get(endpoint);
      return data;
    } catch (error) {
      throw error;
    }
  };



export const getTimesheetById = async (timesheetId: string) => {
    try {
      const endpoint = `${API_BASE_URL}/${TASKS.GET_TIMESHEET_BY_ID}`.replace(":id", timesheetId);
      const { data } = await axios.get(endpoint);
      return data;
    } catch (error) {
      throw error;
    }
  };

export const getTimesheetByTaskId = async (taskId: string) => {
    try {
      const endpoint = `${API_BASE_URL}/${TASKS.GET_TIMESHEETS_BY_TASKID}`.replace(":taskId", taskId);
      const { data } = await axios.get(endpoint);
      return data;
    } catch (error) {
      throw error;
    }
  };

export const deleteTimeSheetById = async (timesheetId: string) => {
    try {
      const endpoint = `${API_BASE_URL}/${TASKS.DELETE}`.replace(":id", timesheetId);
      const { data } = await axios.delete(endpoint);
      return data;
    } catch (error) {
      throw error;
    }
  };


export const deleteTask = async (taskId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${TASKS.DELETE_TASK}/${taskId}`;
        const { data } = await axios.delete(endpoint);
        return data;
    } catch (error) {
        throw error;
    }
};

export const getTaskById = async (taskId: string) => {
    try {
      const endpoint = `${API_BASE_URL}${TASKS.GET_TASK_BY_ID}`.replace(":id", taskId);
      const { data } = await axios.get(endpoint);
      return data;
    } catch (error) {
      throw error;
    }
  };


export const createTimeSheet = async (timesheetData: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${TASKS.CREATE}`;
        const { data } = await axios.post(endpoint, timesheetData);
        return data;
    } catch (error) {
        throw error;
    }
};

export const updateTimeSheetById = async (timesheetId: string, timesheetData: any) => {
    try {
      const endpoint = `${API_BASE_URL}/${TASKS.UPDATE}`.replace(":id", timesheetId);
      const { data } = await axios.put(endpoint, timesheetData);
      return data;
    } catch (error) {
      throw error;
    }
  };



export const getTasksByProjectId = async (projectId: string) => {
    try {
      const endpoint = `${API_BASE_URL}${TASKS.GET_TASKS_BY_PROJECT_ID}`.replace(":projectId", projectId);
      const { data } = await axios.get(endpoint);
      return data;
    } catch (error) {
      throw error;
    }
};

export const getTimesheetsByProjectId = async (projectId: string, billable:boolean) => {
    try {
      const endpoint = `${API_BASE_URL}${TASKS.GET_TIMESHEETS_BY_PROJECTID}`
        .replace(":projectId", projectId)
        .replace(":billable", billable.toString());
      const { data } = await axios.get(endpoint);
      return data;
    } catch (error) {
      throw error;
    }
};

export const getAllTimeSheetWithCostByProjectId = async(projectId:string, billable:string | null) =>{
    try{
        const endpoint = `${API_BASE_URL}${TASKS.GET_TIMESHEETS_BY_PROJECTID_WITH_COST}`
        .replace(":projectId", projectId)
        .replace(":billable", String(billable));
      const { data } = await axios.get(endpoint);
      return data;
    }catch(error){
        throw error;
    }
}

// In @services/tasks file
export const updateTaskStatusById = async (taskId: string, statusId: string) => {
  try {
    const response = await axios.put(`${API_BASE_URL}${TASKS.UPDATE_TASK_STATUS_BY_TASKID.replace(':taskId', taskId)}`, { 
      statusId: statusId 
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getAllTasksWithMetrics = async () => {
    try {
      const endpoint = `${API_BASE_URL}${TASKS.GET_ALL_TASKS_WITH_METRICS}`;
      const { data } = await axios.get(endpoint);
      return data;
    } catch (error) {
      throw error;
    }
  };


export const getAllTaskStatusByStartDateEndDate = async (startDate: string, endDate: string) =>{
    try{
      const endpoint = `${API_BASE_URL}${TASKS.GET_TASKS_STATUS_START_END_DATE}`.replace(':startDate', startDate).replace(':endDate', endDate);
      const { data } = await axios.get(endpoint);
      return data;
    }catch(error){
      throw error;
    }
}

export const getAllProjectOnlySelectedFields = async () => {
    try {
      const endpoint = `${API_BASE_URL}${TASKS.GET_ALL_PROJECT_ONLY_SELECTED_FIELDS}`;
      const { data } = await axios.get(endpoint);
      return data;
    } catch (error) {
      throw error;
    }
  };