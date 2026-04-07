import axios from "axios";
import { EMPLOYEE } from "@constants/api-endpoint";
import { ICheckInPayload, ICheckOutPayload, IValidateTokenInOut, ILeaveRequest, IReimbursementsCreate, IGrossPayDeductions, IPayment, AttendanceRequest, Attendance, ApprovedAttendanceRequest, IGrossPayConfiguration, IGrossPayConfigurationResponse, IGrossPayConfigurationHistoryResponse, IValidationResult, DynamicFieldConfig, IDeductionConfiguration, IDeductionConfigurationResponse, IDeductionConfigurationHistoryResponse } from "@models/employee";
import dayjs, { Dayjs } from "dayjs";
const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;

export const fetchAllEmployees = async (isActive?: boolean) => {
    try {
        let endpoint = `${API_BASE_URL}/${EMPLOYEE.GET_ALL_EMPLOYEE}`;

        // Add query parameter if isActive is defined
        if (isActive !== undefined) {
            endpoint += `?isActive=${isActive}`;
        }

        const { data } = await axios.get(endpoint);
        return data;
    } catch (error) {
        throw error;
    }
}

export const fetchAllEmployeesSelectedData = async () => {
    try{
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.GET_ALL_EMPLOYEE_SELECTED_DATA}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch(error){
        throw error;
    }
}

export const fetchEmployeeDiscretionaryBalanceById = async (employeeId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.GET_EMPLOYEE_DISCRETIONARY_BALANCE.replace(':id', employeeId)}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (error) {
        throw error;
    }
};


export const createTodo=async(payload:any)=>{
    try{
        const endpoint= `${API_BASE_URL}/${EMPLOYEE.CREATE_TODOS}`;
        const { data } = await axios.post(endpoint,payload);
        return {data};
    }
    catch(error){
        throw error;
    }
}

export const getTodo=async(employeeId:string)=>{
    try{
        const endpoint= `${API_BASE_URL}/${EMPLOYEE.GET_TODOS}?employeeId=${employeeId}`;
        const { data } = await axios.get(endpoint);
        return {data};
    }
    catch(error){
        throw error;
    }
}

