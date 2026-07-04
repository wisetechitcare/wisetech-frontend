import { useCallback, useEffect, useState } from 'react';
import {
    DeviceSummary,
    getMyDevices,
    registerThisDevice,
    isBiometricAvailable,
    deleteDevice,
} from '@services/webauthn';

/**
 * "My Devices" — lets an employee enrol the phone they use for attendance with its
 * built-in Face ID / Fingerprint, and see the trust status of each device. The first
 * device is trusted automatically; additional devices wait for manager approval.
 */
function statusBadge(status: DeviceSummary['status']) {
    const map: Record<DeviceSummary['status'], string> = {
        TRUSTED: 'badge-light-success',
        PENDING: 'badge-light-warning',
        REVOKED: 'badge-light-danger',
    };
    const label = { TRUSTED: 'Trusted', PENDING: 'Pending approval', REVOKED: 'Revoked' }[status];
    return <span className={`badge ${map[status]} fw-semibold`}>{label}</span>;
}

export default function MyDevices() {
    const [devices, setDevices] = useState<DeviceSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [registering, setRegistering] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [supported, setSupported] = useState<boolean | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            setDevices(await getMyDevices());
        } catch {
            setDevices([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        isBiometricAvailable().then(setSupported);
        load();
    }, [load]);

    const handleRegister = async () => {
        setMessage(null);
        setRegistering(true);
        try {
            const { device } = await registerThisDevice();
            setMessage({
                type: 'success',
                text:
                    device.status === 'TRUSTED'
                        ? 'This device is now registered and trusted.'
                        : 'Device registered. It is pending your manager’s approval.',
            });
            await load();
        } catch (err: any) {
            setMessage({
                type: 'error',
                text:
                    err?.name === 'NotAllowedError'
                        ? 'Biometric prompt was cancelled or timed out. Please try again.'
                        : 'Could not register this device. Make sure your phone has Face ID / fingerprint set up and you are using Chrome or Safari.',
            });
        } finally {
            setRegistering(false);
        }
    };

    const handleDelete = async (device: DeviceSummary) => {
        const ok = window.confirm(
            `Remove "${device.deviceLabel || 'this device'}"? It will no longer be able to mark attendance until you register it again.`,
        );
        if (!ok) return;
        setMessage(null);
        setDeletingId(device.id);
        try {
            await deleteDevice(device.id);
            setMessage({ type: 'success', text: 'Device removed.' });
            await load();
        } catch {
            setMessage({ type: 'error', text: 'Could not remove the device. Please try again.' });
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="card">
            <div className="card-header border-0 pt-6">
                <div className="card-title flex-column">
                    <h3 className="fw-bold mb-1">My Devices</h3>
                    <span className="text-muted fs-7">
                        Register the phone you use to mark attendance with its Face ID / fingerprint.
                    </span>
                </div>
                <div className="card-toolbar">
                    <button
                        className="btn btn-primary"
                        onClick={handleRegister}
                        disabled={registering || supported === false}
                    >
                        {registering ? (
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                        ) : null}
                        Register this device
                    </button>
                </div>
            </div>

            <div className="card-body pt-3">
                {supported === false && (
                    <div className="alert alert-warning">
                        This device or browser does not support built-in biometrics. Open the app in Chrome
                        (Android) or Safari (iPhone) on a phone with Face ID / fingerprint set up.
                    </div>
                )}

                {message && (
                    <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-danger'}`}>
                        {message.text}
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-10">
                        <span className="spinner-border text-primary" role="status" aria-hidden="true" />
                    </div>
                ) : devices.length === 0 ? (
                    <div className="text-muted py-6">
                        No devices registered yet. Tap “Register this device” to get started.
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="table table-row-dashed align-middle gs-0 gy-4">
                            <thead>
                                <tr className="fw-bold text-muted">
                                    <th>Device</th>
                                    <th>Platform</th>
                                    <th>Status</th>
                                    <th>First seen</th>
                                    <th>Last used</th>
                                    <th className="text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {devices.map((d) => (
                                    <tr key={d.id}>
                                        <td className="fw-semibold">{d.deviceLabel || 'Unnamed device'}</td>
                                        <td className="text-muted">{d.platform || '—'}</td>
                                        <td>{statusBadge(d.status)}</td>
                                        <td className="text-muted">{new Date(d.firstSeenAt).toLocaleString()}</td>
                                        <td className="text-muted">
                                            {d.lastUsedAt ? new Date(d.lastUsedAt).toLocaleString() : '—'}
                                        </td>
                                        <td className="text-end">
                                            <button
                                                className="btn btn-sm btn-light-danger"
                                                onClick={() => handleDelete(d)}
                                                disabled={deletingId === d.id}
                                            >
                                                {deletingId === d.id ? (
                                                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                                                ) : (
                                                    'Remove'
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
