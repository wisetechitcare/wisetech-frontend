import { createElement, forwardRef, type CSSProperties, type ElementType } from 'react';
import { Box, ButtonProps, IconButtonProps, Tooltip } from '@mui/material';
import { cn } from 'cn';
import { Button as KitButton } from '@/ds/ui/button';
import { type SxProps, type Theme } from '@mui/material/styles';
import { titleCaseNode } from './text';

/**
 * Reusable button primitives for the premium UI kit.
 *
 * Since ADR-001 Phase 3a (2026-10-28) WtButton renders the v2 kit Button (src/ds/ui/button.tsx,
 * the one in Storybook): the recipe below now lives there as Tailwind classes, and this file only
 * maps the WtButton API onto it. ctaSx / ghostSx / invertedSx stay for the rare plain MUI Button
 * that has to keep its own element; the kit is the source of truth for how a button looks.
 *
 * **Global default:** compact, flat accent CTA (the kit's `default` variant), used for every action:
 * since 2026-10-28 there is no navy "primary" tone, default always. Cancel stays white (`ghost`).
 * Sandwich Add Rule is the visual benchmark. Appearance may theme other chrome;
 * do **not** invent gold Cancel, yellow-on-navy primary, or a second button component.
 *
 * The recipe is the Meridian calendar's Create-Event button (CustomCalendar.premium.css
 * .mrd-createbtn / .mrd-btn--primary), generalized and re-tonable:
 *   • 180deg gradient to a darker shade of the same hue
 *   • triple shadow: crisp 1px + long soft colored glow + inset 1px white top-highlight ("glass" edge)
 *   • hover: -1px lift with a deeper glow · active: scale(.98) press
 *   • spring-ish easing cubic-bezier(.22,.61,.36,1)
 *
 * Recipe matrix:
 *   Default CTA                  → `<WtButton>` (compact, flat accent)
 *   High-emphasis Create / Save  → `<WtButton flat={false} size="medium">`
 *   Cancel / secondary close     → `<WtButton ghost>`
 *   Header Add on gradient       → `<WtButton inverted>`
 *   Delete / destructive         → `<WtButton tone="danger">`
 *   Success confirm              → `<WtButton tone="success">`
 *   Spacious CTA                 → `<WtButton size="medium">`
 *   Icon-only                    → `WtIconButton` / `ActionIconButton` / `WtCloseButton`
 *   Dialog Cancel + Submit       → `GlassDialogActions` (not hand-rolled DialogActions)
 *
 * Usage:
 *   <WtButton>Save</WtButton>
 *   <WtButton flat={false} size="medium">Save</WtButton>
 *   <WtButton tone="danger" startIcon={...}>Delete</WtButton>
 *   <WtButton ghost>Cancel</WtButton>
 *   <WtIconButton title="Edit" color="#2563eb"><KTIcon iconName="pencil" className="fs-3" /></WtIconButton>
 */

export const MRD_EASE = 'cubic-bezier(.22,.61,.36,1)';

/**
 * Control density SSOT (modern SaaS mid-scale).
 *
 * - Default / row (`WT_CONTROL_HEIGHT` = 40): toolbars, list headers, most forms.
 * - Spacious (`WT_CONTROL_HEIGHT_MD` = 44): opt-in dialog forms via `size="md"` / `size="medium"`.
 *
 * Anything that sits in a row with a WtButton should use `controlHeightSx` (or
 * `controlHeightSxFor('md')`) rather than guessing heights per screen.
 */
export const WT_CONTROL_HEIGHT = 40;
export const WT_CONTROL_HEIGHT_MD = 44;

/**
 * Make a MUI input match button height. Applied to the OUTER root and the inner input,
 * because MUI sizes the input element independently of the wrapper — setting only the
 * root leaves the text off-centre.
 */
export const controlHeightSxFor = (density: 'sm' | 'md' = 'sm') => {
  const h = density === 'md' ? WT_CONTROL_HEIGHT_MD : WT_CONTROL_HEIGHT;
  return {
    // Lock height (not only minHeight) so Autocomplete + avatar adornments cannot grow
    // taller than neighbouring plain Selects in the same form row.
    '& .MuiOutlinedInput-root': { minHeight: h, height: h, alignItems: 'center', boxSizing: 'border-box' },
    '& .MuiOutlinedInput-input': {
      paddingTop: 0,
      paddingBottom: 0,
      height: h - 2,
      boxSizing: 'border-box',
      // Real <input>s (Autocomplete / text) center via line-box; keep them optically middle.
      lineHeight: `${h - 2}px`,
    },
    // MUI Select is a div.MuiSelect-select — height alone leaves the label high in the
    // box. Flex-center to match Autocomplete (EmployeePicker / Recruiter gold standard).
    '& .MuiSelect-select': {
      display: 'flex',
      alignItems: 'center',
      paddingTop: 0,
      paddingBottom: 0,
      height: h - 2,
      boxSizing: 'border-box',
      lineHeight: 1.25,
    },
    '& .MuiAutocomplete-inputRoot': { flexWrap: 'nowrap', py: '0 !important' },
  } as const;
};