export const updateTodo = async (employeeId: string, todoId: string, payload: { description?: string; status?: string }) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.UPDATE_TODOS}`;
        const response = await axios.put(endpoint, { employeeId, todoId, ...payload });
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error("Error updating todo:", error.response?.data || error.message);
        } else {
            console.error("Error updating todo:", error);
        }
        throw error;
    }
};

export const deleteTodo=async(employeeId:string, todoId:string)=>{
    try{
        const endpoint=`${API_BASE_URL}/${EMPLOYEE.DELETE_TODOS}`;
        const response = await axios.delete(`${endpoint}?employeeId=${employeeId}&todoId=${todoId}`);
        return response.data;
    }
    catch(error){
        throw error;
    }
}

export const createMeetings=async(payload : any)=>{
    try {
        const endpoint=`${API_BASE_URL}/${EMPLOYEE.CREATE_MEETINGS}`;
        const response = await axios.post(endpoint, payload);
        return response.data;
    } catch (error) {
        throw error;
    }
}

export const getMeetings = async (employeeId:string) => {
    try {
        const endpoint = `${API_BASE_URL}/api/employee/meetings?employeeId=${employeeId}`;
        const response = await axios.get(endpoint);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const updateMeeting = async (meetingId:string, employeeId:string, updateData:any) => {
    try {
        const endpoint = `${API_BASE_URL}/api/employee/meetings?meetingId=${meetingId}&employeeId=${employeeId}`;
        const response = await axios.put(endpoint, updateData);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const deleteMeeting = async (meetingId:string, employeeId:string) => {
    try {
        const endpoint = `${API_BASE_URL}/api/employee/meetings?meetingId=${meetingId}&employeeId=${employeeId}`;
        const response = await axios.delete(endpoint);
        return response.data;
    } catch (error) {
        throw error;
    }
};


export const fetchEmployeesOnLeaveToday = async (dateToday?:string) => {
    try {
        let endpoint = `${API_BASE_URL}/${EMPLOYEE.GET_ALL_LEAVES}`;
        if(dateToday){
            endpoint = `${API_BASE_URL}/${EMPLOYEE.GET_ALL_LEAVES}?dateToday=${dateToday}`;
        }
        const { data } = await axios.get(endpoint);
        return data;
    } catch (error) {
        throw error;
    }
}

export const fetchCurrentEmployeeByUserId = async (userId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.GET_EMPLOYEE_BY_ID}?userId=${userId}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const sendAttendanceRequestResetLimit = async (payload:any) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.EMAIL_ATTENDANCE_REQUEST_LIMIT_RESET}`;
        const { data } = await axios.post(endpoint,payload);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const fetchCurrentEmployeeByEmpId = async (employeeId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.GET_EMPLOYEE_BY_ID}?employeeId=${employeeId}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const fetchDocumentsField = async () => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.GET_ONBOARDING_DOC_LIST}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const createNewEmployee = async (payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.CREATE_EMPLOYEE}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const createBankDetails = async (payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.CREATE_BANK_DETAILS}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const createAddressDetails = async (payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.CREATE_ADDRESS_DETAILS}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const createPreviousExperienceDetails = async (payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.CREATE_PREVIOUS_EXPERIENCE}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const createEducationalDetails = async (payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.CREATE_EDUCATIONAL_DETAILS}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const createRejoinHistoryDetails = async (payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.CREATE_REJOIN_HISTORY}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const createEmergencyContacts = async (payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.CREATE_EMERGENCY_CONTACTS}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const createDocumentsDetails = async (payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.CREATE_DOCUMENTS_DETAILS}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const fetchAttendanceDetails = async (employeeId: string, month: number, year: number) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.GET_ATTENDANCE_BY_EMP_ID}?employeeId=${employeeId}&month=${month}&year=${year}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const saveCheckIn = async (payload: ICheckInPayload) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.CREATE_EMPLOYEE_ATTENDANCE}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const validateTokenInOut = async (payload: IValidateTokenInOut) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.VALIDATE_IN_OUT_TOKEN}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const saveCheckOut = async (payload: ICheckOutPayload) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.MARK_CHECKOUT_ATTENDANCE}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const fetchWizardData = async (employeeId: string, filteredFields: boolean) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.GET_WIZARD_DATA}?employeeId=${employeeId}&filteredFields=${filteredFields}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const updateEmployee = async (id: string, payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.UPDATE_EMPLOYEE_BY_ID}?id=${id}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const updateEmergencyContact = async (id: string, payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.UPDATE_EMERGENCY_CONTACT_BY_ID}?id=${id}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const createEmergencyDetails = async (payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.CREATE_EMERGENCY_DETAILS}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const updateEmergencyDetails = async (id: string, payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.UPDATE_EMERGENCY_DETAILS_BY_ID}?id=${id}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const fetchEmergencyDetails = async (employeeId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.GET_EMERGENCY_DETAILS}${employeeId}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const updateAddressDetails = async (id: string, payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.UPDATE_ADDRESS_DETAILS_BY_ID}?id=${id}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const updateBankDetails = async (id: string, payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.UPDATE_BANK_DETAILS_BY_ID}?id=${id}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const updatePreviousExpDetails = async (id: string, payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.UPDATE_PREVIOUS_EXPERIENCE_BY_ID}?id=${id}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const updateEducationalDetails = async (id: string, payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.UPDATE_EDUCATIONAL_DETAILS_BY_ID}?id=${id}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const updateRejoinHistoryDetails = async (id: string, payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.UPDATE_REJOIN_HISTORY_BY_ID}?id=${id}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const deleteAllRejoinHistoryByEmployeeId = async (employeeId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.DELETE_ALL_REJOIN_HISTORY_BY_EMPLOYEE_ID}?employeeId=${employeeId}`;
        const { data } = await axios.delete(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const updateDocumentDetails = async (id: string, payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.UPDATE_DOCUMENTS_DETAILS_BY_ID}?id=${id}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const updateOnboardingDocumentDetailsById = async (id: string, payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.UPDATE_ONBOARDING_DOCUMENT_DETAILS_BY_ID}?id=${id}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const checkAttendanceMarked = async (date: any, employeeId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.CHECK_ATTENDANCE_MARKED}?date=${date}&employeeId=${employeeId}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const fetchEmployeeProfileData = async (employeeId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.GET_WIZARD_DATA}?employeeId=${employeeId}&filteredFields=true`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const fetchEmployeeDocuments = async (employeeId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.GET_DOCUMENTS_DETAILS}?employeeId=${employeeId}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const createEmployeeLeaveRequest = async (payload: ILeaveRequest) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.CREATE_EMPLOYEE_LEAVE_REQUEST}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const updateEmployeeRequestById = async (id: string, payload: ILeaveRequest) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.CREATE_EMPLOYEE_LEAVE_REQUEST}?id=${id}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const deleteLeaveRequestById = async (leaveRequestId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.DELETE_EMPLOYEE_LEAVE_REQUEST}/${leaveRequestId}`;
        const { data } = await axios.delete(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}


export const createLeaveOption = async (payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.CREATE_LEAVE_OPTION}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    }
    catch (err) {
        throw err;
    }
}


export const updateLeaveOptionById = async (id: string, payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.UPDATE_LEAVE_OPTION_BY_ID}?id=${id}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const fetchEmployeeLeaveBalance = async (employeeId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.LEAVE_BALANCE}?employeeId=${employeeId}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const fetchEmployeeLeaves = async (employeeId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.LEAVES}?employeeId=${employeeId}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const fetchCompleteLeaveTrack = async (employeeId: string) => {
    try {
        const [leavesResponse, balanceResponse] = await Promise.all([
            fetchEmployeeLeaves(employeeId),
            fetchEmployeeLeaveBalance(employeeId)
        ]);

        const leaves = leavesResponse?.data?.leaves || [];
        const leavesSummary = balanceResponse?.data?.leavesSummary || {};

        const pendingLeaves = leaves.filter((leave: any) => leave.status === 0);
        const approvedLeaves = leaves.filter((leave: any) => leave.status === 1);
        const rejectedLeaves = leaves.filter((leave: any) => leave.status === 2);

        const leavesByType = leaves.reduce((acc: any, leave: any) => {
            const leaveType = leave.leaveOptions?.leaveType || 'Unknown';
            if (!acc[leaveType]) {
                acc[leaveType] = { all: [], pending: [], approved: [], rejected: [] };
            }
            acc[leaveType].all.push(leave);
            if (leave.status === 0) acc[leaveType].pending.push(leave);
            if (leave.status === 1) acc[leaveType].approved.push(leave);
            if (leave.status === 2) acc[leaveType].rejected.push(leave);
            return acc;
        }, {});

        const statistics = {
            total: leaves.length,
            pending: pendingLeaves.length,
            approved: approvedLeaves.length,
            rejected: rejectedLeaves.length,
            byType: Object.keys(leavesByType).map(type => ({
                leaveType: type,
                total: leavesByType[type].all.length,
                pending: leavesByType[type].pending.length,
                approved: leavesByType[type].approved.length,
                rejected: leavesByType[type].rejected.length
            }))
        };

        const calculateLeaveDays = (leave: any) => {
            if (!leave.dateFrom || !leave.dateTo) return 0;
            const start = new Date(leave.dateFrom);
            const end = new Date(leave.dateTo);
            let dayCount = 0;
            for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
                const dayOfWeek = date.getDay();
                if (dayOfWeek !== 0 && dayOfWeek !== 6) dayCount++;
            }
            return dayCount;
        };

        const totalDaysTaken = approvedLeaves.reduce((sum: number, leave: any) => sum + calculateLeaveDays(leave), 0);
        const totalPendingDays = pendingLeaves.reduce((sum: number, leave: any) => sum + calculateLeaveDays(leave), 0);

        const completeLeaveTrack = {
            employeeId,
            fetchedAt: new Date().toISOString(),
            summary: {
                totalLeaves: leaves.length,
                totalDaysTaken,
                totalPendingDays,
                pendingRequests: pendingLeaves.length,
                approvedRequests: approvedLeaves.length,
                rejectedRequests: rejectedLeaves.length
            },
            balances: leavesSummary,
            leaves: { all: leaves, pending: pendingLeaves, approved: approvedLeaves, rejected: rejectedLeaves, byType: leavesByType },
            statistics
        };

        return { hasError: false, data: completeLeaveTrack };
    } catch (err) {
        console.error('❌ [CompleteLeaveTrack] Error fetching complete leave track:', err);
        return { hasError: true, error: err, data: null };
    }
};

export const fetchAllEmployeesAttendance = async (date: number, month: number, year: number) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.GET_ALL_ATTENDANCE}?date=${date}&month=${month}&year=${year}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const fetchEmpAttendanceStatistics = async (employeeId: string, startDate: string, endDate: string, page?: number, limit?: number) => {
    try {
        let endpoint = `${API_BASE_URL}/${EMPLOYEE.EMPLOYEE_ATTENDANCE_STATISTICS}?employeeId=${employeeId}&startDate=${startDate}&endDate=${endDate}`;
        if (page !== undefined && limit !== undefined) {
            endpoint += `&page=${page}&limit=${limit}`;
        }
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const fetchEmpAttendanceAllTimeRecords = async (employeeId: string, observedIn: string, companyId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.EMPLOYEE_ATTENDANCE_RECORDS}?employeeId=${employeeId}&observedIn=${observedIn}&companyId=${companyId}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const fetchLeaveRequest = async (employeeId?: string, status?: number, page?: number, limit?: number) => {
    try {
        let endpoint = `${API_BASE_URL}/${EMPLOYEE.GET_EMPLOYEE_LEAVE_REQUEST}`;
        const params = new URLSearchParams();
        if (employeeId) params.append('employeeId', employeeId);
        if (status !== undefined) params.append('status', status.toString());
        if (page !== undefined) params.append('page', page.toString());
        if (limit !== undefined) params.append('limit', limit.toString());
        if (params.toString()) endpoint += `?${params.toString()}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const updateLeaveStatus = async (payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.LEAVE_ACTION}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const fetchReimbursementsForEmployee = async (employeeId: string, startDate: string, endDate: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.GET_REIMBURSEMENT}${`?startDate=${startDate}`}${`&endDate=${endDate}`}${`&employeeId=${employeeId}`}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const fetchAllReimbursementsForEmployee = async (employeeId?: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.GET_REIMBURSEMENT}${`?employeeId=${employeeId}`}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const fetchAllReimbursementsForAllEmployees = async () => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.GET_REIMBURSEMENT}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const fetchReimbursementsForAllEmployees = async (startDate: string, endDate: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.GET_REIMBURSEMENT}${`?startDate=${startDate}`}${`&endDate=${endDate}`}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const createEmployeeReimbursement = async (reimbursement: IReimbursementsCreate) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.CREATE_REIMBURSEMENT}`;
        const { data } = await axios.post(endpoint, { ...reimbursement });
        return data;
    }
    catch (err) {
        throw err;
    }
}

export async function updateReimbursementById(id: string, value: object) {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.UPDATE_REIMBURSEMENT_BY_ID}?id=${id}`;
        const { data } = await axios.put(endpoint, { ...value });
        return data;
    } catch (error) {
        throw error;
    }
}

