import { useCallback, useEffect, useMemo, useState } from "react";
import { Box, Grid, TextField, MenuItem, Stack, Typography, CircularProgress } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import {
    TRIO, WtButton, WtSwitch, GlassDialog, GlassHeader, GlassSurface,
    SettingsSection, StatTile, ToneChip, Eyebrow, ActionIconButton,
    toast, confirmDialog,
} from "@app/modules/common/components/ui";
import ReorderableGroup, {
    DragHandle, type DragHandleProps,
} from "@app/modules/common/components/ReorderableGroup";
import {
    fetchDeductionRules,
    fetchEffectiveDeductionRules,
    createDeductionRule,
    updateDeductionRule,
    deleteDeductionRule,
    reorderDeductionRules,
    previewDeduction,
    type DeductionRule,
    type AppliesOn,
    type DayKind,
    type DeductionOutcome,
} from "@services/deductionRule";

/**
 * BREAK / MEAL DEDUCTION RULES — the configuration surface.
 *
 * Replaces a single "Deduction Time" number that could express exactly one policy:
 * always subtract N minutes once a day passes half the working hours. Admins could not
 * move the threshold, could not exempt weekends or holidays, and could not add a second
 * break to a long shift.
 *
 * Nothing here computes a deduction. The preview panel calls the server, which runs the
 * SAME engine payroll runs — so this screen can never show a number the payslip
 * disagrees with, and an admin can see the effect of a threshold change before saving.
 */

interface Props {
    open: boolean;
    onClose: () => void;
    readOnly?: boolean;
    /**
     * Which group / org / branch the surrounding page is showing. The Attendance Config
     * page has a scope selector whose caption promises "the cards and Configure below
     * apply to this branch only" — so this screen must honour it, or an admin on the
     * Vashi tab edits the group's rules believing they are editing Vashi's.
     */
    scope?: { companyId?: string; branchId?: string };
    /**
     * Which scope this is editing, in words — "Branch override — Org › Branch" or
     * "GROUP — default for all branches". DailyShiftTimeModal on the same page already
     * shows this; without it an admin edits pay rules with no indication of whose.
     */
    scopeLabel?: string;
}

const APPLIES_ON: Array<{ value: AppliesOn; label: string; hint: string }> = [
    { value: 'all', label: 'Every day', hint: 'Applies whenever the employee worked' },
    { value: 'working_day', label: 'Working days only', hint: 'Skips weekends and holidays' },
    { value: 'non_working_day', label: 'Non-working days only', hint: 'Only weekends and holidays' },
];

const DAY_KINDS: DayKind[] = ['working', 'weekend', 'holiday'];

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/** Minutes → "1h 30m", the way a human states a break. */
const asDuration = (minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h && m) return `${h}h ${m}m`;
    if (h) return `${h}h`;
    return `${m}m`;
};

const blankRule = (): Partial<DeductionRule> => ({
    name: '',
    method: 'hours_worked',
    thresholdMinutes: 300,
    deductMinutes: 60,
    appliesOn: 'all',
    exemptHolidays: false,
    exemptWeekends: false,
    waiveIfBreakPunched: false,
    capAtThreshold: true,
    isEnabled: true,
});

