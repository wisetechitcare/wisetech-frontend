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

/**
 * Delete a board list. The API accepts this only for a PROJECT lane that holds no tasks — a
 * company-wide stage and a lane with work in it are both refused, with the reason in the response.
 */
export const deleteTasksStatus = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${TASKS.UPDATE_TASK_STATUS}/${id}`;
        const { data } = await axios.delete(endpoint);
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

/**
 * Phase 3 — the projects the CURRENT user may create a PROJECT task on.
 *
 * Not "all projects": the server resolves this through the same rule that authorises task
 * creation, so anything this returns is guaranteed to be accepted by `createTask`, and anything
 * it omits would be rejected. Never filter this list further in React — that is UX, not
 * security, and the two would drift.
 */
export const getAvailableProjects = async () => {
  try {
    const { data } = await axios.get(`${API_BASE_URL}${TASKS.GET_AVAILABLE_PROJECTS}`);
    return data;
  } catch (error) {
    throw error;
  }
};

/** Phase 3 — the internal team of ONE project, filtered to whom the caller may assign. */
export const getProjectAssignees = async (projectId: string) => {
  try {
    const endpoint = `${API_BASE_URL}${TASKS.GET_PROJECT_ASSIGNEES.replace(':projectId', projectId)}`;
    const { data } = await axios.get(endpoint);
    return data;
  } catch (error) {
    throw error;
  }
};

/** Phase 3 — whom the caller may assign a GENERAL task to (management scope, never project). */
export const getGeneralAssignees = async () => {
  try {
    const { data } = await axios.get(`${API_BASE_URL}${TASKS.GET_GENERAL_ASSIGNEES}`);
    return data;
  } catch (error) {
    throw error;
  }
};

/**
 * Join the base URL to an endpoint constant.
 *
 * The constants in `TASKS` are inconsistent: some start with `/api/...`, some with `api/...`.
 * Concatenating the un-slashed ones straight onto the base produced
 * `http://localhost:9000api/task-and-time/task` — an invalid URL that axios rejected before it
 * ever reached the network, so the table view failed with "Failed to construct 'URL'" and no
 * request in the devtools to explain it. Normalising here fixes every caller at once rather
 * than editing 30 constants and hoping the next one is right.
 */
const url = (endpoint: string, params: Record<string, string> = {}) => {
  const base = String(API_BASE_URL).replace(/\/+$/, '');
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const qs = new URLSearchParams(params).toString();
  return `${base}${path}${qs ? `?${qs}` : ''}`;
};

/**
 * Phase 4 — the Kanban board: every active stage in `sortOrder`, each with its true task count
 * and the first page of cards. One request for the whole board, authorization-scoped and
 * filtered by exactly the same predicate the table uses.
 */
export const getTaskBoard = async (params: Record<string, string> = {}) => {
  try {
    const { data } = await axios.get(url(TASKS.GET_TASK_BOARD, params));
    return data;
  } catch (error) {
    throw error;
  }
};

/**
 * Phase 4 — the projects shown in the task board's rail.
 *
 * NOT : that answers "where may I CREATE a task" (project-manager
 * authority). This answers "which projects do the tasks I can already SEE belong to", so
 * somebody assigned work on ten projects sees ten, even if they manage none.
 */
export const getBoardProjects = async () => {
  try {
    const { data } = await axios.get(url(TASKS.GET_BOARD_PROJECTS));
    return data;
  } catch (error) {
    throw error;
  }
};

/** Phase 4 — the paginated, filtered, sorted task list backing the table view. */
export const getTaskList = async (params: Record<string, string> = {}) => {
  try {
    const { data } = await axios.get(url(TASKS.GET_ALL_TASKS, params));
    return data;
  } catch (error) {
    throw error;
  }
};

/** Phase 4 — a task's direct subtasks (depth is capped at 1 server-side, so this is the tree). */
export const getTaskSubtasks = async (taskId: string) => {
  try {
    const { data } = await axios.get(url(TASKS.GET_TASK_SUBTASKS.replace(':id', taskId)));
    return data;
  } catch (error) {
    throw error;
  }
};

/** Phase 4 — set the Kanban column order. Applied server-side in one transaction. */
/**
 * Persist a lane's card order. `taskIds` is the lane exactly as it should read, top to bottom —
 * the API renumbers the whole lane from it, so a stale neighbour cannot land a card in the wrong
 * gap. The card must already BE in that lane; a lane change goes through the stage endpoint first.
 */
export const reorderBoardTasks = async (statusId: string, taskIds: string[]) => {
  try {
    const { data } = await axios.put(url(TASKS.REORDER_BOARD_TASKS), { statusId, taskIds });
    return data;
  } catch (error) {
    throw error;
  }
};

export const reorderTaskStatuses = async (order: { id: string; sortOrder: number }[]) => {
  try {
    const { data } = await axios.put(url(TASKS.REORDER_TASK_STATUSES), { order });
    return data;
  } catch (error) {
    throw error;
  }
};