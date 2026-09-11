import { useEffect, useRef, useState } from 'react';
import { Box, CircularProgress, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import {
    GlassDialog, GlassHeader, WtButton, WtColorPicker, resolveSwatchHex, toast,
} from '@app/modules/common/components/ui';
import { setMyLeadReminder } from '@services/leadService';
// The API puts its reason in `detail`; `message` is the generic "Bad request". Reading the
// wrong one turns "Reminder cannot exceed 500 characters" into a shrug.
import { apiErrorMessage } from '@app/pages/employee/tasks/taskDomain';

/**
 * The reminder on a lead: a note, a colour, and two ways to change them.
 *
 * ─── IT IS THE READER'S OWN NOTE ─────────────────────────────────────────────
 * Reminders live in `lead_reminders`, one row per person per lead, NOT in a column on the
 * lead. Two people working the same lead are chasing different things — the estimator
 * waiting on drawings, the partner waiting on a signature — so a shared field makes one of
 * them wrong, and lets either overwrite the other's note without ever seeing there was one.
 *
 * Nothing here passes an employee id: the server takes it from the session, so there is no
 * request shape these components could form that touches somebody else's reminder.
 *
 * The colour is a kit TONE NAME rather than a hex, so a note stays legible when the palette
 * moves and in dark mode alike — see the schema comment for the whole reasoning.
 */

/**
 * Mirrors `LEAD_NOTE_MAX_CHARS` in the backend's leadReminderRules, which is the one that
 * enforces it — this copy only exists so the counter can warn before the round trip.
 *
 * FIFTY, not five hundred. This is a nudge read at a glance in a table row, and the row is
 * the only place it is ever read — a limit generous enough to hold a paragraph invites one,
 * and then the cell is showing the first four words of it forever. Long enough for "call
 * back after the drawings land", short enough that what you typed is what you see.
 */
export const LEAD_NOTE_MAX_CHARS = 50;

/**
 * The Reminder column's width, and the ceiling on its cell content.
 *
 * The cap has to live on the CONTENT, not just the column: a table sizes a column from what
 * its cells want, so one unbroken 50-character string sets the column's max-content width and
 * shoves every column after it off the screen — which is exactly what a pasted line did. An
 * element that cannot exceed this width cannot ask for more than this width.
 */
export const REMINDER_COLUMN_WIDTH = 260;
/** Minus the cell's own 8px horizontal padding, so the text clips inside the column. */
const REMINDER_CONTENT_WIDTH = REMINDER_COLUMN_WIDTH - 16;

/**
 * What a note is drawn in when nobody has chosen. Amber because a reminder is a nudge, not
 * an alarm and not an ordinary field — it has to catch the eye scanning a row of black text
 * without reading as an error the way red would.
 */
export const DEFAULT_NOTE_TONE = 'amber';

/**
 * The colour a stored value resolves to.
 *
 * Two kinds of value land here and both are wanted: a palette TONE NAME (`amber`), which
 * follows the kit if the palette ever moves, and a literal HEX from the custom picker, which
 * is somebody asking for exactly that colour and nothing near it. `resolveSwatchHex` reads
 * both and falls back rather than rendering a broken swatch, so a value from an older build
 * cannot break a row.
 */
export const noteToneHex = (tone?: string | null) =>
    resolveSwatchHex(tone || DEFAULT_NOTE_TONE);

/**
 * One writer for both entry points, so they cannot drift on what a save means.
 *
 * `tone` omitted travels as omitted all the way to the server, which then leaves the stored
 * colour alone — that is what lets the inline editor fix a typo without resetting a tone
 * somebody picked in the dialog.
 */
export const saveLeadNote = (leadId: string, note: string, tone?: string) =>
    setMyLeadReminder(leadId, note, tone);

// ─── The row's editable cell ───────────────────────────────────────────────────

export interface ReminderCellProps {
    lead: { id: string; reminder?: string | null; reminderColor?: string | null };
    /** Fired after a successful save so the table can patch the row in place. */
    onSaved: (reminder: string) => void;
}

/**
 * The Reminder column's cell — text until you click it, an input after.
 *
 * ─── EDIT IN PLACE, NOT IN A DIALOG ──────────────────────────────────────────
 * Most edits to a reminder are a word: a date slipping, a name corrected. Routing that
 * through a modal costs an open, a save and a close for a change smaller than the dialog's
 * title. The dialog is still there behind the row's icon, for writing one from scratch and
 * for the colour — the two jobs that want room.
 *
 * The row itself navigates to the lead on click, so every mouse event here is stopped. That
 * is not defensive: without it the first click on a cell would leave the page.
 */
export function ReminderCell({ lead, onSaved }: ReminderCellProps) {
    const [editing, setEditing] = useState(false);
    const [text, setText] = useState(lead.reminder || '');
    const [saving, setSaving] = useState(false);
    // Guards the blur handler: Escape blurs the input on its way out, and without this the
    // cancel would be immediately followed by a save of the value it just discarded.
    const cancelled = useRef(false);

    const hex = noteToneHex(lead.reminderColor);

    const open = () => { setText(lead.reminder || ''); cancelled.current = false; setEditing(true); };

    const commit = async () => {
        if (cancelled.current) { setEditing(false); return; }
        const next = text.trim();
        if (next === (lead.reminder || '')) { setEditing(false); return; }
        setSaving(true);
        try {
            await saveLeadNote(lead.id, next);
            onSaved(next);
            setEditing(false);
        } catch (e) {
            // The server says why it refused — the cap, a lead since deleted. Guessing here is
            // how a length error gets reported as a permission problem.
            toast({
                icon: 'error',
                title: 'Could not save the reminder',
                text: apiErrorMessage(e, 'Please try again.'),
            });
        } finally {
            setSaving(false);
        }
    };

    if (editing) {
        return (
            <input
                autoFocus
                value={text}
                disabled={saving}
                maxLength={LEAD_NOTE_MAX_CHARS}
                aria-label="Lead reminder"
                onChange={(e) => setText(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onBlur={commit}
                onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
                    if (e.key === 'Escape') { cancelled.current = true; (e.target as HTMLInputElement).blur(); }
                }}
                placeholder="What needs following up?"
                style={{
                    // Sized and coloured like the text it replaces, so the cell does not jump
                    // when it becomes a field — only the underline appears. Same width
                    // ceiling as the static text, or typing would widen the column.
                    width: '100%',
                    maxWidth: REMINDER_CONTENT_WIDTH,
                    font: 'inherit',
                    fontWeight: 600,
                    color: hex,
                    background: 'transparent',
                    border: 'none',
                    borderBottom: `1px solid ${hex}`,
                    outline: 'none',
                    padding: 0,
                    opacity: saving ? 0.5 : 1,
                }}
            />
        );
    }

    const note = lead.reminder || '';
    const hint = note ? `${note} — click to edit` : 'Click to add a reminder';
    return (
        /**
         * The app's tooltip, not the browser's.
         *
         * A raw `title` is the OS one: half a second of nothing, then unstyled chrome that
         * ignores the theme and cannot be read in dark mode. It is lint-banned here for
         * exactly that reason. `aria-label` below carries the same words for screen readers,
         * which the `title` was also doing double duty as.
         *
         * The tooltip is where the whole note lives once the cell has clipped it, so it is
         * worth having it look like the product.
         */
        <Tooltip title={hint} placement="top-start" enterDelay={300}>
        <span
            role="button"
            tabIndex={0}
            aria-label={hint}
            onClick={(e) => { e.stopPropagation(); open(); }}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); open(); }
            }}
            style={{
                display: 'block',
                cursor: 'text',
                color: note ? hex : '#CBD5E1',
                fontWeight: note ? 600 : 400,
                // Clipped, not wrapped: a note long enough to need two lines would set the
                // height of every row in the table. The whole text is on the tooltip.
                //
                // `maxWidth` is the load-bearing one. Without it `overflow: hidden` has
                // nothing to clip against — the block is as wide as its column, and the
                // column is as wide as this text wants to be.
                maxWidth: REMINDER_CONTENT_WIDTH,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
            }}
        >
            {note || '—'}
        </span>
        </Tooltip>
    );
}