export default function DeductionRules({ open, onClose, readOnly = false, scope, scopeLabel }: Props) {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [rules, setRules] = useState<DeductionRule[]>([]);
    const [draft, setDraft] = useState<Partial<DeductionRule> | null>(null);

    // Preview
    const [probeMinutes, setProbeMinutes] = useState(360);
    const [probeDayKind, setProbeDayKind] = useState<DayKind>('working');
    const [outcome, setOutcome] = useState<DeductionOutcome | null>(null);
    const [previewing, setPreviewing] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            // Effective = what the group → org → branch ladder resolves for THIS scope.
            // The unscoped list shows rules from every level, which is the wrong answer
            // to "what applies here?".
            setRules(scope?.branchId || scope?.companyId
                ? await fetchEffectiveDeductionRules(scope.branchId ?? null)
                : await fetchDeductionRules());
        } catch {
            toast({ icon: 'error', title: 'Could not load deduction rules' });
        } finally {
            setLoading(false);
        }
    }, [scope?.branchId, scope?.companyId]);

    useEffect(() => { if (open) void load(); }, [open, load]);

    const runPreview = useCallback(async () => {
        setPreviewing(true);
        try {
            const today = new Date();
            const dateISO = today.toISOString().slice(0, 10);
            const { outcome: result } = await previewDeduction({
                workedMinutes: probeMinutes,
                dayKind: probeDayKind,
                weekday: WEEKDAYS[today.getDay()],
                dateISO,
                branchId: scope?.branchId ?? null,
            });
            setOutcome(result);
        } catch {
            toast({ icon: 'error', title: 'Could not preview' });
        } finally {
            setPreviewing(false);
        }
    }, [probeMinutes, probeDayKind, scope?.branchId]);

    // The preview is the point of the screen, so keep it live rather than behind a button.
    useEffect(() => { if (open && !loading) void runPreview(); }, [open, loading, rules, runPreview]);

    const save = async () => {
        if (!draft?.name?.trim()) return;
        setSaving(true);
        try {
            if (draft.id) await updateDeductionRule(draft.id, draft);
            // A rule created while a branch is selected belongs to that branch.
            else await createDeductionRule({ ...draft, branchId: scope?.branchId ?? null });
            setDraft(null);
            await load();
            toast({ icon: 'success', title: draft.id ? 'Rule updated' : 'Rule created' });
        } catch (err: unknown) {
            toast({ icon: 'error', title: 'Could not save', text: apiDetail(err) ?? undefined });
        } finally {
            setSaving(false);
        }
    };

    const toggleEnabled = async (rule: DeductionRule) => {
        try {
            await updateDeductionRule(rule.id, { isEnabled: !rule.isEnabled });
            await load();
        } catch (err: unknown) {
            toast({ icon: 'error', title: 'Could not update', text: apiDetail(err) ?? undefined });
        }
    };

    const remove = async (rule: DeductionRule) => {
        const confirmed = await confirmDialog({
            title: 'Remove this rule?',
            text: `"${rule.name}" will stop applying. Days already paid are not recalculated.`,
            confirmText: 'Remove',
            danger: true,
        });
        if (!confirmed) return;
        try {
            await deleteDeductionRule(rule.id);
            await load();
            toast({ icon: 'success', title: 'Rule removed' });
        } catch (err: unknown) {
            toast({ icon: 'error', title: 'Could not remove', text: apiDetail(err) ?? undefined });
        }
    };

    const onReorder = async (next: DeductionRule[]) => {
        setRules(next); // optimistic — order drives evaluation sequence
        try {
            await reorderDeductionRules(next.map((r) => r.id));
        } catch {
            toast({ icon: 'error', title: 'Could not save the new order' });
            await load();
        }
    };

    const enabledCount = useMemo(() => rules.filter((r) => r.isEnabled).length, [rules]);

    const renderRule = (rule: DeductionRule, handleProps?: DragHandleProps) => (
        <GlassSurface variant="thin" sx={{ p: 1.25, mb: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1.25}>
                {/* The kit's grip — paired with ReorderableGroup, and keyboard-nudgeable,
                    which a bare styled div is not. */}
                {!readOnly && handleProps && (
                    <DragHandle handleProps={handleProps} disabled={readOnly} />
                )}
                <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Stack direction="row" spacing={0.75} alignItems="center">
                        <Typography noWrap sx={{ fontSize: 13, fontWeight: 700 }}>{rule.name}</Typography>
                        {rule.isSystem && <ToneChip tone="neutral" label="Migrated" dense />}
                        {!rule.capAtThreshold && <ToneChip tone="danger" label="Uncapped" dense />}
                    </Stack>
                    <Typography noWrap sx={{ fontSize: 11.5, color: 'text.secondary' }}>
                        Deduct {asDuration(rule.deductMinutes)} once past {asDuration(rule.thresholdMinutes)}
                        {' · '}{APPLIES_ON.find((a) => a.value === rule.appliesOn)?.label}
                        {rule.exemptHolidays && ' · no holidays'}
                        {rule.exemptWeekends && ' · no weekends'}
                    </Typography>
                </Box>
                <WtSwitch
                    size="sm"
                    checked={rule.isEnabled}
                    disabled={readOnly}
                    onChange={() => void toggleEnabled(rule)}
                    inputProps={{ 'aria-label': `Enable ${rule.name}` }}
                />
                {!readOnly && (
                    <>
                        <ActionIconButton
                            iconName="pencil" size="sm" title={`Edit ${rule.name}`}
                            onClick={() => setDraft({ ...rule })}
                        />
                        <ActionIconButton
                            iconName="trash" tone="danger" size="sm" title={`Remove ${rule.name}`}
                            onClick={() => { void remove(rule); }}
                        />
                    </>
                )}
            </Stack>
        </GlassSurface>
    );

    return (
        <GlassDialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            header={
                <GlassHeader
                    title="break deductions"
                    subtitle={scopeLabel
                        ? `${scopeLabel} — how much unpaid break time comes off a worked day`
                        : 'How much unpaid break time comes off a worked day, and when'}
                    icon={<KTIcon iconName="time" className="fs-1" />}
                    onClose={onClose}
                />
            }
        >
            <Box sx={{ p: { xs: 2, sm: 2.75 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {loading ? (
                    <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress size={28} /></Stack>
                ) : (
                    <>
                        <Grid container spacing={{ xs: 1.25, sm: 2 }}>
                            <Grid item xs={6} md={4}>
                                <StatTile label="Rules" value={rules.length} trio={TRIO.blue} icon="abstract-26" />
                            </Grid>
                            <Grid item xs={6} md={4}>
                                <StatTile label="Active" value={enabledCount} trio={TRIO.green} icon="check" />
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <StatTile
                                    label="Credited for the probe"
                                    value={outcome ? asDuration(outcome.netMinutes) : '—'}
                                    trio={TRIO.amber} icon="time"
                                />
                            </Grid>
                        </Grid>

                        {/* ── Preview ─────────────────────────────────────────────── */}
                        <SettingsSection
                            tone={TRIO.cyan}
                            icon="abstract-26"
                            title="what would a day be credited?"
                            description="Evaluated by the server, using the same engine payroll runs — so this is what the payslip will say."
                        >
                            <Stack spacing={1.25}>
                                <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr auto' }, alignItems: 'center' }}>
                                    <TextField
                                        select size="small" label="Worked"
                                        value={probeMinutes}
                                        onChange={(e) => setProbeMinutes(Number(e.target.value))}
                                    >
                                        {[240, 290, 300, 301, 330, 360, 480, 540, 600].map((m) => (
                                            <MenuItem key={m} value={m}>{asDuration(m)}</MenuItem>
                                        ))}
                                    </TextField>
                                    <TextField
                                        select size="small" label="Day"
                                        value={probeDayKind}
                                        onChange={(e) => setProbeDayKind(e.target.value as DayKind)}
                                    >
                                        {DAY_KINDS.map((k) => (
                                            <MenuItem key={k} value={k}>{k}</MenuItem>
                                        ))}
                                    </TextField>
                                    <WtButton inverted onClick={() => void runPreview()} disabled={previewing}>
                                        {previewing ? 'Checking…' : 'refresh'}
                                    </WtButton>
                                </Box>

                                {outcome && (
                                    <GlassSurface variant="thin" sx={{ p: 1.5 }}>
                                        <Eyebrow>result</Eyebrow>
                                        <Typography sx={{ fontSize: 13, mt: 0.75 }}>
                                            Worked <b>{asDuration(probeMinutes)}</b> · deducted{' '}
                                            <b>{asDuration(outcome.totalMinutes)}</b> · credited{' '}
                                            <b>{asDuration(outcome.netMinutes)}</b>
                                        </Typography>
                                        {outcome.applied.map((a) => (
                                            <Typography key={a.ruleId} sx={{ fontSize: 12.5, color: TRIO.amber.c }}>
                                                − {asDuration(a.minutes)} · {a.ruleName}
                                            </Typography>
                                        ))}
                                        {outcome.skipped.map((s) => (
                                            <Typography key={s.ruleId + s.reason} sx={{ fontSize: 12, color: 'text.secondary' }}>
                                                skipped {s.ruleName} — {s.reason}
                                            </Typography>
                                        ))}
                                        {!outcome.applied.length && !outcome.skipped.length && (
                                            <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                                                No rule matched this day — the full time is credited.
                                            </Typography>
                                        )}
                                    </GlassSurface>
                                )}
                            </Stack>
                        </SettingsSection>

                        {/* ── Rules ───────────────────────────────────────────────── */}
                        <SettingsSection
                            tone={TRIO.blue}
                            icon="abstract-26"
                            title="rules"
                            description="Every matching rule applies, top to bottom. Drag to change the order."
                            action={
                                !readOnly && (
                                    <WtButton onClick={() => setDraft(blankRule())}>add rule</WtButton>
                                )
                            }
                        >
                            {!rules.length ? (
                                <Typography sx={{ fontSize: 13, color: 'text.secondary', py: 1 }}>
                                    No rules — no break time is deducted from any day.
                                </Typography>
                            ) : readOnly ? (
                                <Box>{rules.map((r) => <Box key={r.id}>{renderRule(r)}</Box>)}</Box>
                            ) : (
                                <ReorderableGroup
                                    items={rules}
                                    getItemId={(r: DeductionRule) => r.id}
                                    axis="y"
                                    withHandle
                                    onReorder={(next: DeductionRule[]) => { void onReorder(next); }}
                                    renderItem={(r: DeductionRule, handleProps?: DragHandleProps) =>
                                        renderRule(r, handleProps)}
                                />
                            )}
                        </SettingsSection>

                        {/* ── Editor ──────────────────────────────────────────────── */}
                        {draft && (
                            <SettingsSection
                                tone={TRIO.purple}
                                icon="pencil"
                                title={draft.id ? 'edit rule' : 'new rule'}
                                description="Threshold and duration are yours to set; applicability decides which days it touches."
                            >
                                <Stack spacing={1.25}>
                                    <TextField
                                        size="small" label="Name" required fullWidth
                                        placeholder="e.g. Lunch break"
                                        value={draft.name ?? ''}
                                        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                                    />
                                    <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                                        <TextField
                                            size="small" type="number" label="Deduct after (minutes worked)"
                                            value={draft.thresholdMinutes ?? 0}
                                            onChange={(e) => setDraft({ ...draft, thresholdMinutes: Number(e.target.value) })}
                                            helperText={`= ${asDuration(Number(draft.thresholdMinutes) || 0)}`}
                                        />
                                        <TextField
                                            size="small" type="number" label="Deduct (minutes)" required
                                            value={draft.deductMinutes ?? 0}
                                            onChange={(e) => setDraft({ ...draft, deductMinutes: Number(e.target.value) })}
                                            helperText={`= ${asDuration(Number(draft.deductMinutes) || 0)}`}
                                        />
                                    </Box>
                                    <TextField
                                        select size="small" label="Applies on" fullWidth
                                        value={draft.appliesOn ?? 'all'}
                                        onChange={(e) => setDraft({ ...draft, appliesOn: e.target.value as AppliesOn })}
                                        helperText={APPLIES_ON.find((a) => a.value === (draft.appliesOn ?? 'all'))?.hint}
                                    >
                                        {APPLIES_ON.map((a) => (
                                            <MenuItem key={a.value} value={a.value}>{a.label}</MenuItem>
                                        ))}
                                    </TextField>

                                    {([
                                        ['exemptHolidays', 'Never on public holidays'],
                                        ['exemptWeekends', 'Never on weekends'],
                                        ['waiveIfBreakPunched', 'Skip when the employee punched out for a break'],
                                        ['capAtThreshold', 'Never credit less for working longer'],
                                    ] as Array<[keyof DeductionRule, string]>).map(([key, label]) => (
                                        <Stack key={String(key)} direction="row" alignItems="center" spacing={1}>
                                            <WtSwitch
                                                size="sm"
                                                checked={Boolean(draft[key])}
                                                onChange={(e) => setDraft({ ...draft, [key]: e.target.checked })}
                                                inputProps={{ 'aria-label': label }}
                                            />
                                            <Typography sx={{ fontSize: 13 }}>{label}</Typography>
                                        </Stack>
                                    ))}

                                    <Stack direction="row" spacing={1}>
                                        <WtButton onClick={() => void save()} disabled={saving || !draft.name?.trim()}>
                                            {saving ? 'Saving…' : 'save rule'}
                                        </WtButton>
                                        <WtButton ghost onClick={() => setDraft(null)}>cancel</WtButton>
                                    </Stack>
                                </Stack>
                            </SettingsSection>
                        )}
                    </>
                )}
            </Box>
        </GlassDialog>
    );
}

/**
 * The server puts human-readable failure text in `detail` (see backend `response.ts`),
 * not `message` — a locked-period or validation refusal names the reason, and that is
 * the whole value of it, so it must reach the toast intact.
 */
function apiDetail(err: unknown): string | null {
    const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
    return typeof detail === 'string' && detail.trim() ? detail : null;
}
