import axios from 'axios';
import {
    startRegistration,
    startAuthentication,
    browserSupportsWebAuthn,
    platformAuthenticatorIsAvailable,
} from '@simplewebauthn/browser';
import { DEVICE } from '@constants/api-endpoint';
import { UAParser } from 'ua-parser-js';
import { isNativeApp, ensureNativeBiometricGrant } from '@services/nativeBiometric';

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;

/**
 * Phone biometric (Face ID / Touch ID / Fingerprint / Face Unlock) attendance
 * device binding via WebAuthn. The biometric scan happens entirely on the device;
 * only a public key + device metadata are sent to the server.
 */

export interface DeviceSummary {
    id: string;
    deviceLabel: string | null;
    platform: string | null;
    status: 'PENDING' | 'TRUSTED' | 'REVOKED';
    firstSeenAt: string;
    lastUsedAt: string | null;
}

/** True when this browser + device can do platform (built-in) biometrics. */
export async function isBiometricAvailable(): Promise<boolean> {
    try {
        if (!browserSupportsWebAuthn()) return false;
        return await platformAuthenticatorIsAvailable();
    } catch {
        return false;
    }
}

/**
 * Best-effort human label + platform for the current device.
 *
 * Chrome on Android intentionally reports the model as "K" in the UA string (privacy),
 * so we first ask for User-Agent Client Hints (getHighEntropyValues), which returns the
 * real model (e.g. "Pixel 7", "SM-S911B"). We fall back to UA parsing (fine for iOS
 * Safari, which has no client hints) and finally to an OS+browser label so we never
 * store a meaningless "K".
 */
async function describeThisDevice(): Promise<{ deviceLabel: string; platform: string }> {
    const r = new UAParser().getResult();
    let model = (r.device.model ?? '').trim();
    let osName = r.os.name ?? '';
    const vendor = r.device.vendor ? `${r.device.vendor} ` : '';
    const browser = r.browser.name ?? '';

    const uad: any = (navigator as any).userAgentData;
    if (uad?.getHighEntropyValues) {
        try {
            const h = await uad.getHighEntropyValues(['model', 'platform', 'platformVersion']);
            if (h?.model && h.model.trim() && h.model.trim() !== 'K') model = h.model.trim();
            if (h?.platform) osName = h.platform;
        } catch {
            // client hints unavailable — keep UA-parsed values
        }
    }

    const platform = /iOS|Mac/i.test(osName) ? 'ios' : /Android/i.test(osName) ? 'android' : 'web';

    let label = '';
    if (model && model !== 'K') label = `${vendor}${model}`.trim();
    if (!label) label = [osName, browser].filter(Boolean).join(' ').trim();
    if (!label) label = 'This device';

    return { deviceLabel: label, platform };
}

export interface RegisterResult {
    device: DeviceSummary;
    /** Grant token issued by the registration ceremony (proves the biometric). */
    attendanceGrant?: string;
}

/**
 * Enrol the current device. Triggers the OS biometric prompt. The first device an
 * employee registers is auto-trusted; any additional device is left pending manager
 * approval (the server decides). Also returns an attendance-grant so the same biometric
 * can immediately authorise a punch (no second prompt).
 */
export async function registerThisDevice(): Promise<RegisterResult> {
    const { deviceLabel, platform } = await describeThisDevice();

    const { data: optRes } = await axios.post(`${API_BASE_URL}/${DEVICE.REGISTRATION_OPTIONS}`, {});
    const options = optRes?.data?.options ?? optRes?.options;
    if (!options) throw new Error('Could not start device registration');

    // Opens the phone's Face ID / fingerprint prompt.
    const attResp = await startRegistration({ optionsJSON: options });

    const { data: verifyRes } = await axios.post(`${API_BASE_URL}/${DEVICE.REGISTRATION_VERIFY}`, {
        attResp,
        deviceLabel,
        platform,
    });
    const payload = verifyRes?.data ?? verifyRes;
    return {
        device: payload?.device as DeviceSummary,
        attendanceGrant: payload?.attendanceGrant,
    };
}

export interface AssertionResult {
    attendanceGrant: string;
    deviceRecognized: boolean;
    deviceId: string;
}

/**
 * Prove presence with the phone biometric right before a punch. Returns a short-lived
 * attendance-grant token to attach to the check-in payload, or null if the employee
 * has no registered device / biometric is unavailable (caller may proceed without it
 * while the feature is in shadow mode).
 */