export const deleteEmployeeReimbursement = async (reimbursementId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.DELETE_REIMBURSEMENT}${`?id=${reimbursementId}`}`;
        const { data } = await axios.delete(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

export const fetchGrossPayDeductions = async (employeeId: string, month?: string, year?: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.GROSS_PAY_DEDUCTIONS}?employeeId=${employeeId}&month=${month}&year=${year}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const createUpdateGrossPayDeductions = async (grossPayDeductions: IGrossPayDeductions) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.GROSS_PAY_DEDUCTIONS}`;
        const { data } = await axios.post(endpoint, grossPayDeductions);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const fetchAllPayments = async (employeeId: string, month?: string, year?: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.SALARY}?employeeId=${employeeId}&month=${month}&year=${year}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const fetchAllSalaryByFiscalYear = async (employeeId: string,companyId:string, startYear: string, endYear: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.GET_SALARY_BY_FISCAL_YEAR}?employeeId=${employeeId}&companyId=${companyId}&startYear=${startYear}&endYear=${endYear}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
};

export const fetchAllSalaryDataForDateRangeYearly= async (employeeId:string, startYear:string, endYear:string)=>{
    try{
        const endpoint= `${API_BASE_URL}/${EMPLOYEE.GET_SALARY_DATA_FOR_DATE_RANGE_YEARLY}?employeeId=${employeeId}&startDate=${startYear}&endDate=${endYear}`;
        const {data}= await axios.get(endpoint);
        return data;
    }
    catch(err){
        throw err;
    }
}

