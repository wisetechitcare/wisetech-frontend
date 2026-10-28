import axios from 'axios';
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;
const base = `${API_BASE_URL}/api/employee/attendance/identity`;

export type AttendancePunchAction = 'CHECK_IN' | 'CHECK_OUT';

export interface AttendanceIdentityStatus {
  required: boolean;
  faceEnrolled: boolean;
  passkeys: Array<{ id: string; createdAt: string; deviceType: string }>;
}

const body = <T>(response: { data: { data: T } }): T => response.data.data;

export async function getAttendanceIdentityStatus(employeeId?: string) {
  return body<AttendanceIdentityStatus>(await axios.get(`${base}/status`, { params: employeeId ? { employeeId } : undefined }));
}

export async function verifyAttendancePasskey(action: AttendancePunchAction): Promise<string> {
  const started = body<any>(await axios.post(`${base}/passkey/options`, { action }));
  const response = await startAuthentication({ optionsJSON: started.options });
  const verified = body<{ verificationId: string }>(await axios.post(`${base}/passkey/verify`, {
    action,
    challengeId: started.challengeId,
    response,
  }));
  return verified.verificationId;
}

export async function enrollAttendancePasskey(employeeId: string): Promise<AttendanceIdentityStatus> {
  const started = body<any>(await axios.post(`${base}/passkey/enroll/options`, { employeeId }));
  const response = await startRegistration({ optionsJSON: started.options });
  return body<AttendanceIdentityStatus>(await axios.post(`${base}/passkey/enroll/verify`, {
    employeeId,
    challengeId: started.challengeId,
    response,
  }));
}

export async function beginAttendanceFace(action: AttendancePunchAction | 'ENROLL_FACE', employeeId?: string) {
  return body<{ challengeId: string; sessionId: string; region: string }>(
    await axios.post(`${base}/face/session`, { action, employeeId }),
  );
}

export async function finishAttendanceFace(
  action: AttendancePunchAction | 'ENROLL_FACE',
  challengeId: string,
  employeeId?: string,
) {
  return body<{ verificationId?: string } & AttendanceIdentityStatus>(
    await axios.post(`${base}/face/verify`, { action, challengeId, employeeId }),
  );
}