/** Default (40px) — alias kept so existing imports keep working. */
export const controlHeightSx = controlHeightSxFor('sm');

export type WtCtaTone = 'accent' | 'danger' | 'success';

// Gradient stops per tone. 'accent' = bright brand blue into the brand navy: the one CTA look
// (the kit's `default`). The former navy 'primary' tone was retired 2026-10-28: default always.
const CTA: Record<WtCtaTone, { from: string; to: string; glow: string }> = {
  accent:  { from: '#2563EB', to: '#1E3A8A', glow: '#2563EB' },
  danger:  { from: '#e11d48', to: '#9f1239', glow: '#e11d48' },
  success: { from: '#16a34a', to: '#15803d', glow: '#16a34a' },
};

/**
 * The raw sx for a CTA tone — exported for the rare case a plain MUI Button must stay in place.
 *
 * `flat` keeps the colour and the lift/press physics but drops the long coloured glow to a
 * plain neutral elevation. The glow is tuned for ONE hero CTA on a surface; put two of them
 * side by side in a toolbar and the two halos bloom into each other and the row reads as
 * lit up rather than as a pair of buttons. Reach for it whenever CTAs sit adjacent.
 */
export const ctaSx = (tone: WtCtaTone = 'accent', flat = false): SxProps<Theme> => {
  const c = CTA[tone];
  const rest = flat
    ? '0 1px 2px rgba(16,24,40,.10), 0 2px 6px -2px rgba(16,24,40,.10), inset 0 1px 0 rgba(255,255,255,.16)'
    : `0 1px 2px ${c.glow}59, 0 12px 26px -10px ${c.glow}b3, inset 0 1px 0 rgba(255,255,255,.16)`;
  const hover = flat
    ? '0 2px 4px rgba(16,24,40,.12), 0 6px 14px -6px rgba(16,24,40,.18), inset 0 1px 0 rgba(255,255,255,.16)'
    : `0 3px 6px ${c.glow}59, 0 18px 32px -10px ${c.glow}cc, inset 0 1px 0 rgba(255,255,255,.16)`;

  return {
    textTransform: 'none', fontWeight: 700, letterSpacing: '-0.01em', borderRadius: '12px',
    lineHeight: 1.2,
    background: `linear-gradient(135deg, ${c.from}, ${c.to})`, color: '#fff',
    boxShadow: rest,
    transition: `transform .16s ${MRD_EASE}, box-shadow .2s, filter .15s`,
    '& .MuiButton-startIcon': { mr: 0.9, '& .fs-2, & .fs-3': { fontSize: '1.15rem' } },
    // Keenicons draw a duotone glyph as several stacked <span class="pathN">, and the stylesheet
    // dims all but the first to around 30%. On a white-on-gradient button that reads as a smudge
    // rather than an icon, so on a filled CTA every path is taken up to full strength and to the
    // button's own colour. Stated once here rather than per button.
    '& .ki-duotone, & .ki-solid, & .ki-outline': {
      color: 'inherit',
      '& [class*="path"]': { opacity: 1, color: 'inherit' },
    },
    '&:hover': {
      background: `linear-gradient(135deg, ${c.from}, ${c.to})`, transform: 'translateY(-1.5px)', filter: 'brightness(1.04)',
      boxShadow: hover,
    },
    '&:active': { transform: 'translateY(0) scale(.975)' },
    '&:focus-visible': { outline: `2px solid ${c.glow}`, outlineOffset: 2 },
    '&.Mui-disabled': { background: '#e2e8f0', color: '#94a3b8', boxShadow: 'none' },
  };
};

/** Quiet button (mrd-ghost): the standard "Cancel" — now larger + a faint bordered surface so it
 * reads as a real, tappable secondary action (not just text). */
