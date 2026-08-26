import type { ReactNode } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { T } from './tokens';

export type ActionTone = 'brand' | 'indigo' | 'danger' | 'success' | 'onBrand';

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
 * Row/card action button: a tinted ~40px square holding a KTIcon.
 *
 * Lifted verbatim out of BranchCard, which had this styling inline. It is the look
 * every list action is expected to have, so it lives in the kit and BranchCard consumes
 * it too — a second copy is exactly how the Towns table ended up with a Bootstrap
 * `btn btn-icon` pencil that looked nothing like the branch cards.
 *
 * 40px is deliberate: these were cramped micro-icons before, below a comfortable
 * touch target.
 */
export default function ActionIconButton({
  iconName,
  icon,
  title,
  onClick,
  tone = 'indigo',
  disabled = false,
  size = 'md',
}: ActionIconButtonProps) {
  const color = TONE_COLOR[tone];
  const px = SIZE_PX[size];

  return (
    <Tooltip title={title}>
      {/* span keeps the tooltip working while the button is disabled — a disabled
          MUI button emits no pointer events for the tooltip to listen to. */}
      <span>
        <IconButton
          onClick={onClick}
          disabled={disabled}
          aria-label={title}
          sx={{
            width: px,
            height: px,
            borderRadius: size === 'sm' ? '8px' : '10px',
            color,
            bgcolor: `${color}1A`,
            border: `1px solid ${color}3D`,
            transition: 'background-color .15s, border-color .15s',
            '&:hover': { bgcolor: `${color}30`, borderColor: `${color}66` },
          }}
        >
          {icon ?? <KTIcon iconName={iconName ?? ''} className={SIZE_ICON_CLASS[size]} />}
        </IconButton>
      </span>
    </Tooltip>
  );
}
