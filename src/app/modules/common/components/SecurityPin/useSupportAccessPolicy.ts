import { useCallback, useEffect, useState } from 'react';
import {
    securityPinApi,
    type EmployeeSupportPolicyDto,
    type RoleSupportPolicyDto,
    type SupportPolicyBody,
} from '@services/securityPin';
import type { SecurityPinSubject } from './useSecurityPinPolicy';

export const SUPPORT_ACCESS_POLICY_CHANGED = 'wt-support-access-policy-changed';
export const announceSupportPolicyChange = () => window.dispatchEvent(new Event(SUPPORT_ACCESS_POLICY_CHANGED));

type Data =
    | { kind: 'role'; role: RoleSupportPolicyDto }
    | { kind: 'employee'; employee: EmployeeSupportPolicyDto };

const inflight = new Map<string, Promise<Data>>();
const keyOf = (s: SecurityPinSubject) => (s.kind === 'role' ? `sr:${s.roleId}` : `se:${s.employeeId}`);

const fetchData = (s: SecurityPinSubject): Promise<Data> => {
    const key = keyOf(s);
    let p = inflight.get(key);
    if (!p) {
        p = s.kind === 'role'
            ? securityPinApi.getRoleSupportPolicy(s.roleId).then((role) => ({ kind: 'role' as const, role }))
            : securityPinApi.getEmployeeSupportPolicy(s.employeeId).then((employee) => ({ kind: 'employee' as const, employee }));
        p.catch(() => inflight.delete(key));
        inflight.set(key, p);
    }
    return p;
};

export function useSupportAccessPolicy(subject: SecurityPinSubject | undefined) {
    const [data, setData] = useState<Data | null>(null);
    const [error, setError] = useState<unknown>(null);
    const id = subject ? keyOf(subject) : '';

    const load = useCallback(() => {
        if (!subject) return;
        fetchData(subject).then(setData, setError);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    useEffect(() => {
        load();
        const onChanged = () => { inflight.delete(id); load(); };
        window.addEventListener(SUPPORT_ACCESS_POLICY_CHANGED, onChanged);
        return () => window.removeEventListener(SUPPORT_ACCESS_POLICY_CHANGED, onChanged);
    }, [id, load]);

    const save = useCallback(async (body: SupportPolicyBody) => {
        if (!subject) return;
        if (subject.kind === 'role') await securityPinApi.setRoleSupportPolicy(subject.roleId, body);
        else await securityPinApi.setEmployeeSupportPolicy(subject.employeeId, body);
        inflight.clear();
        announceSupportPolicyChange();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    return { data, error, save, reload: () => { inflight.delete(id); load(); } };
}