export const ghostSx: SxProps<Theme> = {
  textTransform: 'none', fontWeight: 650, letterSpacing: '-0.01em', borderRadius: '12px', color: '#334155',
  lineHeight: 1.2,
  // White on a visible border, and a hover that goes DARKER.
  //
  // It used to sit at #F8FAFC behind a #E2E8F0 border and hover to #EEF2F7 — all three within a
  // few percent of the surfaces it sits on. On a dialog footer (a light grey band) the button
  // was barely there at rest, and hovering moved it TOWARDS the footer colour, so it read as
  // disappearing under the cursor. Contrast now increases on hover, which is the direction a
  // hover is supposed to go.
  bgcolor: '#FFFFFF', border: '1px solid #CBD5E1',
  transition: `background-color .15s, border-color .15s, transform .16s ${MRD_EASE}, box-shadow .15s`,
  '& .MuiButton-startIcon': { mr: 0.9 },
  '&:hover': { bgcolor: '#E2E8F0', borderColor: '#94A3B8', color: '#0F172A', transform: 'translateY(-1px)', boxShadow: '0 4px 10px rgba(16,24,40,0.10)' },
  '&:active': { transform: 'translateY(0) scale(.975)' },
  '&:focus-visible': { outline: '2px solid #94A3B8', outlineOffset: 2 },
  '&.Mui-disabled': { bgcolor: '#F8FAFC', color: '#CBD5E1', borderColor: '#E2E8F0' },
};

/** Inverted pill — white background, navy text: the gradient-header "Add" pill generalized so it
 * also works on light surfaces (thin blue-tinted border + soft shadow). Same lift/press physics. */
export const invertedSx: SxProps<Theme> = {
  textTransform: 'none', fontWeight: 700, letterSpacing: '-0.01em', borderRadius: '12px',
  lineHeight: 1.2,
  bgcolor: '#fff', color: '#1E3A8A', border: '1px solid #dbeafe',
  boxShadow: '0 1px 2px rgba(16,24,40,0.06)',
  transition: `background-color .15s, border-color .15s, transform .16s ${MRD_EASE}, box-shadow .2s`,
  '& .MuiButton-startIcon': { mr: 0.9 },
  '&:hover': { bgcolor: '#EAF0FA', borderColor: '#bfdbfe', transform: 'translateY(-1.5px)', boxShadow: '0 8px 18px rgba(30,58,138,0.18)' },
  '&:active': { transform: 'translateY(0) scale(.975)' },
  '&:focus-visible': { outline: '2px solid #1E3A8A', outlineOffset: 2 },
  '&.Mui-disabled': { bgcolor: '#f1f5f9', color: '#94a3b8', borderColor: '#e2e8f0', boxShadow: 'none' },
};

export interface WtButtonProps extends ButtonProps {
  /** CTA gradient tone. Ignored when `ghost` or `inverted` is set. Default 'accent'. */
  tone?: WtCtaTone;
  /** Quiet text-button variant (the standard Cancel). */
  ghost?: boolean;
  /** White pill with navy text (the gradient-header "Add" pill) — secondary/launch actions. */
  inverted?: boolean;
  /** Same colour, no coloured glow. Defaults to true for the compact global CTA recipe. */
  flat?: boolean;
}

const KIT_TONE: Record<WtCtaTone, 'default' | 'destructive' | 'success'> = {
  accent: 'default',
  danger: 'destructive',
  success: 'success',
};

// Keenicons draw a duotone glyph as stacked <span class="pathN">, dimmed to ~30% by the stylesheet;
// on a filled CTA or a tinted icon button every path goes to full strength in the button's colour.
export const KT_ICON_FULL =
  '[&_.ki-duotone]:text-inherit [&_.ki-solid]:text-inherit [&_.ki-outline]:text-inherit [&_.ki-duotone_[class*=path]]:opacity-100 [&_.ki-duotone_[class*=path]]:text-inherit';

/**
 * A caller's sx is raised to (0,2,0) with '&&' so it still beats the kit's Reboot opt-out in
 * main.css, exactly as it used to beat the MUI recipe. The old recipe sized buttons with minHeight;
 * the kit uses a fixed height, so a caller's minHeight (e.g. 30 or 36 for dense rows) becomes the
 * height too, or the button would silently grow to 40px.
 */
type SxEntry = Exclude<SxProps<Theme>, ReadonlyArray<unknown>>;
const raiseSx = (sx: SxProps<Theme>): SxProps<Theme> =>
  (Array.isArray(sx) ? sx : [sx]).map((entry: SxEntry | boolean | null | undefined) => {
    if (!entry || typeof entry === 'boolean') return entry;
    if (typeof entry === 'function') return (theme: Theme) => ({ '&&': entry(theme) });
    const style = entry as Record<string, unknown>;
    const sized = style.minHeight != null && style.height == null ? { ...style, height: style.minHeight } : style;
    return { '&&': sized };
  }) as SxProps<Theme>;

/**
 * The app's button. Same API as before; it renders the v2 kit Button (src/ds/ui/button.tsx, the one
 * shown in Storybook), so colours, depth, motion and shape come from the kit. Mapping:
 * tone accent/danger/success → default/destructive/success, ghost → outline,
 * inverted → inverted, size small → default (40px), medium/large → lg (44px),
 * flat={false} at medium/large → glow.
 */
