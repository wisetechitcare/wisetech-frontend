import { Box } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { OptionPickerDialog, TRIO, type PickerOption } from '@app/modules/common/components/ui';

/**
 * "What do you want to add to this lead?" — the chooser behind the row's `+`.
 *
 * ─── WHY A CHOOSER AND NOT TWO BUTTONS ───────────────────────────────────────
 * The row used to carry both actions permanently, which spent the column's width on two icons
 * that looked identical on every one of 1,385 rows and therefore said nothing. The actions are
 * now the STATE: an icon means that thing exists on this lead. `+` means something is still
 * missing, and this asks which.
 *
 * It only ever appears when BOTH are missing. With one already there, `+` has a single possible
 * answer and goes straight to it — a dialog offering one real choice is a dialog that should not
 * have opened.
 */

export type LeadActionChoice = 'reminder' | 'meeting';

export interface LeadActionPickerProps {
    open: boolean;
    onClose: () => void;
    /** Named in the subtitle, so the dialog says which lead it is about to change. */
    leadName?: string;
    onChoose: (choice: LeadActionChoice) => void;
}

/** An icon on its tone's tint — the same treatment the row's own action buttons use. */
const Glyph = ({ icon, trio }: { icon: string; trio: { c: string; bg: string } }) => (
    <Box
        aria-hidden
        sx={{
            width: 38, height: 38, borderRadius: 1.5, display: 'grid', placeItems: 'center',
            bgcolor: trio.bg, color: trio.c, flexShrink: 0,
        }}
    >
        <KTIcon iconName={icon} className="fs-3" />
    </Box>
);

const OPTIONS: PickerOption[] = [
    {
        id: 'reminder',
        name: 'Reminder',
        caption: 'A note to yourself, shown on this row',
        color: TRIO.amber.c,
        leading: <Glyph icon="notepad-edit" trio={TRIO.amber} />,
    },
    {
        id: 'meeting',
        name: 'Meeting',
        caption: 'Book a call or a visit against this lead',
        color: TRIO.purple.c,
        leading: <Glyph icon="calendar-add" trio={TRIO.purple} />,
    },
];

export default function LeadActionPicker({ open, onClose, leadName, onChoose }: LeadActionPickerProps) {
    return (
        <OptionPickerDialog
            open={open}
            onClose={onClose}
            title="Add to this lead"
            subtitle={leadName}
            icon={<KTIcon iconName="plus" className="fs-1 text-white" />}
            options={OPTIONS}
            // No Confirm button, and no selected state to carry: there are two options and
            // picking one IS the decision. Making somebody choose and then confirm adds a click
            // to save them from a mistake that takes one click to undo.
            selectedId={null}
            onSelect={(id) => onChoose(id as LeadActionChoice)}
            maxWidth="xs"
        />
    );
}