export const fetchAllEmployeeSalaryAllTimeDateRage = async (employeeId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.GET_SALARY_DATA_FOR_DATE_RANGE_ALL_TIME}?employeeId=${employeeId}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const fetchSalaryRecordsBasedOnDateRange = async (startDate: string, endDate: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.GET_SALARAY_RECORDS_BASED_ON_DATE_RANGE}?startDate=${startDate}&endDate=${endDate}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const fetchSalaryRecordsForAllActiveEmployees = async (startDate: string, endDate: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.GET_SALARY_RECORDS_ALL_ACTIVE_EMPLOYEES}?startDate=${startDate}&endDate=${endDate}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

export const fetchAllEmployeeTotalSalaryOfYear = async (companyId: string, startYear: string, endYear: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.GET_Total_salary_By_Year}?companyId=${companyId}&startYear=${startYear}&endYear=${endYear}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const fetchAllEmployeeMonthlySalary = async (companyId: string, year: number, month: number) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.GET_TOTAL_MONTHLY_SALARY}?companyId=${companyId}&startYear=${year}&endYear=${month}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const createNewPayment = async (payment: IPayment) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.SALARY}`;
        const { data } = await axios.post(endpoint, payment);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const updatePaymentById = async (paymentId: string, payload: IPayment) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.SALARY}?id=${paymentId}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const deletePaymentById = async (paymentId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.SALARY}/${paymentId}`;
        const { data } = await axios.delete(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const getAllAttendanceRequestByCompanyId = async (companyId: string, page: number = 1, limit: number = 20) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.GET_ALL_ATTENDANCE_REQUEST}?companyId=${companyId}&page=${page}&limit=${limit}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const getPendingAttendanceRequests = async (companyId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.GET_PENDING_ATTENDANCE_REQUESTS}?companyId=${companyId}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const getAttendanceRequest = async (employeeId: string, startDate: string, endDate: string, page?: number, limit?: number) => {
    try {
        let endpoint = `${API_BASE_URL}/${EMPLOYEE.GET_ATTENDANCE_REQUEST}?employeeId=${employeeId}&startDate=${startDate}&endDate=${endDate}`;
        if (page !== undefined && limit !== undefined) {
            endpoint += `&page=${page}&limit=${limit}`;
        }
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const createUpdateAttendanceRequest = async (attendanceRequest: AttendanceRequest, isAdminUpdate?: boolean) => {
    try {
        let endpoint = `${API_BASE_URL}/${EMPLOYEE.CREATE_ATTENDANCE_REQUEST}`;
        if (isAdminUpdate) {
            endpoint += `?isAdminUpdate=${true}`;
        }
        const { data } = await axios.post(endpoint, attendanceRequest);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const deleteAttendanceRequestById = async (attendanceId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.DELETE_ATTENDANCE_REQUEST}${attendanceId}`;
        const { data } = await axios.delete(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const approveAttendanceRequest = async (attendance: ApprovedAttendanceRequest) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.APPROVE_ATTENDANCE_REQUEST}`;
        const { data } = await axios.post(endpoint, attendance);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const rejectAttendanceRequest = async (id: string, rejectById?: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.REJECT_ATTENDANCE_REQUEST}?id=${id}`;
        const { data } = await axios.put(endpoint, { rejectById });
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const getAllAttendanceRequestById = async (employeeId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.GET_ALL_ATTENDANCE_DETAILS_BY_ID}?employeeId=${employeeId}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const fetchEmployeeMediaByUserId = async (userId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.GET_MEDIA_BY_USER_ID}?userId=${userId}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const fetchNotificationsByEmployeeId = async (employeeId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.GET_NOTIFICATIONS}?employeeId=${employeeId}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
};

export const fetchNotificationsAllByEmployeeId = async (employeeId: string, page: number = 1, limit: number = 10) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.GET_ALL_NOTIFICATIONS}?employeeId=${employeeId}&page=${page}&limit=${limit}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
};

export const markAllAsRead = async (employeeId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.MARK_ALL_AS_READ}`;
        await axios.put(endpoint, { employeeId });
    } catch (err) {
        throw err;
    }
};

export const getEmployeePermissionsById = async (employeeId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.GET_EMPLOYEE_PERMISSIONS.replace(":id", employeeId)}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

export const updateEmployeeRolesById = async (employeeId: string, roles: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.UPDATE_EMPLOYEE_ROLES.replace(":id", employeeId)}`;
        const { data } = await axios.put(endpoint, roles);
        return data;
    } catch (err) {
        throw err;
    }
}

export const createEmployeePermissionById = async (employeeId: string, permission: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.CREATE_EMPLOYEE_PERMISSION.replace(":id", employeeId)}`;
        const { data } = await axios.post(endpoint, permission);
        return data;
    } catch (err) {
        throw err;
    }
}

