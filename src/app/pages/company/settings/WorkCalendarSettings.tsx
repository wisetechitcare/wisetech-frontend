import { useCallback, useEffect, useMemo, useState } from "react";
import { Box, Grid, TextField, MenuItem, Stack, Typography, CircularProgress } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import {
    TRIO, WtButton, GlassDialog, GlassHeader, GlassSurface,
    SettingsSection, StatTile, ToneChip, Eyebrow, ActionIconButton,
    WtDateField, toast, confirmDialog,
} from "@app/modules/common/components/ui";
import {
    fetchWorkCalendars,
    replaceCalendarRules,
    fetchCalendarExceptions,
    createCalendarException,
    deleteCalendarException,
    bulkGenerateExceptions,
    type WorkCalendar,
    type WorkCalendarException,
    type ExceptionKind,
    type BulkGenerateResult,
} from "@services/workCalendar";
import { formatDate } from "@utils/dateFormats";

/**
 * WORK CALENDAR — the configuration surface.
 *
 * Everything on this screen is DATA. Not one line decides what a day means: the server's
 * `workCalendar` service owns that and is shared with payroll, KPI and the attendance
 * boards. Re-deriving a weekend here is precisely what produced red late marks on days
 * the backend had already exempted.
 *
 * The two workflows it is built around, in the order they actually happen:
 *   1. GENERATE a year's recurring off-days once ("every 2nd and 4th Saturday of 2027"),
 *      replacing ~24 rows of hand entry that nobody remembers to do — which is why 2026
 *      currently has four.
 *   2. MOVE one of them when the business needs that Saturday. Generation is a starting
 *      point, not a policy, so an adjustment is an ordinary edit rather than an exception
 *      to the design.
 */

