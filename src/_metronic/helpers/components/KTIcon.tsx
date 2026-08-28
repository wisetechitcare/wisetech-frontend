import { AppIcon } from '../../../app/modules/common/components/ui/AppIcon'

type Props = {
  className?: string
  /**
   * Accepted and ignored. It selected between the keenicon font's duotone, solid and
   * outline faces; Lucide is a single stroke family, so there is no face to pick. Kept in
   * the signature so the call sites that still pass it keep compiling.
   */
  iconType?: 'duotone' | 'solid' | 'outline'
  iconName: string
}

/**
 * DEPRECATED — use `AppIcon` directly. Kept as a delegating alias, not as an icon.
 *
 * This used to render `<i class="ki-duotone ki-{name}">` plus one `<span class="pathN">`
 * per duotone layer, driven by a hand-maintained path-count table in `icons-config/icons.ts`
 * — a name missing from that table rendered a broken glyph rather than a fallback. It is now
 * a two-line forward to `AppIcon`, which resolves the same names through `iconRegistry`.
 *
 * Delegating rather than codemodding was the cheaper correct move: `iconName` and
 * `className` are the only props any of the ~890 call sites pass, and they map one-to-one
 * onto `AppIcon`'s `name` and `className`. One file moved every one of those icons onto
 * Lucide and let the 183KB keenicons font be deleted the same day, with no diff to review
 * across 214 files. Renaming the call sites is now optional tidying that can happen at
 * whatever pace suits, instead of being the thing blocking the font's removal.
 */
const KTIcon = ({className = '', iconName}: Props) => (
  <AppIcon name={iconName} className={className || 'fs-4'} />
)

export {KTIcon}