export const updateEmployeePermissionById = async (employeeId: string, permissionId: string, permission: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.UPDATE_EMPLOYEE_PERMISSION.replace(":id", employeeId).replace(":permissionId", permissionId)}`;
        const { data } = await axios.put(endpoint, permission);
        return data;
    } catch (err) {
        throw err;
    }
}

export const deleteEmployeePermissionById = async (employeeId: string, permissionId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.DELETE_EMPLOYEE_PERMISSION.replace(":id", employeeId).replace(":permissionId", permissionId)}`;
        const { data } = await axios.delete(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

export const sendSalarySlipToEmployee = async (details: { path: string, employeeId: string }) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.EMAIL_SALARY_SLIP}`;
        const { data } = await axios.post(endpoint, details);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const fetchEmployeeLoans = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.GET_LOAN_BY_EMPLOYEE_ID}?id=${id}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const createEmployeeLoan = async (loanData: { loanAmount: number, loanType: string, deductionMonth?: string, numberOfMonths?: number, loanReason: string })=>{
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.CREATE_LOAN}`;
        const { data } = await axios.post(endpoint,loanData);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const getInstallementsById = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.GET_INSTALLMENT_BY_LOAN_ID}?id=${id}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        console.error("err:: ", err);
        throw err;
    }
}

export const fetchLoanById = async (loanId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.GET_LOAN_BY_ID}?id=${loanId}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        console.error("err:: ", err);
        throw err;
    }
}

export const deleteLoanById = async (loanId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.DELETE_LOAN_BY_ID}?id=${loanId}`;
        const { data } = await axios.delete(endpoint);
        return data;
    }
    catch (err) {
        console.error("err:: ", err);
        throw err;
    }
}

export const updateEmployeeLoanById = async (loanId: string, loanData: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.UPDATE_LOAN_BY_ID}?id=${loanId}`;
        const { data } = await axios.put(endpoint, loanData);
        return data;
    }
    catch (err) {
        console.error("err:: ", err);
        throw err;
    }
}

export const skipLoanInstallment = async (installmentId: string, note: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.SKIP_LOAN_INSTALLMENT_BY_ID}?id=${installmentId}`;
        const { data } = await axios.put(endpoint, { note });
        return data;
    }
    catch (err) {
        console.error("err:: ", err);
        throw err;
    }
}

export const customPaidLoanInstallment = async (installmentId: string, paidAmount: string, note: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.CUSTOM_PAID_LOAN_INSTALLMENT_BY_ID}?id=${installmentId}`;
        const { data } = await axios.put(endpoint, { paidAmount, note });
        return data;
    } catch (err) {
        console.error("err:: ", err);
        throw err;
    }
}

