import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { WtField } from '@app/modules/common/components/ui/WtField';
import { toast } from '@app/modules/common/components/ui/feedback';
import { useEmployeeDirectory } from '@app/modules/common/components/EmployeePickerField';
import {
    lockError, formatLockTime, shortLockTime,
    type SupportAccessPolicy, type SupportApprovalMode,
} from '@services/securityPin';
import { fetchRoles } from '@services/roles';
import { CompactPeoplePicker } from './CompactPeoplePicker';
import { useSupportAccessPolicy } from './useSupportAccessPolicy';
import type { SecurityPinSubject } from './useSecurityPinPolicy';
import { WtButton } from '@app/modules/common/components/ui/buttons';

/**
 * Three choices only — no repeated “Admins approve” lines.
 *   inherit → follow role / company default
 *   mfa     → approvalMode never
 *   approve → approvalMode required; empty approvers = Admins
 */
type RuleSelect = 'inherit' | 'mfa' | 'approve';

function normalizeMode(mode: string | undefined): SupportApprovalMode {
    return mode === 'never' ? 'never' : 'required';
}

function hasCustomApprovers(p: SupportAccessPolicy): boolean {
    return (p.approverRoleIds?.length ?? 0) > 0 || (p.approverEmployeeIds?.length ?? 0) > 0;
}

function ruleFromPolicy(own: SupportAccessPolicy | null, inherit: boolean): RuleSelect {
    if (inherit || !own) return 'inherit';
    if (normalizeMode(own.approvalMode) === 'never') return 'mfa';
    return 'approve';
}

function expandPeopleFromRoles(
    roleIds: string[],
    namedEmployeeIds: string[],
    roleMemberIds: Record<string, string[]>,
): string[] {
    const fromRoles = roleIds.flatMap((id) => roleMemberIds[id] ?? []);
    return [...new Set([...namedEmployeeIds, ...fromRoles])];
}

function summarize(p: SupportAccessPolicy): string {
    const mode = normalizeMode(p.approvalMode);
    if (mode === 'never') return `MFA only · ${shortLockTime(p.durationMinutes)}`;
    if (!hasCustomApprovers(p)) return `Admins · ${shortLockTime(p.durationMinutes)}`;
    return `Custom · ${shortLockTime(p.durationMinutes)}`;
}

/**
 * Minimal RBAC editor for System PIN Support Access.
 */