interface Props {
    open: boolean;
    onClose: () => void;
    readOnly?: boolean;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** How a weekday behaves. 'alternate' is the case the old JSON blob could not express. */
type DayMode = 'working' | 'off' | 'alternate';

const OCCURRENCES = [
    { value: 'nth:1', label: '1st' },
    { value: 'nth:2', label: '2nd' },
    { value: 'nth:3', label: '3rd' },
    { value: 'nth:4', label: '4th' },
    { value: 'nth:5', label: '5th' },
    { value: 'last', label: 'Last' },
];

const KIND_TONE: Record<ExceptionKind, { trio: typeof TRIO.blue; label: string; icon: string }> = {
    holiday: { trio: TRIO.purple, label: 'Holiday', icon: 'calendar-tick' },
    off_day: { trio: TRIO.amber, label: 'Off Day', icon: 'calendar-remove' },
    working_day: { trio: TRIO.green, label: 'Working Day', icon: 'calendar-add' },
};

interface DayConfig { mode: DayMode; occurrences: string[] }

/** Server rules → one row per weekday, the shape a human edits. */
function rulesToConfig(calendar: WorkCalendar | null): DayConfig[] {
    return WEEKDAYS.map((_, weekday) => {
        const rules = (calendar?.rules ?? []).filter((r) => r.weekday === weekday);
        if (!rules.length) return { mode: 'working' as DayMode, occurrences: [] };

        const base = rules.find((r) => (r.weekParity ?? 'every') === 'every');
        const parityOff = rules.filter((r) => (r.weekParity ?? 'every') !== 'every' && !r.isWorking);

        if (parityOff.length) {
            return { mode: 'alternate', occurrences: parityOff.map((r) => r.weekParity) };
        }
        return { mode: base && !base.isWorking ? 'off' : 'working', occurrences: [] };
    });
}

/** One row per weekday → the flat rule list the API takes. */
function configToRules(config: DayConfig[]) {
    return config.flatMap((day, weekday) => {
        if (day.mode === 'working') return [{ weekday, isWorking: true, weekParity: 'every' }];
        if (day.mode === 'off') return [{ weekday, isWorking: false, weekParity: 'every' }];
        // Alternate: works by default, off on the chosen occurrences.
        return [
            { weekday, isWorking: true, weekParity: 'every' },
            ...day.occurrences.map((weekParity) => ({ weekday, isWorking: false, weekParity })),
        ];
    });
}

export default function WorkCalendarSettings({ open, onClose, readOnly = false }: Props) {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [calendars, setCalendars] = useState<WorkCalendar[]>([]);
    const [calendarId, setCalendarId] = useState<string>('');
    const [dayConfig, setDayConfig] = useState<DayConfig[]>(rulesToConfig(null));
    const [year, setYear] = useState<number>(new Date().getFullYear());
    const [exceptions, setExceptions] = useState<WorkCalendarException[]>([]);

    // Add-exception form
    const [newDate, setNewDate] = useState('');
    const [newName, setNewName] = useState('');
    const [newKind, setNewKind] = useState<ExceptionKind>('off_day');

    // Bulk generate
    const [genWeekday, setGenWeekday] = useState(6);
    const [genOccurrences, setGenOccurrences] = useState<string[]>(['nth:2', 'nth:4']);
    const [preview, setPreview] = useState<BulkGenerateResult | null>(null);
    const [previewing, setPreviewing] = useState(false);

    const loadExceptions = useCallback(async (id: string, forYear: number) => {
        const rows = await fetchCalendarExceptions({
            calendarId: id || null,
            from: `${forYear}-01-01`,
            to: `${forYear}-12-31`,
        });
        setExceptions(rows);
    }, []);

    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const list = await fetchWorkCalendars();
                if (cancelled) return;
                setCalendars(list);
                const first = list[0]?.id ?? '';
                setCalendarId(first);
                setDayConfig(rulesToConfig(list[0] ?? null));
                await loadExceptions(first, year);
            } catch {
                if (!cancelled) toast({ icon: 'error', title: 'Could not load work calendars' });
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
        // `year` intentionally excluded — the year picker reloads exceptions on its own,
        // and including it here would re-fetch the whole calendar list on every change.
    }, [open, loadExceptions]); // eslint-disable-line react-hooks/exhaustive-deps

    const onCalendarChange = (id: string) => {
        setCalendarId(id);
        setDayConfig(rulesToConfig(calendars.find((c) => c.id === id) ?? null));
        setPreview(null);
        loadExceptions(id, year).catch(() => toast({ icon: 'error', title: 'Could not load exceptions' }));
    };

    const onYearChange = (next: number) => {
        setYear(next);
        setPreview(null);
        loadExceptions(calendarId, next).catch(() => toast({ icon: 'error', title: 'Could not load exceptions' }));
    };

    const setDay = (weekday: number, patch: Partial<DayConfig>) =>
        setDayConfig((prev) => prev.map((d, i) => (i === weekday ? { ...d, ...patch } : d)));

    const saveWeeklyPattern = async () => {
        if (!calendarId) return;
        setSaving(true);
        try {
            const updated = await replaceCalendarRules(calendarId, configToRules(dayConfig));
            if (updated) {
                setCalendars((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
            }
            toast({ icon: 'success', title: 'Weekly pattern saved' });
        } catch (err: unknown) {
            // The server refuses an edit that reaches a LOCKED payroll month and names it;
            // surface that verbatim rather than a generic failure.
            toast({ icon: 'error', title: 'Could not save', text: apiDetail(err) ?? 'The weekly pattern was not saved' });
        } finally {
            setSaving(false);
        }
    };

    const addException = async () => {
        if (!newDate || !newName.trim()) return;
        setSaving(true);
        try {
            await createCalendarException({
                calendarId: calendarId || null,
                name: newName.trim(),
                dateFrom: newDate,
                kind: newKind,
            });
            setNewDate(''); setNewName('');
            await loadExceptions(calendarId, year);
            toast({ icon: 'success', title: 'Calendar exception added' });
        } catch (err: unknown) {
            toast({ icon: 'error', title: 'Could not add', text: apiDetail(err) ?? 'The exception was not added' });
        } finally {
            setSaving(false);
        }
    };

    const removeException = async (row: WorkCalendarException) => {
        const confirmed = await confirmDialog({
            title: 'Remove this day?',
            text: `${row.name} on ${formatDate(row.dateFrom)} will no longer override the weekly pattern.`,
            confirmText: 'Remove',
            danger: true,
        });
        if (!confirmed) return;
        try {
            await deleteCalendarException(row.id);
            await loadExceptions(calendarId, year);
            toast({ icon: 'success', title: 'Removed' });
        } catch (err: unknown) {
            toast({ icon: 'error', title: 'Could not remove', text: apiDetail(err) ?? 'The exception was not removed' });
        }
    };

    const runPreview = async () => {
        setPreviewing(true);
        try {
            const result = await bulkGenerateExceptions({
                calendarId: calendarId || null,
                year,
                weekday: genWeekday,
                parities: genOccurrences,
                kind: 'off_day',
                name: WEEKDAYS[genWeekday],
                dryRun: true,
            });
            setPreview(result);
        } catch (err: unknown) {
            toast({ icon: 'error', title: 'Could not preview', text: apiDetail(err) ?? undefined });
        } finally {
            setPreviewing(false);
        }
    };

    const applyGenerate = async () => {
        setSaving(true);
        try {
            const result = await bulkGenerateExceptions({
                calendarId: calendarId || null,
                year,
                weekday: genWeekday,
                parities: genOccurrences,
                kind: 'off_day',
                name: WEEKDAYS[genWeekday],
            });
            setPreview(null);
            await loadExceptions(calendarId, year);
            toast({ icon: 'success', title: `${result.created} day${result.created === 1 ? '' : 's'} added` });
        } catch (err: unknown) {
            toast({ icon: 'error', title: 'Could not generate', text: apiDetail(err) ?? undefined });
        } finally {
            setSaving(false);
        }
    };

    const counts = useMemo(() => ({
        offDay: exceptions.filter((e) => e.kind === 'off_day').length,
        holiday: exceptions.filter((e) => e.kind === 'holiday').length,
        workingDay: exceptions.filter((e) => e.kind === 'working_day').length,
    }), [exceptions]);

    return (
        <GlassDialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            header={
                <GlassHeader
                    title="work calendar"
                    subtitle="Weekly pattern and the one-off days that override it"
                    icon={<KTIcon iconName="calendar-8" className="fs-1" />}
                    onClose={onClose}
                />
            }
        >
            <Box sx={{ p: { xs: 2, sm: 2.75 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {loading ? (
                    <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress size={28} /></Stack>
                ) : !calendars.length ? (
                    <GlassSurface variant="thin" sx={{ p: 3, textAlign: 'center' }}>
                        <Typography sx={{ fontSize: 13.5, color: 'text.secondary' }}>
                            No work calendar exists yet. Run the backfill script to create one per
                            branch from the current weekly pattern and holiday list.
                        </Typography>
                    </GlassSurface>
                ) : (
                    <>
                        <Grid container spacing={{ xs: 1.25, sm: 2 }}>
                            <Grid item xs={6} md={3}>
                                <StatTile label="Off Days" value={counts.offDay} trio={TRIO.amber} icon="calendar-remove" />
                            </Grid>
                            <Grid item xs={6} md={3}>
                                <StatTile label="Holidays" value={counts.holiday} trio={TRIO.purple} icon="calendar-tick" />
                            </Grid>
                            <Grid item xs={6} md={3}>
                                <StatTile label="Working Days Added" value={counts.workingDay} trio={TRIO.green} icon="calendar-add" />
                            </Grid>
                            <Grid item xs={6} md={3}>
                                <StatTile label="Calendars" value={calendars.length} trio={TRIO.blue} icon="calendar-8" />
                            </Grid>
                        </Grid>

                        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                            <TextField
                                select size="small" fullWidth label="Calendar"
                                value={calendarId} onChange={(e) => onCalendarChange(e.target.value)}
                            >
                                {calendars.map((c) => (
                                    <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                select size="small" fullWidth label="Year"
                                value={year} onChange={(e) => onYearChange(Number(e.target.value))}
                            >
                                {[year - 1, year, year + 1, year + 2].map((y) => (
                                    <MenuItem key={y} value={y}>{y}</MenuItem>
                                ))}
                            </TextField>
                        </Box>

                        {/* ── Weekly pattern ─────────────────────────────────────────── */}
                        <SettingsSection
                            tone={TRIO.blue}
                            icon="calendar"
                            title="weekly pattern"
                            description="The default week. 'Alternate' covers 2nd/4th Saturday style rules — one rule, not 24 rows a year."
                            action={
                                !readOnly && (
                                    <WtButton onClick={saveWeeklyPattern} disabled={saving}>
                                        {saving ? 'Saving…' : 'save pattern'}
                                    </WtButton>
                                )
                            }
                        >
                            <Stack spacing={1}>
                                {WEEKDAYS.map((name, weekday) => {
                                    const day = dayConfig[weekday];
                                    return (
                                        <GlassSurface key={name} variant="thin" sx={{ p: 1.25 }}>
                                            <Box sx={{
                                                display: 'grid', gap: 1, alignItems: 'center',
                                                gridTemplateColumns: { xs: '1fr', sm: '120px 150px 1fr' },
                                            }}>
                                                <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{name}</Typography>
                                                <TextField
                                                    select size="small" value={day.mode} disabled={readOnly}
                                                    onChange={(e) => setDay(weekday, {
                                                        mode: e.target.value as DayMode,
                                                        occurrences: e.target.value === 'alternate' ? (day.occurrences.length ? day.occurrences : ['nth:2', 'nth:4']) : [],
                                                    })}
                                                >
                                                    <MenuItem value="working">Working</MenuItem>
                                                    <MenuItem value="off">Off</MenuItem>
                                                    <MenuItem value="alternate">Alternate</MenuItem>
                                                </TextField>
                                                {day.mode === 'alternate' && (
                                                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                                                        {OCCURRENCES.map((occ) => {
                                                            const on = day.occurrences.includes(occ.value);
                                                            const toggle = () => setDay(weekday, {
                                                                occurrences: on
                                                                    ? day.occurrences.filter((o) => o !== occ.value)
                                                                    : [...day.occurrences, occ.value],
                                                            });
                                                            return (
                                                                <ToneChip
                                                                    key={occ.value}
                                                                    tone={on ? 'warning' : 'neutral'}
                                                                    label={occ.label}
                                                                    aria-pressed={on}
                                                                    aria-label={`${occ.label} ${name} off`}
                                                                    onClick={readOnly ? undefined : toggle}
                                                                />
                                                            );
                                                        })}
                                                    </Stack>
                                                )}
                                            </Box>
                                        </GlassSurface>
                                    );
                                })}
                            </Stack>
                        </SettingsSection>

                        {/* ── Generate a year ────────────────────────────────────────── */}
                        {!readOnly && (
                            <SettingsSection
                                tone={TRIO.cyan}
                                icon="abstract-26"
                                title={`generate ${year} off days`}
                                description="Creates the recurring days in one go. Always previews first — nothing is written until you apply."
                            >
                                <Stack spacing={1.25}>
                                    <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: '1fr 2fr auto' }, alignItems: 'center' }}>
                                        <TextField
                                            select size="small" label="Weekday" value={genWeekday}
                                            onChange={(e) => { setGenWeekday(Number(e.target.value)); setPreview(null); }}
                                        >
                                            {WEEKDAYS.map((n, i) => <MenuItem key={n} value={i}>{n}</MenuItem>)}
                                        </TextField>
                                        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                                            {OCCURRENCES.map((occ) => {
                                                const on = genOccurrences.includes(occ.value);
                                                return (
                                                    <ToneChip
                                                        key={occ.value}
                                                        tone={on ? 'cyan' : 'neutral'}
                                                        label={occ.label}
                                                        onClick={() => {
                                                            setPreview(null);
                                                            setGenOccurrences(on
                                                                ? genOccurrences.filter((o) => o !== occ.value)
                                                                : [...genOccurrences, occ.value]);
                                                        }}
                                                    />
                                                );
                                            })}
                                        </Stack>
                                        <WtButton
                                            inverted
                                            onClick={runPreview}
                                            disabled={previewing || !genOccurrences.length}
                                        >
                                            {previewing ? 'Checking…' : 'preview'}
                                        </WtButton>
                                    </Box>

                                    {preview && (
                                        <GlassSurface variant="thin" sx={{ p: 1.5 }}>
                                            <Eyebrow>impact</Eyebrow>
                                            <Stack spacing={0.5} sx={{ mt: 0.75 }}>
                                                <Typography sx={{ fontSize: 13 }}>
                                                    <b>{preview.toCreate.length}</b> day{preview.toCreate.length === 1 ? '' : 's'} to add
                                                    {preview.skipped > 0 && <> · {preview.skipped} already set</>}
                                                    {' '}· affects <b>{preview.impact.employeeCount}</b> employees
                                                </Typography>
                                                {preview.impact.lockedPeriods.length > 0 && (
                                                    <Typography sx={{ fontSize: 12.5, color: TRIO.rose.c, fontWeight: 700 }}>
                                                        <KTIcon iconName="shield-tick" className="fs-7 me-1" />
                                                        Payroll is LOCKED for{' '}
                                                        {preview.impact.lockedPeriods
                                                            .map((p) => `${String(p.month).padStart(2, '0')}/${p.year}`)
                                                            .join(', ')} — those months will be refused.
                                                    </Typography>
                                                )}
                                                {preview.impact.affectedLeaves.length > 0 && (
                                                    <Typography sx={{ fontSize: 12.5, color: TRIO.amber.c }}>
                                                        <KTIcon iconName="information-5" className="fs-7 me-1" />
                                                        {preview.impact.affectedLeaves.length} approved leave
                                                        {preview.impact.affectedLeaves.length === 1 ? '' : 's'} overlap these dates —
                                                        their balances will be recalculated.
                                                    </Typography>
                                                )}
                                                {preview.toCreate.length > 0 && (
                                                    <Typography sx={{ fontSize: 12, color: 'text.secondary', wordBreak: 'break-word' }}>
                                                        {preview.toCreate.map((d) => formatDate(d)).join(' · ')}
                                                    </Typography>
                                                )}
                                            </Stack>
                                            <Stack direction="row" spacing={1} sx={{ mt: 1.25 }}>
                                                <WtButton onClick={applyGenerate} disabled={saving || !preview.toCreate.length}>
                                                    {saving ? 'Applying…' : `apply ${preview.toCreate.length} days`}
                                                </WtButton>
                                                <WtButton ghost onClick={() => setPreview(null)}>cancel</WtButton>
                                            </Stack>
                                        </GlassSurface>
                                    )}
                                </Stack>
                            </SettingsSection>
                        )}

                        {/* ── Exceptions ─────────────────────────────────────────────── */}
                        <SettingsSection
                            tone={TRIO.amber}
                            icon="calendar-edit"
                            title={`${year} exceptions`}
                            description="Days that override the weekly pattern. Move one whenever the business needs that day."
                            action={<ToneChip tone="warning" label={`${exceptions.length}`} />}
                        >
                            <Stack spacing={1}>
                                {!readOnly && (
                                    <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: '160px 1fr 150px auto' }, alignItems: 'center' }}>
                                        <WtDateField
                                            label="Date" value={newDate} onChange={setNewDate}
                                            minDate={`${year}-01-01`} maxDate={`${year}-12-31`}
                                        />
                                        <TextField
                                            size="small" label="Name" placeholder="e.g. Saturday"
                                            value={newName} onChange={(e) => setNewName(e.target.value)}
                                        />
                                        <TextField
                                            select size="small" label="Kind" value={newKind}
                                            onChange={(e) => setNewKind(e.target.value as ExceptionKind)}
                                        >
                                            {(Object.keys(KIND_TONE) as ExceptionKind[]).map((k) => (
                                                <MenuItem key={k} value={k}>{KIND_TONE[k].label}</MenuItem>
                                            ))}
                                        </TextField>
                                        <WtButton onClick={addException} disabled={saving || !newDate || !newName.trim()}>
                                            add
                                        </WtButton>
                                    </Box>
                                )}

                                {!exceptions.length ? (
                                    <Typography sx={{ fontSize: 13, color: 'text.secondary', py: 1 }}>
                                        No exceptions for {year}. Generate the recurring days above, or add one by hand.
                                    </Typography>
                                ) : (
                                    exceptions.map((row) => {
                                        const tone = KIND_TONE[row.kind] ?? KIND_TONE.holiday;
                                        return (
                                            <GlassSurface key={row.id} variant="thin" sx={{ p: 1.1 }}>
                                                <Stack direction="row" alignItems="center" spacing={1.25}>
                                                    <KTIcon iconName={tone.icon} className="fs-3" />
                                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                                        <Typography noWrap sx={{ fontSize: 13, fontWeight: 700 }}>
                                                            {row.name}
                                                        </Typography>
                                                        <Typography noWrap sx={{ fontSize: 11.5, color: 'text.secondary' }}>
                                                            {formatDate(row.dateFrom)}
                                                            {row.dateTo ? ` → ${formatDate(row.dateTo)}` : ''}
                                                        </Typography>
                                                    </Box>
                                                    <ToneChip color={tone.trio.c} label={tone.label} dense />
                                                    {!readOnly && (
                                                        <ActionIconButton
                                                            iconName="trash"
                                                            tone="danger"
                                                            size="sm"
                                                            title={`Remove ${row.name}`}
                                                            onClick={() => { void removeException(row); }}
                                                        />
                                                    )}
                                                </Stack>
                                            </GlassSurface>
                                        );
                                    })
                                )}
                            </Stack>
                        </SettingsSection>
                    </>
                )}
            </Box>
        </GlassDialog>
    );
}

/**
 * The server puts human-readable failure text in `detail` (see backend `response.ts`),
 * not `message` — the locked-payroll refusal names the exact period, and that is the
 * whole value of the guard, so it must reach the toast intact.
 */
function apiDetail(err: unknown): string | null {
    const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
    return typeof detail === 'string' && detail.trim() ? detail : null;
}