export const fetchEmployeeMonthlyInstallments = async (startDate: string, endDate: string, employeeId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.GET_MONTHLY_INSTALLMENT_BY_EMPLOYEE_ID}?startDate=${startDate}&endDate=${endDate}&employeeId=${employeeId}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        console.error("err:: ", err);
        throw err;
    }
}

export const updateLoanById = async ({ id, ...payload }: { id: string;[key: string]: any }) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.UPDATE_LOAN_BY_ID}?id=${id}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
};

export const updateLoanIntallmentById = async ({ id, ...payload }: { id: string;[key: string]: any }) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.UPDATE_LOAN_INSTALLMENT_BY_ID}?id=${id}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
};

export const approveLoanById = async (loanId: string, approvedById: string, approvedAt: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.APPROVE_LOAN_BY_ID}?id=${loanId}`;
        const { data } = await axios.put(endpoint, { approvedById, approvedAt });
        return data;
    } catch (err) {
        throw err;
    }
};

export const fetchEmpKpiStatisticsForDay = async (employeeId: string, date: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.GET_KPI_SCORES_FOR_DAY}?employeeId=${employeeId}&date=${date}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        console.error("Error fetching KPI Scores for the day:", err);
        throw err;
    }
};

export const fetchEmpKpiStatisticsForPeriod = async (employeeId: string, startDate: string, endDate: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.GET_KPI_SCORES_FOR_PERIOD}?employeeId=${employeeId}&startDate=${startDate}&endDate=${endDate}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const fetchEmpKpiScoresAllTime = async (employeeId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.GET_KPI_SCORES_ALL_TIME}?employeeId=${employeeId}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (error) {
        throw error;
    }
};

export const getAllKpiFactors = async () => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.GET_ALL_KPI_FACTORS}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (error) {
        throw error;
    }
}

export const updateKpiFactors = async (id: string, payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.UPDATE_KPI_FACTOR}?id=${id}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    } catch (error) {
        throw error;
    }
}

export const getAllKpiModules = async () => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.GET_ALL_KPI_MODULES}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (error) {
        throw error;
    }
}

export const fetchAllStarEmployeeByStartAndEndDate = async (startDate?: string, endDate?: string) => {
    try {
        let endpoint = `${API_BASE_URL}/${EMPLOYEE.GET_ALL_STAR_EMPLOYEES_BY_EACH_FACTOR}`;
        if (startDate && endDate) {
            endpoint += `?startDate=${startDate}&endDate=${endDate}`;
        }
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Type for leaderboard entries
export type KpiLeaderboardEntry = {
    employeeId: string;
    totalScore: number;
    percentage: number;
    rank: number;
    maxTotal: number;
    totalTimeHours?: number;
    totalOvertimeHours?: number;
    totalRegularHours?: number;
};

// ─── FIX: No module-level cache — it persists across date changes and causes
// stale data to be returned when the user navigates between date ranges.
// Use a simple per-call fetch instead.
export const fetchKpiLeaderboardOverall = async (startDate: string, endDate: string): Promise<KpiLeaderboardEntry[]> => {
    try {
        const response = await axios.get(`${API_BASE_URL}/api/employee/leaderboard`, {
            params: { startDate, endDate },
        });

        // The backend sends: { data: [...] }  OR just [...] directly.
        // axios wraps the HTTP body in response.data, so:
        //   response.data        → the raw body  (could be [] or { data: [] })
        //   response.data.data   → array if body was { data: [] }
        const body = response.data;

        if (Array.isArray(body)) {
            return body;
        }

        if (body && Array.isArray(body.data)) {
            return body.data;
        }

        console.warn("⚠️ Unexpected leaderboard response shape:", body);
        return [];
    } catch (error) {
        console.error("Leaderboard API error:", error);
        throw error;
    }
};

export const getAllKPIModules = async () => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.GET_ALL_KPI_MODULES}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

export const createKpiScore = async (payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.CREATE_KPI_SCORE}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
}

export const approveMultipleReimbursements = async (payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.APPROVE_MULTIPLE_REIMBURSEMENTS}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
}

export const getAllEmployeeWithMonthDailyHourlySalary = async (id?: string, date?: string) => {
    try {
        let endpoint = `${API_BASE_URL}/${EMPLOYEE.GET_ALL_EMPLOYEE_WITH_MONTH_DAILY_HOURLY_SALARY}`;
        if (id) {
            endpoint += `/${id}`;
        }
        const params = new URLSearchParams();
        if (date) {
            params.append("date", date);
        }
        const url = params.toString() ? `${endpoint}?${params.toString()}` : endpoint;
        const { data } = await axios.get(url);
        return data;
    } catch (err) {
        throw err;
    }
};

export const getAttendanceRequestLimitResetRequests = async (companyId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.GET_ATTENDANCE_REQUEST_LIMIT_RESET_REQUESTS}?companyId=${companyId}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
};

export const approveAttendanceRequestLimitReset = async (requestId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.APPROVE_ATTENDANCE_REQUEST_LIMIT_RESET}`;
        const { data } = await axios.post(endpoint, { requestId });
        return data;
    } catch (err) {
        throw err;
    }
};