export const WtButton = forwardRef<HTMLButtonElement, WtButtonProps>(function WtButton(
  {
    tone = 'accent', ghost = false, inverted = false, flat = true, size = 'small',
    sx, className, fullWidth, startIcon, endIcon, component, href, disabled, children,
    // MUI's own variant/color are honoured (a migrated MUI Button keeps its look: text → ghost,
    // outlined → outline, contained → the tone, error/success colours → destructive/success).
    variant: muiVariant, color: muiColor,
    // MUI-only props with no meaning on the kit Button; taken out so they never reach the DOM.
    disableElevation: _de, disableRipple: _dr, disableFocusRipple: _dfr,
    disableTouchRipple: _dtr, centerRipple: _cr, focusRipple: _fr, focusVisibleClassName: _fvc,
    TouchRippleProps: _trp, touchRippleRef: _trr, LinkComponent: _lc, action: _a, classes: _c,
    ...rest
  },
  ref,
) {
  const spacious = size === 'medium' || size === 'large';
  const colorTone: WtCtaTone | null = muiColor === 'error' ? 'danger' : muiColor === 'success' ? 'success' : null;
  const quiet = !ghost && !inverted && (muiVariant === 'text' || muiVariant === 'outlined');
  const cta = !ghost && !inverted && !quiet;
  const kitVariant = ghost || muiVariant === 'outlined' ? 'outline' : inverted ? 'inverted' : muiVariant === 'text' ? 'ghost' : KIT_TONE[colorTone ?? tone];
  const as = href ? <a href={href} /> : component && component !== 'button' ? createElement(component as ElementType) : undefined;
  const props = {
    ...rest,
    ref,
    disabled,
    variant: kitVariant,
    size: spacious ? 'lg' : 'default',
    glow: cta && spacious && !flat,
    // Mui-disabled is kept so existing `&.Mui-disabled` sx overrides still match.
    className: cn(cta && KT_ICON_FULL, quiet && colorTone === 'danger' && 'text-(--cta-danger)', fullWidth && 'w-full', disabled && 'Mui-disabled', className),
    ...(as ? { render: as, nativeButton: false } : null),
    children: (
      <>
        {startIcon && <span data-icon="inline-start" className="inline-flex">{startIcon}</span>}
        {/* Labels are title-cased here so every button reads the same without each call site
            remembering. Only a plain string is touched — a caller passing nodes has already decided
            how it looks. WtIconButton is NOT wrapped: its children are a glyph, not a label. */}
        {titleCaseNode(children)}
        {endIcon && <span data-icon="inline-end" className="inline-flex">{endIcon}</span>}
      </>
    ),
  } as const;
  return sx ? <Box component={KitButton} sx={raiseSx(sx)} {...props} /> : <KitButton {...props} />;
});

export interface WtIconButtonProps extends Omit<IconButtonProps, 'color' | 'size'> {
  /** MUI sizes (small 32px, medium 40px, large 44px) or a pixel size. Default 44px. */
  size?: 'small' | 'medium' | 'large' | number;
  /** Tone hex (or CSS colour) — the kit's `tinted` variant is toned from it. */
  color?: string;
  /** Tooltip label (also used as aria-label). */
  title?: string;
}

/**
 * Tinted icon button: the kit Button's `tinted` variant at 44px (one look with ActionIconButton),
 * toned by `color`. Same API as before; MUI-only props are dropped, a caller's sx still wins.
 */
export const WtIconButton = forwardRef<HTMLButtonElement, WtIconButtonProps>(function WtIconButton(
  {
    color = '#64748b', title, sx, className, style, children, size,
    edge: _edge, disableRipple: _dr, disableFocusRipple: _dfr, disableTouchRipple: _dtr,
    centerRipple: _cr, focusRipple: _fr, focusVisibleClassName: _fvc, TouchRippleProps: _trp,
    touchRippleRef: _trr, LinkComponent: _lc, action: _a, classes: _c,
    ...rest
  },
  ref,
) {
  const props = {
    ...rest,
    ref,
    variant: 'tinted',
    size: size === 'small' ? 'icon-sm' : size === 'medium' ? 'icon' : 'icon-lg',
    'aria-label': title ?? rest['aria-label'],
    className: cn(KT_ICON_FULL, className),
    style: { '--tint': color, ...(typeof size === 'number' ? { width: size, height: size } : null), ...style } as CSSProperties,
    children,
  } as const;
  const btn = sx ? <Box component={KitButton} sx={raiseSx(sx)} {...props} /> : <KitButton {...props} />;
  return title ? <Tooltip title={title}>{btn}</Tooltip> : btn;
});