export function SupportAccessPolicyControl({
    subject,
    disabled,
}: {
    subject: SecurityPinSubject;
    disabled?: boolean;
}) {
    const { data, save } = useSupportAccessPolicy(subject);
    const isRole = subject.kind === 'role';
    const { data: directory = [], isLoading: directoryLoading } = useEmployeeDirectory();

    const own: SupportAccessPolicy | null = !data ? null
        : data.kind === 'role' ? data.role.policy
        : data.employee.override;
    const inherited: SupportAccessPolicy = !data ? {
        durationMinutes: 10,
        approvalMode: 'required',
        approverRoleIds: [],
        approverEmployeeIds: [],
    }
        : data.kind === 'role' ? data.role.default
        : data.employee.fromRoles.policy;
    const editable = !!data && (data.kind === 'role' ? data.role.editable : data.employee.editable !== false);
    const presets = data?.kind === 'role' ? data.role.durationPresets
        : data?.kind === 'employee' ? data.employee.durationPresets
        : [5, 10, 15, 30, 60, 120];

    const [inherit, setInherit] = useState(true);
    const [durationMinutes, setDurationMinutes] = useState(10);
    const [rule, setRule] = useState<RuleSelect>('inherit');
    const [approverRoleIds, setApproverRoleIds] = useState<string[]>([]);
    const [approverEmployeeIds, setApproverEmployeeIds] = useState<string[]>([]);
    const [roleOptions, setRoleOptions] = useState<{ value: string; label: string }[]>([]);
    const [roleMemberIds, setRoleMemberIds] = useState<Record<string, string[]>>({});
    const [rolesReady, setRolesReady] = useState(false);
    const [busy, setBusy] = useState(false);
    const [customizeApprovers, setCustomizeApprovers] = useState(false);

    useEffect(() => {
        fetchRoles()
            .then((res: any) => {
                const list = res?.data ?? res ?? [];
                const rows: { value: string; label: string }[] = [];
                const members: Record<string, string[]> = {};
                for (const r of Array.isArray(list) ? list : []) {
                    const id = String(r.id);
                    const emps = Array.isArray(r.employees) ? r.employees : [];
                    const count = emps.filter((e: any) => e?.isActive !== false && e?.id).length;
                    const name = String(r.name || r.code || r.id);
                    rows.push({ value: id, label: count ? `${name} (${count})` : name });
                    members[id] = emps
                        .filter((e: any) => e?.isActive !== false && e?.id)
                        .map((e: any) => String(e.id));
                }
                setRoleOptions(rows);
                setRoleMemberIds(members);
                setRolesReady(true);
            })
            .catch(() => {
                setRoleOptions([]);
                setRoleMemberIds({});
                setRolesReady(true);
            });
    }, []);

    useEffect(() => {
        if (!data) return;
        const source = own ?? inherited;
        const roles = source.approverRoleIds ?? [];
        const named = source.approverEmployeeIds ?? [];
        const nextInherit = !own;
        setInherit(nextInherit);
        setDurationMinutes(source.durationMinutes);
        setRule(ruleFromPolicy(own, nextInherit));
        setApproverRoleIds(roles);
        setCustomizeApprovers(hasCustomApprovers(source) && !nextInherit);
        if (rolesReady) {
            setApproverEmployeeIds(expandPeopleFromRoles(roles, named, roleMemberIds));
        } else {
            setApproverEmployeeIds(named);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        data,
        own?.durationMinutes,
        own?.approvalMode,
        JSON.stringify(own?.approverRoleIds),
        JSON.stringify(own?.approverEmployeeIds),
        rolesReady,
        JSON.stringify(roleMemberIds),
    ]);

    const durationOptions = useMemo(() => [
        ...presets.map((m) => ({ value: String(m), label: formatLockTime(m) })),
    ], [presets]);

    const ruleOptions = useMemo(() => [
        {
            value: 'inherit',
            label: isRole ? 'Company default' : 'Follow role',
        },
        { value: 'mfa', label: 'MFA only' },
        { value: 'approve', label: 'Inbox approval' },
    ], [isRole]);

    const persist = async (body: Parameters<typeof save>[0]) => {
        setBusy(true);
        try {
            await save(body);
            toast({ icon: 'success', title: 'Saved' });
        } catch (e) {
            toast({ icon: 'error', title: lockError(e).message });
        } finally {
            setBusy(false);
        }
    };

    const bodyFrom = (next: RuleSelect, mins: number, roles: string[], people: string[]): SupportAccessPolicy => {
        if (next === 'mfa') {
            return { durationMinutes: mins, approvalMode: 'never', approverRoleIds: [], approverEmployeeIds: [] };
        }
        return {
            durationMinutes: mins,
            approvalMode: 'required',
            approverRoleIds: roles,
            approverEmployeeIds: people,
        };
    };

    const applyRule = (next: RuleSelect) => {
        if (next === 'inherit') {
            setInherit(true);
            setRule('inherit');
            setCustomizeApprovers(false);
            void persist({ inherit: true });
            return;
        }
        const mins = durationMinutes || inherited.durationMinutes || 10;
        // Default Inbox path = Admins. Custom picks only when user expands that section.
        const roles: string[] = [];
        const people: string[] = [];
        setInherit(false);
        setRule(next);
        setDurationMinutes(mins);
        setApproverRoleIds(roles);
        setApproverEmployeeIds(people);
        setCustomizeApprovers(false);
        void persist(bodyFrom(next, mins, roles, people));
    };

    const saveApprove = (mins: number, roles: string[], people: string[]) => {
        setInherit(false);
        setRule('approve');
        setDurationMinutes(mins);
        setApproverRoleIds(roles);
        setApproverEmployeeIds(people);
        void persist(bodyFrom('approve', mins, roles, people));
    };

    const saveMfa = (mins: number) => {
        setInherit(false);
        setRule('mfa');
        setDurationMinutes(mins);
        setApproverRoleIds([]);
        setApproverEmployeeIds([]);
        void persist(bodyFrom('mfa', mins, [], []));
    };

    const onRolesChange = (nextRoles: string[]) => {
        const prev = new Set(approverRoleIds);
        let people = [...approverEmployeeIds];
        for (const id of nextRoles.filter((rid) => !prev.has(rid))) {
            people = [...new Set([...people, ...(roleMemberIds[id] ?? [])])];
        }
        for (const id of approverRoleIds.filter((rid) => !nextRoles.includes(rid))) {
            const members = new Set(roleMemberIds[id] ?? []);
            const keepFromOther = new Set(nextRoles.flatMap((rid) => roleMemberIds[rid] ?? []));
            people = people.filter((eid) => !members.has(eid) || keepFromOther.has(eid));
        }
        saveApprove(durationMinutes, nextRoles, people);
    };

    if (!data) {
        return <Typography sx={{ fontSize: 13, color: '#64748B' }}>Loading…</Typography>;
    }

    const fieldDisabled = disabled || !editable || busy;
    const showExtras = !inherit;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, width: '100%', minWidth: 0 }}>
            <WtField
                label="Rule"
                icon="shield-tick"
                value={rule}
                onChange={(v) => applyRule(v as RuleSelect)}
                options={ruleOptions}
                disabled={fieldDisabled}
                hint={inherit ? `From roles: ${summarize(inherited)}` : undefined}
            />

            {showExtras && (
                <WtField
                    label="Session length"
                    icon="time"
                    value={String(durationMinutes)}
                    onChange={(v) => {
                        const n = Number(v) || durationMinutes;
                        if (rule === 'mfa') saveMfa(n);
                        else saveApprove(n, approverRoleIds, approverEmployeeIds);
                    }}
                    options={durationOptions}
                    disabled={fieldDisabled}
                />
            )}

            {showExtras && rule === 'approve' && !customizeApprovers && (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                    <Typography sx={{ m: 0, fontSize: 12.5, color: '#64748B', lineHeight: 1.4 }}>
                        Approvers: Admins
                    </Typography>
                    <WtButton variant="text"
                        size="small"
                        disabled={fieldDisabled}
                        onClick={() => setCustomizeApprovers(true)}
                        sx={{ textTransform: 'none', fontSize: 12, minWidth: 0, px: 0.5 }}
                    >
                        Change
                    </WtButton>
                </Box>
            )}

            {showExtras && rule === 'approve' && customizeApprovers && (
                <>
                    <WtField
                        label="Roles"
                        icon="abstract-26"
                        multiple
                        searchable
                        limitTags={1}
                        clearable
                        value={approverRoleIds}
                        onChange={(ids: string[]) => onRolesChange(ids ?? [])}
                        options={roleOptions}
                        disabled={fieldDisabled}
                        placeholder={roleOptions.length ? 'Select…' : 'No roles'}
                        hint="Empty = Admins"
                        sx={{
                            '& .MuiAutocomplete-inputRoot': {
                                flexWrap: 'nowrap',
                                maxHeight: 42,
                                overflow: 'hidden',
                            },
                        }}
                    />
                    <CompactPeoplePicker
                        label="People"
                        value={approverEmployeeIds}
                        onChange={(ids) => saveApprove(durationMinutes, approverRoleIds, ids)}
                        employees={directory}
                        loading={directoryLoading}
                        disabled={fieldDisabled || directoryLoading}
                    />
                    {(approverRoleIds.length > 0 || approverEmployeeIds.length > 0) && (
                        <WtButton variant="text"
                            size="small"
                            disabled={fieldDisabled}
                            onClick={() => {
                                setCustomizeApprovers(false);
                                saveApprove(durationMinutes, [], []);
                            }}
                            sx={{ textTransform: 'none', fontSize: 12, alignSelf: 'flex-start', minWidth: 0, px: 0.5 }}
                        >
                            Reset to Admins
                        </WtButton>
                    )}
                </>
            )}
        </Box>
    );
}

export default SupportAccessPolicyControl;