export const rejectAttendanceRequestLimitReset = async (requestId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.REJECT_ATTENDANCE_REQUEST_LIMIT_RESET}`;
        const { data } = await axios.post(endpoint, { requestId });
        return data;
    } catch (err) {
        throw err;
    }
};

export const getAllTeamsMember = async (page: number = 1, search: string = '') => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.GET_ALL_TEAMS_MEMBER}?page=${page}&search=${encodeURIComponent(search)}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
};

export const createTeamMember = async (payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.CREATE_TEAM_MEMBER}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
};

export const updateTeamMember = async (id: string, payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.UPDATE_TEAM_MEMBER}?id=${id}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
};

export const deleteTeamMember = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.DELETE_TEAM_MEMBER}?id=${id}`;
        const { data } = await axios.delete(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
};

export const getTeamMemberById = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.GET_TEAM_MEMBER_BY_ID}?id=${id}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
};

export const getAllEmployeeLevels = async (page: number = 1, limit: number = 5) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.GET_ALL_EMPLOYEE_LEVELS}`;
        const { data } = await axios.get(endpoint, { params: { page, limit } });
        return data;
    } catch (err) {
        throw err;
    }
};

export const getEmployeeLevelById = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.GET_EMPLOYEE_LEVEL_BY_ID.replace(':id', id)}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
};

export const createEmployeeLevel = async (payload: { name: string; order: number; isActive?: boolean }) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.CREATE_EMPLOYEE_LEVEL}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
};

export const updateEmployeeLevel = async (id: string, payload: { name?: string; order?: number; isActive?: boolean }) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.UPDATE_EMPLOYEE_LEVEL.replace(':id', id)}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
};

export const deleteEmployeeLevel = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.DELETE_EMPLOYEE_LEVEL.replace(':id', id)}`;
        const { data } = await axios.delete(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
};

export const assignEmployeeToLevel = async (payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.ASSIGN_EMPLOYEE_TO_LEVEL}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
};

export const removeEmployeeFromLevel = async (levelId: string, employeeId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.REMOVE_EMPLOYEE_FROM_LEVEL}?levelId=${levelId}&employeeId=${employeeId}`;
        const { data } = await axios.delete(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
};

export const getAllEmployeeMembers = async () => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.GET_ALL_EMPLOYEE_MEMBERS}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
};

export const getEmployeeMemberById = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.GET_EMPLOYEE_MEMBER_BY_ID.replace(':id', id)}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
};

export const createEmployeeMember = async (payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.CREATE_EMPLOYEE_MEMBER}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
};

export const createMultipleEmployeeMembers = async (payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.CREATE_MULTIPLE_EMPLOYEE_MEMBERS}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
};

export const updateEmployeeMember = async (id: string, payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.UPDATE_EMPLOYEE_MEMBER.replace(':id', id)}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
};

export const deleteEmployeeMember = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.DELETE_EMPLOYEE_MEMBER.replace(':id', id)}`;
        const { data } = await axios.delete(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
};

export const createLeaveManagement = async (payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.CREATE_LEAVE_MANAGEMENT}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
};

export const getLeaveManagementById = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.GET_LEAVE_MANAGEMENT_BY_ID}?id=${id}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
};

export const getAllLeaveManagements = async (employeeId?: string) => {
    try {
        let endpoint = `${API_BASE_URL}/${EMPLOYEE.GET_ALL_LEAVE_MANAGEMENTS}`;
        if (employeeId) {
            endpoint += `?employeeId=${employeeId}`;
        }
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
};

export const updateLeaveManagement = async (id: string, payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.UPDATE_LEAVE_MANAGEMENT}?id=${id}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
};

export const revokeLeaveManagement = async (id: string, payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.REVOKE_LEAVE_MANAGEMENT}?id=${id}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
};

