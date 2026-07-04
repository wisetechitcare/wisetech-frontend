import axios from 'axios';
import { Capacitor } from '@capacitor/core';
import {
    BiometricAuth,
    BiometryType,
    AndroidBiometryStrength,
} from '@aparajita/capacitor-biometric-auth';
import { DEVICE } from '@constants/api-endpoint';

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;

/**
 * Native (Capacitor) biometric path. Unlike the browser's WebAuthn — which cannot
 * block the device PIN/pattern — the native Android/iOS biometric prompt is forced to
 * STRONG biometrics only with `allowDeviceCredential: false`, so the lock-screen PIN /
 * pattern is rejected and only Face / Fingerprint is accepted.
 *
 * WebAuthn does not work inside Android's WebView, so the installed app uses this path
 * while the plain browser keeps using WebAuthn (see webauthn.ts).
 */

/** Running inside the installed native app (not a plain browser tab)? */
export function isNativeApp(): boolean {
    return Capacitor.isNativePlatform();
}

/** A stable per-install device id, kept in local storage. */
function getNativeDeviceId(): string {
    const KEY = 'wt_native_device_id';
    let id = localStorage.getItem(KEY);
    if (!id) {
        id = (crypto as any).randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
        localStorage.setItem(KEY, id);
    }
    return id;
}

function biometryLabel(type: BiometryType): string {
    switch (type) {
        case BiometryType.faceId:
        case BiometryType.faceAuthentication:
            return 'Face';
        case BiometryType.touchId:
        case BiometryType.fingerprintAuthentication:
            return 'Fingerprint';
        case BiometryType.irisAuthentication:
            return 'Iris';
        default:
            return 'Biometric';
    }
}

/** Is a STRONG biometric enrolled and usable on this device? */
export async function isStrongBiometryAvailable(): Promise<boolean> {
    try {
        const info = await BiometricAuth.checkBiometry();
        return info.isAvailable && info.biometryType !== BiometryType.none;
    } catch {
        return false;
    }
}

/**
 * Force a STRONG biometric check (Face / Fingerprint), never the PIN/pattern.
 * Throws if it fails or is cancelled.
 */
export async function verifyStrongBiometric(reason = 'Verify to mark attendance'): Promise<void> {
    await BiometricAuth.authenticate({
        reason,
        androidTitle: 'Attendance verification',
        androidSubtitle: 'Confirm with your face or fingerprint',
        cancelTitle: 'Cancel',
        // The two settings that enforce biometric-only:
        allowDeviceCredential: false,                       // reject PIN / pattern / password
        androidBiometryStrength: AndroidBiometryStrength.strong, // Class 3 only
        androidConfirmationRequired: false,
    });
}

interface NativeGrantResponse {
    attendanceGrant: string;
    deviceRecognized?: boolean;
    device?: { status?: string };
}

/**
 * Native attendance gate: strong biometric → then obtain a server attendance-grant for
 * this device (registering it the first time). Returns the grant token, or throws.
 */
export async function ensureNativeBiometricGrant(): Promise<string> {
    if (!(await isStrongBiometryAvailable())) {
        const e: any = new Error('No Face / Fingerprint is set up on this device. Add one in Settings, then try again.');
        e.data = { detail: e.message };
        throw e;
    }

    const info = await BiometricAuth.checkBiometry();
    await verifyStrongBiometric(`Verify your ${biometryLabel(info.biometryType)} to mark attendance`);

    const deviceId = getNativeDeviceId();
    const platform = Capacitor.getPlatform(); // 'android' | 'ios'
    const deviceLabel = `${platform === 'ios' ? 'iPhone' : 'Android'} · ${biometryLabel(info.biometryType)}`;

    // Try verify first (already registered); if unknown, register it.
    try {
        const { data } = await axios.post(`${API_BASE_URL}/${DEVICE.NATIVE_VERIFY}`, { deviceId });
        const payload: NativeGrantResponse = data?.data ?? data;
        if (payload?.attendanceGrant) return payload.attendanceGrant;
    } catch {
        // fall through to registration
    }

    const { data } = await axios.post(`${API_BASE_URL}/${DEVICE.NATIVE_REGISTER}`, {
        deviceId,
        deviceLabel,
        platform,
    });
    const payload: NativeGrantResponse = data?.data ?? data;
    if (!payload?.attendanceGrant) {
        const e: any = new Error('Could not register this device. Please try again.');
        e.data = { detail: e.message };
        throw e;
    }
    return payload.attendanceGrant;
}
