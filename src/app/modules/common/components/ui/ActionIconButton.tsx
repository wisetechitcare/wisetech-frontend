import type { CSSProperties, ReactNode } from 'react';
import { KTIcon } from '@metronic/helpers';
import { cn } from 'cn';
import { Button } from '@/ds/ui/button';
import { T } from './tokens';
import { TRIO, type Trio } from './patterns';
import { KT_ICON_FULL } from './buttons';
import WtTooltip from './WtTooltip';

export type ActionTone = 'brand' | 'indigo' | 'danger' | 'success' | 'onBrand';

/**
 * Map a kit `Trio` accent onto an `ActionIconButton` tone.
 * Keeps row actions (edit / delete / audit) on the same palette as section cards.
 */
export function trioToActionTone(trio: Trio): ActionTone {
  if (trio === TRIO.rose) return 'danger';
  if (trio === TRIO.green) return 'success';
  if (trio === TRIO.blue) return 'indigo';
  return 'brand';
}

const TONE_COLOR: Record<ActionTone, string> = {
  brand: T.color.brand,
  indigo: T.color.indigo,
  danger: T.color.danger,
  // For row actions that hand off to an outside channel (share to WhatsApp, send)
  // — the affirmative counterpart to `danger`, so those buttons stop being a raw
  // FontAwesome glyph in a Bootstrap `btn-icon`.
  success: T.color.success,
  /**
   * For a button placed ON the brand navy — a page banner or the gradient header —
   * rather than on a card.
   *
   * Every other tone here is a saturated colour chosen to read on WHITE, and the
   * tinted-square recipe below then paints it at 10% fill / 24% border. Put one of
   * those on navy and you get a dark glyph on a dark ground behind an almost invisible
   * tint: that is how the Tasks Configuration back arrow came to be barely findable.
   *
   * The recipe itself is fine — it just needs ink that belongs on that surface. At
   * white the same formula yields a solid white glyph over a 10% white wash, which is
   * the standard treatment for a control on a coloured header.
   */
  onBrand: T.color.onBrand,
};

export interface ActionIconButtonProps {
  /** KTIcon name, e.g. "pencil" | "trash" | "arrow-up-right". Ignored when `icon` is set. */
  iconName?: string;
  /**
   * A glyph node instead of a font icon — for marks the duotone font renders badly,
   * such as the brand logos in `brandIcons` (its first layer is painted at 40%
   * opacity, which washes a logo out). Inherits the tone colour via `currentColor`.
   */
  icon?: ReactNode;
  /** Tooltip text — also the accessible label. */
  title: string;
  /**
   * Render as a WIDE button with this text beside the glyph instead of a square.
   *
   * For card footers, where three 40px squares huddled in a corner leave the rest
   * of the row empty and make the actions read as an afterthought. Same tone tints
   * and the same press physics — only the shape changes, so a card's actions and a
   * table row's still belong to one system. No tooltip: the label already names it.
   */
  label?: string;
  /** Let a labelled button share the row equally with its siblings. */
  fullWidth?: boolean;
  onClick: () => void;
  tone?: ActionTone;
  disabled?: boolean;
  /**
   * "md" (40px) for cards and table rows; "sm" (30px) inside compact chips, where a
   * 40px control would inflate the chip itself. Same tinted-square language either
   * way — only the scale changes, so rows and chips still read as one system.
   */
  size?: 'sm' | 'md';
}

const SIZE_PX: Record<'sm' | 'md', number> = { sm: 30, md: 40 };
const SIZE_ICON_CLASS: Record<'sm' | 'md', string> = { sm: 'fs-6', md: 'fs-4' };

/**
 * Row/card action button: the kit Button's `tinted` variant (one look with WtIconButton) + KTIcon,
 * optionally labelled. `onBrand` (white on a coloured header) also sets white ink.
 */
export default function ActionIconButton({
  iconName,
  icon,
  title,
  onClick,
  tone = 'indigo',
  disabled = false,
  size = 'md',
  label,
  fullWidth = false,
}: ActionIconButtonProps) {
  const color = TONE_COLOR[tone];
  const px = SIZE_PX[size];
  const glyph = icon ?? <KTIcon iconName={iconName ?? ''} className={SIZE_ICON_CLASS[size]} />;
  const tint = { '--tint': color, ...(tone === 'onBrand' ? { '--tint-ink': color } : null) } as CSSProperties;

  if (label) {
    return (
      <Button
        variant="tinted"
        size={size === 'sm' ? 'sm' : 'default'}
        onClick={onClick}
        disabled={disabled}
        className={cn(KT_ICON_FULL, 'whitespace-nowrap', fullWidth && 'w-full')}
        style={tint}
      >
        <span data-icon="inline-start" className="inline-flex">{glyph}</span>
        {label}
      </Button>
    );
  }

  return (
    <WtTooltip title={title} wrap>
      <Button
        variant="tinted"
        size="icon"
        onClick={onClick}
        disabled={disabled}
        aria-label={title}
        className={KT_ICON_FULL}
        style={{ ...tint, width: px, height: px }}
      >
        {glyph}
      </Button>
    </WtTooltip>
  );
}
