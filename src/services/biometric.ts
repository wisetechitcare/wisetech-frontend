import axios from 'axios';
import { BIOMETRIC } from '@constants/api-endpoint';
import {
  IBiometricDevice,
  ICreateBiometricDevice,
  IUpdateBiometricDevice,
  IDeviceTestResult,
  IDeviceSyncResult,
  IBiometricSyncLog,
} from '@models/biometric';

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;

export const fetchDevicesByBranchId = async (branchId: string): Promise<IBiometricDevice[]> => {
  try {
    const endpoint = `${API_BASE_URL}/${BIOMETRIC.LIST_DEVICES}?branchId=${branchId}`;
    const { data } = await axios.get(endpoint);
    return data.data ?? [];
  } catch (err) {
    throw err;
  }
};

export const createDevice = async (payload: ICreateBiometricDevice): Promise<IBiometricDevice> => {
  try {
    const endpoint = `${API_BASE_URL}/${BIOMETRIC.CREATE_DEVICE}`;
    const { data } = await axios.post(endpoint, payload);
    return data.data;
  } catch (err) {
    throw err;
  }
};

export const updateDeviceById = async (id: string, payload: IUpdateBiometricDevice): Promise<IBiometricDevice> => {
  try {
    const endpoint = `${API_BASE_URL}/${BIOMETRIC.UPDATE_DEVICE}/${id}`;
    const { data } = await axios.put(endpoint, payload);
    return data.data;
  } catch (err) {
    throw err;
  }
};

export const deleteDeviceById = async (id: string): Promise<void> => {
  try {
    const endpoint = `${API_BASE_URL}/${BIOMETRIC.DELETE_DEVICE}/${id}`;
    await axios.delete(endpoint);
  } catch (err) {
    throw err;
  }
};

export const toggleDeviceById = async (id: string): Promise<IBiometricDevice> => {
  try {
    const endpoint = `${API_BASE_URL}/${BIOMETRIC.TOGGLE_DEVICE}/${id}/toggle`;
    const { data } = await axios.patch(endpoint);
    return data.data;
  } catch (err) {
    throw err;
  }
};

export const testDeviceById = async (id: string): Promise<IDeviceTestResult> => {
  try {
    const endpoint = `${API_BASE_URL}/${BIOMETRIC.TEST_DEVICE}/${id}/test`;
    const { data } = await axios.get(endpoint);
    return {
      connected: data.connected,
      message: data.message,
      mode: data.mode,
      pushHealthy: data.pushHealthy,
      pullReachable: data.pullReachable,
      pullOk: data.pullOk,
      lastPushAt: data.lastPushAt,
    };
  } catch (err) {
    throw err;
  }
};

export const syncDeviceById = async (
  id: string,
  payload?: { fromDate?: string; toDate?: string }
): Promise<IDeviceSyncResult> => {
  try {
    const endpoint = `${API_BASE_URL}/${BIOMETRIC.SYNC_DEVICE}/${id}/sync`;
    const { data } = await axios.post(endpoint, payload ?? {});
    return { count: data.count, message: data.message };
  } catch (err) {
    throw err;
  }
};

export const fetchDeviceSyncLogs = async (id: string): Promise<IBiometricSyncLog[]> => {
  try {
    const endpoint = `${API_BASE_URL}/${BIOMETRIC.DEVICE_LOGS}/${id}/logs`;
    const { data } = await axios.get(endpoint);
    return data.data ?? [];
  } catch (err) {
    throw err;
  }
};

// ─── Attendance Sync Conflicts ───────────────────────────────────────────────

export interface IAttendanceSyncConflict {
  id: string;
  attendanceId: string;
  employeeId: string;
  field: 'checkIn' | 'checkOut';
  existingValue: string;
  proposedValue: string;
  source?: string | null;
  createdAt: string;
  employee?: {
    employeeCode?: string;
    users?: { firstName?: string; lastName?: string };
  };
  attendance?: { id: string; checkIn?: string | null; checkOut?: string | null; attendanceDate?: string | null };
}

export const fetchAttendanceConflicts = async (): Promise<IAttendanceSyncConflict[]> => {
  try {
    const { data } = await axios.get(`${API_BASE_URL}/${BIOMETRIC.CONFLICTS}`);
    return data.data ?? [];
  } catch (err) {
    throw err;
  }
};

export const fetchAttendanceConflictCount = async (): Promise<number> => {
  try {
    const { data } = await axios.get(`${API_BASE_URL}/${BIOMETRIC.CONFLICTS_COUNT}`);
    return data.count ?? 0;
  } catch (err) {
    throw err;
  }
};

export const resolveAttendanceConflict = async (
  id: string,
  action: 'accept' | 'reject'
): Promise<{ message: string }> => {
  try {
    const { data } = await axios.post(`${API_BASE_URL}/${BIOMETRIC.CONFLICTS_RESOLVE}/${id}/resolve`, { action });
    return { message: data.message };
  } catch (err) {
    throw err;
  }
};
