import { useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import InputAdornment from '@mui/material/InputAdornment';
import Popover from '@mui/material/Popover';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { KTIcon } from '@metronic/helpers';
import type { EmployeeOption } from '@app/modules/common/components/EmployeeSelectionDialog';

/**
 * One-line people control for dense panels: avatar stack + count opens a
 * searchable checkbox list. Avoids Autocomplete chip walls in small dialogs.
 */
export function CompactPeoplePicker({
    label = 'Send approval to people',
    value,
    onChange,
    employees,
    loading,
    disabled,
    hint,
}: {
    label?: string;
    value: string[];
    onChange: (ids: string[]) => void;
    employees: EmployeeOption[];
    loading?: boolean;
    disabled?: boolean;
    hint?: string;
}) {
    const anchorRef = useRef<HTMLDivElement | null>(null);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [draft, setDraft] = useState<string[]>(value);

    const byId = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
    const selected = useMemo(
        () => value.map((id) => byId.get(id)).filter((e): e is EmployeeOption => !!e),
        [value, byId],
    );

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        const list = !q
            ? employees
            : employees.filter((e) => {
                const code = (e.employeeCode ?? '').toLowerCase();
                const name = e.name.toLowerCase();
                const desig = (e.designation ?? '').toLowerCase();
                return name.includes(q) || code.includes(q) || desig.includes(q);
            });
        // Selected first so removals are easy without scrolling the whole directory.
        return [...list].sort((a, b) => {
            const aOn = draft.includes(a.id) ? 0 : 1;
            const bOn = draft.includes(b.id) ? 0 : 1;
            if (aOn !== bOn) return aOn - bOn;
            return a.name.localeCompare(b.name);
        });
    }, [employees, query, draft]);

    const openPicker = () => {
        if (disabled) return;
        setDraft(value);
        setQuery('');
        setOpen(true);
    };

    const commit = () => {
        onChange(draft);
        setOpen(false);
    };

    const toggle = (id: string) => {
        setDraft((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const preview = selected.slice(0, 3);
    const extra = Math.max(0, selected.length - preview.length);

    return (
        <Box sx={{ width: '100%', minWidth: 0 }}>
            <Box
                ref={anchorRef}
                role="button"
                tabIndex={disabled ? -1 : 0}
                aria-label={label}
                aria-expanded={open}
                onClick={openPicker}
                onKeyDown={(e) => {
                    if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        openPicker();
                    }
                }}
                sx={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    minHeight: 40,
                    px: 1.25,
                    py: 0.5,
                    borderRadius: '10px',
                    border: '1px solid',
                    borderColor: open ? 'primary.main' : 'divider',
                    bgcolor: disabled ? 'action.disabledBackground' : 'background.paper',
                    cursor: disabled ? 'default' : 'pointer',
                    opacity: disabled ? 0.65 : 1,
                    transition: 'border-color .15s',
                    '&:hover': disabled ? undefined : { borderColor: 'text.disabled' },
                    '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 1 },
                }}
            >
                <Typography
                    component="span"
                    sx={{
                        position: 'absolute',
                        top: -8,
                        left: 10,
                        px: 0.5,
                        fontSize: 12,
                        lineHeight: 1,
                        bgcolor: 'background.paper',
                        color: 'text.secondary',
                    }}
                >
                    {label}
                </Typography>

                <KTIcon iconName="profile-circle" className="fs-5 text-muted" />

                {selected.length === 0 ? (
                    <Typography sx={{ flex: 1, minWidth: 0, fontSize: 13.5, color: 'text.disabled' }}>
                        {loading ? 'Loading people…' : 'None selected'}
                    </Typography>
                ) : (
                    <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', pl: 0.25 }}>
                            {preview.map((e, i) => (
                                <Box
                                    key={e.id}
                                    component="img"
                                    src={e.avatar}
                                    alt=""
                                    title={e.employeeCode ? `${e.employeeCode} · ${e.name}` : e.name}
                                    sx={{
                                        width: 24,
                                        height: 24,
                                        borderRadius: '50%',
                                        objectFit: 'cover',
                                        border: '2px solid',
                                        borderColor: 'background.paper',
                                        ml: i === 0 ? 0 : -0.75,
                                        bgcolor: 'action.hover',
                                    }}
                                />
                            ))}
                            {extra > 0 && (
                                <Box
                                    sx={{
                                        width: 24,
                                        height: 24,
                                        borderRadius: '50%',
                                        ml: -0.75,
                                        border: '2px solid',
                                        borderColor: 'background.paper',
                                        bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
                                        color: 'primary.dark',
                                        fontSize: 10,
                                        fontWeight: 700,
                                        display: 'grid',
                                        placeItems: 'center',
                                    }}
                                >
                                    +{extra}
                                </Box>
                            )}
                        </Box>
                        <Typography noWrap sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary', minWidth: 0 }}>
                            {selected.length === 1
                                ? (selected[0].employeeCode
                                    ? `${selected[0].employeeCode} · ${selected[0].name}`
                                    : selected[0].name)
                                : `${selected.length} people`}
                        </Typography>
                    </Box>
                )}

                <KTIcon iconName="down" className="fs-6 text-muted" />
            </Box>

            {hint ? (
                <Typography sx={{ mt: 0.5, fontSize: 11.5, color: 'text.secondary', lineHeight: 1.4 }}>
                    {hint}
                </Typography>
            ) : null}

            <Popover
                open={open}
                anchorEl={anchorRef.current}
                onClose={() => setOpen(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                slotProps={{
                    paper: {
                        sx: {
                            mt: 0.75,
                            width: anchorRef.current?.offsetWidth ?? 320,
                            maxWidth: 'calc(100vw - 32px)',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            boxShadow: '0 12px 40px rgba(15, 23, 42, 0.16)',
                        },
                    },
                }}
            >
                <Box sx={{ p: 1.25, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <TextField
                        autoFocus
                        fullWidth
                        size="small"
                        placeholder="Search code or name…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <KTIcon iconName="magnifier" className="fs-6 text-muted" />
                                </InputAdornment>
                            ),
                        }}
                    />
                </Box>

                <Box sx={{ maxHeight: 260, overflowY: 'auto', py: 0.5 }}>
                    {filtered.length === 0 ? (
                        <Typography sx={{ px: 1.5, py: 2, fontSize: 13, color: 'text.secondary' }}>
                            No matches
                        </Typography>
                    ) : (
                        filtered.map((e) => {
                            const on = draft.includes(e.id);
                            const line = e.employeeCode ? `${e.employeeCode} · ${e.name}` : e.name;
                            return (
                                <Box
                                    key={e.id}
                                    component="button"
                                    type="button"
                                    onClick={() => toggle(e.id)}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                        width: '100%',
                                        border: 0,
                                        bgcolor: on ? (t) => alpha(t.palette.primary.main, 0.08) : 'transparent',
                                        px: 1.25,
                                        py: 0.75,
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, on ? 0.12 : 0.05) },
                                    }}
                                >
                                    <Box
                                        component="img"
                                        src={e.avatar}
                                        alt=""
                                        sx={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                                    />
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography noWrap sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary' }}>
                                            {line}
                                        </Typography>
                                        {e.designation ? (
                                            <Typography noWrap sx={{ fontSize: 11.5, color: 'text.secondary' }}>
                                                {e.designation}
                                            </Typography>
                                        ) : null}
                                    </Box>
                                    <Checkbox size="small" checked={on} tabIndex={-1} disableRipple sx={{ p: 0.25 }} />
                                </Box>
                            );
                        })
                    )}
                </Box>

                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1,
                        px: 1.25,
                        py: 1,
                        borderTop: '1px solid',
                        borderColor: 'divider',
                        bgcolor: (t) => alpha(t.palette.grey[500], 0.04),
                    }}
                >
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                        {draft.length} selected
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.75 }}>
                        <Box
                            component="button"
                            type="button"
                            onClick={() => setDraft([])}
                            sx={{
                                border: 0,
                                bgcolor: 'transparent',
                                color: 'text.secondary',
                                fontSize: 12.5,
                                fontWeight: 600,
                                cursor: 'pointer',
                                px: 1,
                                py: 0.5,
                                borderRadius: '8px',
                                '&:hover': { bgcolor: 'action.hover' },
                            }}
                        >
                            Clear
                        </Box>
                        <Box
                            component="button"
                            type="button"
                            onClick={commit}
                            sx={{
                                border: 0,
                                bgcolor: 'primary.main',
                                color: 'primary.contrastText',
                                fontSize: 12.5,
                                fontWeight: 700,
                                cursor: 'pointer',
                                px: 1.5,
                                py: 0.5,
                                borderRadius: '8px',
                                '&:hover': { bgcolor: 'primary.dark' },
                            }}
                        >
                            Done
                        </Box>
                    </Box>
                </Box>
            </Popover>
        </Box>
    );
}

export default CompactPeoplePicker;