export const deleteLeaveManagement = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.DELETE_LEAVE_MANAGEMENT.replace(':id', id)}`;
        const { data } = await axios.delete(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
};

export const fetchGrossPayConfiguration = async (employeeId: string, month: string, year: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.GROSS_PAY_CONFIG_BY_ID.replace(':employeeId', employeeId)}?month=${month}&year=${year}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const createUpdateGrossPayConfiguration = async (grossPayConfig: IGrossPayConfiguration) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.GROSS_PAY_CONFIG}`;
        const { data } = await axios.post(endpoint, grossPayConfig);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const deleteGrossPayConfiguration = async (employeeId: string, month: string, year: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.GROSS_PAY_CONFIG_BY_ID.replace(':employeeId', employeeId)}?month=${month}&year=${year}`;
        const { data } = await axios.delete(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const fetchGrossPayConfigurationHistory = async (employeeId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.GROSS_PAY_CONFIG_HISTORY.replace(':employeeId', employeeId)}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const validateGrossPayConfigurationJson = (configJson: Record<string, DynamicFieldConfig>): IValidationResult => {
    if (!configJson || typeof configJson !== 'object') {
        return { isValid: false, error: 'Configuration must be an object' };
    }
    if (Object.keys(configJson).length === 0) {
        return { isValid: false, error: 'Configuration cannot be empty' };
    }
    const fieldNames: string[] = [];
    for (const [key, value] of Object.entries(configJson)) {
        if (key === '_fieldOrder') continue;
        if (!value.name || typeof value.name !== 'string') {
            return { isValid: false, error: `Field ${key} must have a valid name` };
        }
        if (value.value === undefined || value.value === null) {
            return { isValid: false, error: `Field ${key} must have a value` };
        }
        if (typeof value.value !== 'number' || isNaN(value.value)) {
            return { isValid: false, error: `Field ${key} value must be a valid number` };
        }
        if (value.value < 0) {
            return { isValid: false, error: `Field ${key} value cannot be negative` };
        }
        if (!value.type || (value.type !== 'number' && value.type !== 'percentage')) {
            return { isValid: false, error: `Field ${key} type must be 'number' or 'percentage'` };
        }
        const normalizedName = value.name.toLowerCase().trim();
        if (fieldNames.includes(normalizedName)) {
            return { isValid: false, error: `Duplicate field name found: ${value.name}` };
        }
        fieldNames.push(normalizedName);
    }
    return { isValid: true };
}

export const fetchDeductionConfiguration = async (employeeId: string, month: string, year: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.DEDUCTION_CONFIG_BY_ID.replace(':employeeId', employeeId)}?month=${month}&year=${year}`;
        const { data } = await axios.get(endpoint);
        return {
            hasError: false,
            data: {
                ...data.data,
                configuration: data.data.configuration
            }
        };
    } catch (error) {
        return { hasError: true, error: error };
    }
}

export const createUpdateDeductionConfiguration = async (deductionConfig: IDeductionConfiguration) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.DEDUCTION_CONFIG}`;
        const { data } = await axios.post(endpoint, deductionConfig);
        return data;
    } catch (error: any) {
        console.error('❌ Error saving deduction configuration:', error);
        if (error.response?.data?.message) {
            throw new Error(error.response.data.message);
        }
        throw new Error('Failed to save deduction configuration');
    }
}

export const deleteDeductionConfiguration = async (employeeId: string, month: string, year: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.DEDUCTION_CONFIG_BY_ID.replace(':employeeId', employeeId)}?month=${month}&year=${year}`;
        const { data } = await axios.delete(endpoint);
        return data;
    } catch (error: any) {
        console.error('❌ Error deleting deduction configuration:', error);
        if (error.response?.data?.message) {
            throw new Error(error.response.data.message);
        }
        throw new Error('Failed to delete deduction configuration');
    }
}

export const fetchDeductionConfigurationHistory = async (employeeId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${EMPLOYEE.DEDUCTION_CONFIG_HISTORY.replace(':employeeId', employeeId)}`;
        const { data } = await axios.get(endpoint);
        return { hasError: false, data };
    } catch (error) {
        console.error('❌ Error fetching deduction configuration history:', error);
        return { hasError: true, error: error };
    }
}

export const validateDeductionConfigurationJson = (configJson: Record<string, DynamicFieldConfig>): IValidationResult => {
    if (!configJson || typeof configJson !== 'object') {
        return { isValid: false, error: 'Configuration must be a valid object' };
    }
    const fieldsToValidate = Object.entries(configJson).filter(([key]) => key !== '_fieldOrder');
    if (fieldsToValidate.length === 0) {
        return { isValid: false, error: 'Configuration must have at least one field' };
    }
    const fieldNames: string[] = [];
    for (const [key, value] of fieldsToValidate) {
        if (!value || typeof value !== 'object') {
            return { isValid: false, error: `Field "${key}" must be a valid object` };
        }
        if (!value.name || typeof value.name !== 'string') {
            return { isValid: false, error: `Field "${key}" must have a valid name` };
        }
        if (typeof value.value !== 'number' || value.value < 0) {
            return { isValid: false, error: `Field "${key}" must have a valid value >= 0` };
        }
        if (!value.type || !['percentage', 'number'].includes(value.type)) {
            return { isValid: false, error: `Field "${key}" must have a valid type (percentage or number)` };
        }
        const normalizedName = value.name.toLowerCase().trim();
        if (fieldNames.includes(normalizedName)) {
            return { isValid: false, error: `Duplicate field name found: ${value.name}` };
        }
        fieldNames.push(normalizedName);
    }
    return { isValid: true };
}