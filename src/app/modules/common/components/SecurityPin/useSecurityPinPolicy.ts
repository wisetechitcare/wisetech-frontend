import { useCallback, useEffect, useState } from 'react';
import {
    securityPinApi, type EmployeePinPolicy, type PolicyBody, type RolePinPolicy,
} from '@services/securityPin';

/** Whose security PIN is being edited. */
export type SecurityPinSubject = { kind: 'role'; roleId: string; roleName?: string } | { kind: 'employee'; employeeId: string };

/** Fired after any policy save / PIN reset, so every control for it reloads. */
export const SECURITY_PIN_POLICY_CHANGED = 'wt-security-pin-policy-changed';
export const announcePolicyChange = () => window.dispatchEvent(new Event(SECURITY_PIN_POLICY_CHANGED));

type Data = { kind: 'role'; role: RolePinPolicy } | { kind: 'employee'; employee: EmployeePinPolicy };

// One request per subject, shared by every control that shows it (the Advanced rows, the Roles
// chip, the side panel). Cleared on any save so all of them reload together.
const inflight = new Map<string, Promise<Data>>();
const keyOf = (s: SecurityPinSubject) => (s.kind === 'role' ? `r:${s.roleId}` : `e:${s.employeeId}`);
const fetchData = (s: SecurityPinSubject): Promise<Data> => {
    const key = keyOf(s);
    let p = inflight.get(key);
    if (!p) {
        p = s.kind === 'role'
            ? securityPinApi.getRolePolicy(s.roleId).then((role) => ({ kind: 'role' as const, role }))
            : securityPinApi.getEmployeePolicy(s.employeeId).then((employee) => ({ kind: 'employee' as const, employee }));
        p.catch(() => inflight.delete(key));
        inflight.set(key, p);
    }
    return p;
};

/** A role's or employee's per-tab PIN settings, plus a saver that refreshes every consumer. */
export function useSecurityPinPolicy(subject: SecurityPinSubject | undefined) {
    const [data, setData] = useState<Data | null>(null);
    const [error, setError] = useState<unknown>(null);
    const id = subject ? keyOf(subject) : null;

    const load = useCallback(() => {
        if (!subject || !id) return;
        fetchData(subject).then(setData, setError);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    useEffect(() => {
        if (!id) {
            setData(null);
            setError(null);
            return;
        }
        load();
        const onChanged = () => { inflight.delete(id); load(); };
        window.addEventListener(SECURITY_PIN_POLICY_CHANGED, onChanged);
        return () => window.removeEventListener(SECURITY_PIN_POLICY_CHANGED, onChanged);
    }, [id, load]);

    const save = useCallback(async (body: PolicyBody) => {
        if (!subject) return;
        if (subject.kind === 'role') await securityPinApi.setRolePolicy(subject.roleId, body);
        else await securityPinApi.setEmployeePolicy(subject.employeeId, body);
        inflight.clear();
        announcePolicyChange();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    return {
        data,
        error,
        save,
        reload: () => {
            if (id) inflight.delete(id);
            load();
        },
    };
}
