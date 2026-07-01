export type ConnectionMode = 'PUSH' | 'PULL' | 'BOTH';

export interface IBiometricDevice {
  id: string;
  branchId: string;
  name: string;
  deviceIp: string;
  devicePort: string;
  serialNumber: string;
  sourceDeviceName: string | null;
  username: string;
  password: string; // always '••••••' from API
  isActive: boolean;
  connectionMode: ConnectionMode;
  consecutiveFailures: number;
  lastSyncedAt: string | null;
  lastSyncStatus: 'SUCCESS' | 'FAILED' | 'PARTIAL' | null;
  lastPushAt: string | null;
  lastPullAt: string | null;
  createdAt: string;
  branch?: { id: string; name: string };
}

export interface ICreateBiometricDevice {
  branchId: string;
  name: string;
  deviceIp: string;
  devicePort: string;
  serialNumber: string;
  sourceDeviceName?: string | null;
  username: string;
  password: string;
  isActive?: boolean;
  connectionMode?: ConnectionMode;
}

export interface IUpdateBiometricDevice {
  branchId?: string; // reassign device to a different branch
  name?: string;
  deviceIp?: string;
  devicePort?: string;
  serialNumber?: string;
  sourceDeviceName?: string | null;
  username?: string;
  password?: string;
  isActive?: boolean;
  connectionMode?: ConnectionMode;
}

export interface IDeviceTestResult {
  connected: boolean;
  message: string;
  mode?: ConnectionMode;
  pushHealthy?: boolean;
  pullReachable?: boolean;
  pullOk?: boolean;
  lastPushAt?: string | null;
}

export interface IDeviceSyncResult {
  count: number;
  message: string;
}

export interface IBiometricSyncLog {
  id: string;
  deviceId: string;
  triggeredBy: 'CRON' | 'MANUAL' | 'WEBHOOK';
  startedAt: string;
  completedAt: string | null;
  recordCount: number | null;
  status: 'SUCCESS' | 'FAILED' | 'PARTIAL';
  errorMessage: string | null;
}
