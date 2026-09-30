import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import Tooltip from '@mui/material/Tooltip';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import PrivacyToggle from './PrivacyToggle';

/**
 * The eye toggle — one switch that hides every amount on a screen.
 *
 * The salary module has had this for a while, but the state lived in `SalaryView` and was
 * prop-drilled to each component that renders a figure. That works for two levels; the
 * reimbursement screen is five deep (page → workspace → table → row → cell), and threading a
 * boolean through five signatures to reach a currency span is the kind of change nobody makes
 * twice — so the second screen goes without the feature instead.
 *
 * A context costs one provider at the page root and one hook at each figure. Default is HIDDEN
 * on nothing: a page with no provider renders normally, so adding the provider is opt-in and no
 * existing screen changes behaviour.
 */

interface SensitiveDataCtx {
    /** True when amounts are readable. Defaults to hidden once a provider is present. */
    visible: boolean;
    toggle: () => void;
    /** The class to put on any element carrying a figure. */
    cls: string;
    /** True inside a real provider — lets a nested provider defer to the outer one. */
    provided: boolean;
}

const Ctx = createContext<SensitiveDataCtx>({
    // No provider: nothing is hidden, and `cls` is empty rather than 'visible' so a page that
    // never opted in does not get a transition property on every figure.
    visible: true,
    toggle: () => undefined,
    cls: '',
    provided: false,
});

export function SensitiveDataProvider({
    children,
    defaultVisible = false,
    disabled = false,
}: {
    children: React.ReactNode;
    /** Screens showing one's own data may prefer to open revealed. */
    defaultVisible?: boolean;
    /**
     * Hide nothing, as if there were no provider. For a page-level provider sitting above tabs
     * where only SOME tabs offer the eye: a tab with no switch must not blur figures it gives
     * the reader no way to reveal. The toggle's state is kept while disabled, so returning to
     * an eye tab finds it as it was left.
     */
    disabled?: boolean;
}) {
    const parent = useContext(Ctx);
    const [visible, setVisible] = useState(defaultVisible);
    const toggle = useCallback(() => setVisible((v) => !v), []);

    const value = useMemo<SensitiveDataCtx>(() => (disabled
        // Still a provider (so nested ones keep deferring, and the tree shape never changes
        // between tabs and remounts them) — it just hides nothing.
        ? { visible: true, toggle, cls: '', provided: true }
        : {
            visible,
            toggle,
            cls: visible ? 'sensitive-data-visible' : 'sensitive-data-hidden',
            provided: true,
        }), [visible, toggle, disabled]);

    // Nested inside another provider (e.g. a page whose eye sits in the sticky tab bar):
    // defer to it, so there is ONE switch and it governs every figure below it. A second
    // provider here would shadow the outer one and leave the header eye controlling nothing.
    if (parent.provided) return <>{children}</>;

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Read the toggle. `cls` goes on the element wrapping the figure. */
export const useSensitiveData = () => useContext(Ctx);

/**
 * The eye, for a page's sticky tab bar (`MaterialHeaderTab`'s `headerAction`). A heading-level
 * eye scrolls away, so hiding a figure halfway down meant scrolling back to the top; the bar
 * stays pinned.
 *
 * Labelled, and the two states read differently at a glance, in the tab bar's own grammar:
 * ON (amounts showing) takes the selected tab's frosted fill plus a white outline; OFF is a
 * quiet fill with no outline, like an unselected tab on hover.
 * The `!` utilities: Metronic's unlayered Bootstrap button rules outrank Tailwind's layer, and
 * its focus style drew a black ring after every click. Keyboard focus keeps a ring.
 */
export function SensitiveDataHeaderToggle() {
    const sensitive = useSensitiveData();
    const label = sensitive.visible ? 'Hide amounts' : 'Show amounts';
    return (
        // MUI's tooltip, not the browser's `title`: on a phone the eye is
        // icon-only, so this is the only place the label appears, and the native
        // one renders unstyled after a delay nobody waits out.
        <Tooltip title={label}>
        <button
            type="button"
            onClick={sensitive.toggle}
            aria-pressed={sensitive.visible}
            aria-label={label}
            // Phones: the eye alone, dressed like a tab cell of the phone bar — the bar stretches it to
            // the tabs' height, it is clear when amounts are hidden (like an unselected tab) and takes
            // the selected tab's frosted fill when they show. No outline ring: on a 40px cell it read
            // as a stray dark square. The label stays for screen readers.
            // `[&_svg]:block` + `place-items-center`: the eye is an inline <svg> inside PrivacyToggle's
            // div, and inline sits on the text baseline — which nudged it off-centre.
            className={`inline-flex h-[34px] shrink-0 items-center justify-center gap-2 rounded-lg! border-0! px-3.5 text-[13px] leading-none max-sm:w-11 max-sm:px-0 max-sm:rounded-[10px]! max-sm:[&_svg]:size-5 font-semibold outline-none! transition-colors motion-reduce:transition-none focus-visible:ring-2! focus-visible:ring-white/70! [&_.privacy-toggle]:pointer-events-none [&_.privacy-toggle]:grid [&_.privacy-toggle]:place-items-center [&_svg]:block [&_svg]:size-[17px] ${
                sensitive.visible
                    ? 'bg-white/16! text-white! shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.75)]! hover:bg-white/20! max-sm:bg-white/18! max-sm:shadow-none!'
                    : 'bg-white/8! text-white/90! shadow-none! hover:bg-white/14! max-sm:bg-transparent! max-sm:text-white/80! active:bg-white/20!'
            }`}
        >
            <PrivacyToggle isVisible={sensitive.visible} onToggle={sensitive.toggle} color="#ffffff" />
            <span className="max-sm:sr-only">{label}</span>
        </button>
        </Tooltip>
    );
}

/**
 * The eye for a LIGHT surface — the detail page's underline tab bar, where the white-on-blue
 * button above would be invisible.
 *
 * Labelled and outlined, not a bare icon. On a row of text tabs a lone glyph reads as
 * decoration: it does not say it is pressable, and an eye on its own does not say WHAT it
 * reveals. The two states are told apart by more than the glyph — hidden is quiet, showing
 * is filled in the brand tint — so the current state is legible without hunting for the
 * slash across the eye. The label drops on a phone, where the tab row needs the width.
 */
export function SensitiveDataBarToggle() {
    const sensitive = useSensitiveData();
    const label = sensitive.visible ? 'Hide amounts' : 'Show amounts';
    return (
        <Tooltip title={label}>
            <Button
                type="button"
                size="small"
                variant="outlined"
                onClick={sensitive.toggle}
                aria-pressed={sensitive.visible}
                aria-label={label}
                startIcon={sensitive.visible ? <VisibilityIcon /> : <VisibilityOffIcon />}
                sx={{
                    alignSelf: 'center',
                    textTransform: 'none',
                    fontSize: 12.5,
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    // No radius override: the theme gives every button the same corner, and
                    // a pill here would read as a different KIND of control to the buttons
                    // beside it.
                    px: { xs: 1, sm: 1.5 },
                    minWidth: 0,
                    color: sensitive.visible ? 'primary.main' : 'text.secondary',
                    borderColor: sensitive.visible ? 'primary.main' : 'divider',
                    bgcolor: sensitive.visible ? 'action.selected' : 'transparent',
                    '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: 'action.hover',
                    },
                    // Icon-only on a phone: the label would push the tabs off the row.
                    '& .MuiButton-startIcon': { mr: { xs: 0, sm: 0.75 }, ml: 0 },
                }}
            >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>{label}</Box>
            </Button>
        </Tooltip>
    );
}

export default SensitiveDataProvider;