// ─── The full editor ───────────────────────────────────────────────────────────

export interface LeadNoteDialogProps {
    open: boolean;
    onClose: () => void;
    lead: { id: string; projectName?: string; prefix?: string; reminder?: string | null; reminderColor?: string | null };
    /** Fired after a successful save, so the row can update in place. */
    onSaved?: (reminder: string, reminderColor: string) => void;
}

export default function LeadNoteDialog({ open, onClose, lead, onSaved }: LeadNoteDialogProps) {
    const [text, setText] = useState('');
    const [tone, setTone] = useState(DEFAULT_NOTE_TONE);
    const [saving, setSaving] = useState(false);

    // Keyed on the lead, so reopening the dialog on a DIFFERENT row refills rather than
    // showing the previous lead's note — the dialog is mounted once and reused.
    useEffect(() => {
        setText(lead?.reminder || '');
        setTone(lead?.reminderColor || DEFAULT_NOTE_TONE);
    }, [lead?.id, lead?.reminder, lead?.reminderColor, open]);

    const save = async () => {
        setSaving(true);
        try {
            const next = text.trim();
            await saveLeadNote(lead.id, next, tone);
            onSaved?.(next, tone);
            toast({ icon: 'success', title: next ? 'Reminder saved' : 'Reminder cleared' });
            onClose();
        } catch (e) {
            toast({
                icon: 'error',
                title: 'Could not save the reminder',
                text: apiErrorMessage(e, 'Please try again.'),
            });
        } finally {
            setSaving(false);
        }
    };

    const over = text.length > LEAD_NOTE_MAX_CHARS;
    const hex = noteToneHex(tone);

    return (
        <GlassDialog
            open={open}
            onClose={saving ? undefined : onClose}
            maxWidth="sm"
            fullWidth
            header={
                <GlassHeader
                    title="Reminder"
                    subtitle={[lead?.prefix, lead?.projectName].filter(Boolean).join(' · ') || 'Lead'}
                    icon={<KTIcon iconName="notepad-edit" className="fs-1" />}
                    onClose={saving ? undefined : onClose}
                />
            }
        >
            <Box sx={{ p: { xs: 2, sm: 2.75 }, display: 'flex', flexDirection: 'column', gap: 2.25 }}>
                <Box>
                    <TextField
                        fullWidth
                        // ONE LINE, matching the limit and the cell.
                        //
                        // A five-row textarea over a fifty-character field is a box that
                        // promises four rows it will not accept — people write to the size of
                        // the box, hit the ceiling, and delete. One line is the same shape the
                        // note is read in on the row, so what you type is what you will see.
                        autoFocus
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="e.g. call back after the drawings land"
                        // `maxLength` stops the typing rather than reporting an error after
                        // the fact. `error` still covers text that arrived by paste on a
                        // browser that ignores the attribute.
                        inputProps={{ 'aria-label': 'Lead reminder', maxLength: LEAD_NOTE_MAX_CHARS }}
                        error={over}
                        // The field IS the preview. Typing in the chosen colour, at the weight
                        // the table uses, answers "what will this look like on the row" without
                        // a second panel repeating the same words back.
                        sx={{ '& .MuiInputBase-input': { color: hex, fontWeight: 600 } }}
                    />
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 0.75, gap: 1 }}>
                        {/* Only reachable by a note written before the limit came down —
                            `maxLength` stops new text at the ceiling. Save is disabled, so the
                            line has to say what to do about it: a red number alone reads as a
                            broken field rather than as a sentence that is too long. */}
                        <Typography sx={{ fontSize: 12, color: 'error.main' }}>
                            {over ? `Trim ${text.length - LEAD_NOTE_MAX_CHARS} characters to save` : ''}
                        </Typography>
                        <Typography
                            sx={{ fontSize: 12, color: over ? 'error.main' : 'text.secondary', whiteSpace: 'nowrap' }}
                        >
                            {text.length} / {LEAD_NOTE_MAX_CHARS}
                        </Typography>
                    </Stack>
                </Box>

                <Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary', mb: 1 }}>
                        Text colour
                    </Typography>
                    <WtColorPicker
                        label="Reminder text colour"
                        value={tone}
                        onChange={setTone}
                        // Custom left ON: the swatches are the quick answer, and the custom
                        // one opens the SAME browser picker — gradient, eyedropper, hex — that
                        // the category-colour rows around the app use, so this is that control
                        // in the kit's frame rather than a second, differently-styled copy.
                        size={30}
                    />
                </Box>
            </Box>

            <Stack
                direction={{ xs: 'column-reverse', sm: 'row' }}
                spacing={1}
                justifyContent="flex-end"
                sx={{ px: 2.5, py: 1.75, borderTop: '1px solid', borderColor: 'divider' }}
            >
                <WtButton ghost onClick={onClose} disabled={saving} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                    cancel
                </WtButton>
                <WtButton
                    onClick={save}
                    disabled={saving || over}
                    startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}
                    sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: 140 }}
                >
                    {saving ? 'saving…' : 'save reminder'}
                </WtButton>
            </Stack>
        </GlassDialog>
    );
}