export async function assertForAttendance(): Promise<AssertionResult | null> {
    try {
        const { data: optRes } = await axios.post(`${API_BASE_URL}/${DEVICE.ASSERTION_OPTIONS}`, {});
        const options = optRes?.data?.options ?? optRes?.options;
        if (!options) return null;

        const authResp = await startAuthentication({ optionsJSON: options });

        const { data: verifyRes } = await axios.post(`${API_BASE_URL}/${DEVICE.ASSERTION_VERIFY}`, {
            authResp,
        });
        const payload = verifyRes?.data ?? verifyRes;
        if (!payload?.attendanceGrant) return null;
        return {
            attendanceGrant: payload.attendanceGrant,
            deviceRecognized: !!payload.deviceRecognized,
            deviceId: payload.deviceId,
        };
    } catch (err) {
        // No registered device (400) or user cancelled the biometric — let the caller
        // decide. In shadow mode the punch still goes through.
        console.warn('[webauthn] assertion skipped:', err);
        return null;
    }
}

/** List the current employee's registered devices and their trust status. */
export async function getMyDevices(): Promise<DeviceSummary[]> {
    const { data } = await axios.get(`${API_BASE_URL}/${DEVICE.MY_DEVICES}`);
    return (data?.data?.devices ?? data?.devices ?? []) as DeviceSummary[];
}

/** Delete one of the employee's own devices. It can't mark attendance after this. */
export async function deleteDevice(id: string): Promise<void> {
    await axios.delete(`${API_BASE_URL}/${DEVICE.DELETE_DEVICE}/${id}`);
}

/** Error shaped like the app's API errors so existing `err.data.detail` catches show it. */
function biometricError(detail: string): Error {
    const e = new Error(detail) as any;
    e.data = { detail };
    e.isBiometric = true;
    return e;
}

/**
 * MANDATORY biometric gate for marking attendance. Returns a fresh attendance-grant
 * token, or THROWS (blocking the punch) if the employee declines / cancels / has no
 * biometric. Flow:
 *   - no biometric hardware or insecure page → throw with guidance.
 *   - no registered device → ask "register this device?"; yes → OS biometric enrols it
 *     and returns a grant in the same step; no → throw (punch blocked).
 *   - has a device → OS biometric assertion → grant.
 */
export async function ensureBiometricForAttendance(): Promise<string> {
    // Installed native app → use the native strong-biometric gate (Face/Fingerprint
    // only, PIN/pattern rejected). WebAuthn does not work inside Android's WebView.
    if (isNativeApp()) {
        return ensureNativeBiometricGrant();
    }

    // WebAuthn only runs on HTTPS (or localhost). On a plain http://LAN-IP the prompt
    // can never appear, so fail loudly instead of silently skipping.
    if (typeof window !== 'undefined' && !window.isSecureContext) {
        throw biometricError(
            'Biometric attendance needs a secure (https) connection. Open the app via its https link on your phone.',
        );
    }
    if (!(await isBiometricAvailable())) {
        throw biometricError(
            'No Face ID / fingerprint is available on this device or browser. Use a phone with biometrics set up, in Chrome or Safari.',
        );
    }

    const registerNow = async (prompt: string): Promise<string> => {
        const wantsToAdd = window.confirm(prompt);
        if (!wantsToAdd) throw biometricError('Biometric verification is required to mark attendance.');
        try {
            const reg = await registerThisDevice();
            if (reg.attendanceGrant) return reg.attendanceGrant; // registration proves the biometric
            const a = await assertForAttendance();
            if (a?.attendanceGrant) return a.attendanceGrant;
            throw new Error('no-grant');
        } catch (err: any) {
            throw biometricError(
                err?.name === 'NotAllowedError'
                    ? 'Biometric was cancelled. Please try again.'
                    : 'Could not register this device. Make sure Face ID / fingerprint is set up.',
            );
        }
    };

    const devices = await getMyDevices();
    const usable = devices.filter((d) => d.status !== 'REVOKED');

    // No device yet → offer to register (adds the device with the OS biometric).
    if (usable.length === 0) {
        return registerNow(
            'To mark attendance you must first register this device with your Face ID / fingerprint.\n\nRegister this device now?',
        );
    }

    // Has a device → verify with the OS biometric.
    const assertion = await assertForAttendance();
    if (assertion?.attendanceGrant) return assertion.attendanceGrant;

    // Verification didn't produce a grant — the credential may not exist on this exact
    // site (e.g. the URL changed) or the prompt was cancelled. Offer to re-register.
    return registerNow(
        'Could not verify with your registered device on this site. Register this device now and continue?',
    );
}
