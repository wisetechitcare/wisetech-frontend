import { Fragment, isValidElement, type ReactNode } from 'react';
import { Box, Link, Stack, Typography, useMediaQuery } from '@mui/material';
import { useTheme, type SxProps, type Theme } from '@mui/material/styles';
import SmartAvatar from '../SmartAvatar';
import { AppIcon } from './AppIcon';
import { WtIconButton } from './buttons';
import { GlassSurface } from './glass';

/**
 * Identity header for a person / company / contact — the "who is this record" band a
 * detail page (and a wizard's rail or review step) opens with.
 *
 * Rebuilt on kit parts from the recipe the employee details page hand-assembled
 * (and that contact, company and organisation pages copy-pasted): back button, a
 * SmartAvatar with its active/inactive status ring, the name, a "role · department ·
 * #code" meta line, the ways to reach the record as icon links, and actions on the right.
 *
 * - `variant="full"` (default): thin `GlassSurface`, radius 16, 84px rounded avatar
 *   (64px on xs). Actions wrap under the name below `md`.
 * - `variant="compact"`: a plain transparent row with a 36px avatar and no links, laid
 *   out on TWO lines — the name (with chips) on line 1, the muted meta on line 2 — so
 *   a narrow wizard rail (~230px) never squeezes the name down to a few characters.
 *   Both lines ellipsize; a string name is exposed in full via `title`.
 *
 * The name is a CONTENT title (a record's own name), so it keeps its case — it is not a
 * structural heading and does not take `HEADING_CASE_SX`.
 */
export interface EntityIdentityAvatar {
  /** Photo / logo URL. Initials (from `name`) render when it is missing or fails to load. */
  src?: string | null;
  /** Used for the initials fallback and the avatar's colour seed. */
  name: string;
  /** Drives the avatar's status ring. Omit for no ring. */
  status?: 'active' | 'inactive';
  /** Stable record id — seeds the fallback palette so it never changes with a rename. */
  id?: string | null;
}

export interface EntityIdentityLink {
  /** KT icon name (e.g. `phone`, `sms`, `geolocation`). */
  icon: string;
  /** Visible text — also the accessible name of the link. */
  label: string;
  /** `tel:` / `mailto:` / URL. Without it the item renders as plain secondary text. */
  href?: string;
}

export interface EntityIdentityHeaderProps {
  /** The record's name. */
  title: ReactNode;
  /** Avatar descriptor (rendered through SmartAvatar), or a ready-made node. */
  avatar?: EntityIdentityAvatar | ReactNode;
  /** Meta items rendered as "a · b · c". Falsy items are dropped. */
  meta?: ReactNode[];
  /** Status / meta chips beside the name (e.g. `ToneChip`). */
  chips?: ReactNode;
  /** Ways to reach the record. Not shown in the compact variant. */
  links?: EntityIdentityLink[];
  /** Right-hand actions (e.g. `WtButton`s). */
  actions?: ReactNode;
  /** Renders a Back icon button before the avatar. */
  onBack?: () => void;
  variant?: 'full' | 'compact';
  sx?: SxProps<Theme>;
}

function isAvatarDescriptor(avatar: unknown): avatar is EntityIdentityAvatar {
  return (
    !!avatar
    && typeof avatar === 'object'
    && !isValidElement(avatar)
    && !Array.isArray(avatar)
    && typeof (avatar as { name?: unknown }).name === 'string'
  );
}

function hasContent(node: ReactNode): boolean {
  return node !== null && node !== undefined && node !== false && node !== true && node !== '';
}

function MetaLine({ items, compact }: { items: ReactNode[]; compact: boolean }) {
  return (
    <Typography
      variant="body2"
      component="div"
      color="text.secondary"
      noWrap={compact}
      sx={compact
        ? { fontSize: 12, lineHeight: 1.35, minWidth: 0, maxWidth: '100%' }
        : { display: 'flex', flexWrap: 'wrap', alignItems: 'center', columnGap: 0.75, rowGap: 0.25 }}
    >
      {items.map((item, i) => (
        <Fragment key={i}>
          {i > 0 && (
            <Box component="span" aria-hidden sx={{ color: 'text.disabled', mx: compact ? 0.75 : 0 }}>
              ·
            </Box>
          )}
          <Box
            component="span"
            sx={i === 0 && !compact ? { color: 'text.primary', fontWeight: 600 } : undefined}
          >
            {item}
          </Box>
        </Fragment>
      ))}
    </Typography>
  );
}

const LINK_SX = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 0.75,
  minWidth: 0,
  maxWidth: '100%',
} as const;

const ELLIPSIS_SX = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as const;

export function EntityIdentityHeader({
  title,
  avatar,
  meta,
  chips,
  links,
  actions,
  onBack,
  variant = 'full',
  sx,
}: EntityIdentityHeaderProps) {
  const compact = variant === 'compact';
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));
  const metaItems = (meta ?? []).filter(hasContent);
  const visibleLinks = compact ? [] : (links ?? []).filter((l) => l && l.label);
  const titleText = typeof title === 'string' ? title : undefined;
  const avatarSize = compact ? 36 : isXs ? 64 : 84;

  const avatarNode = isAvatarDescriptor(avatar) ? (
    <SmartAvatar
      name={avatar.name}
      id={avatar.id}
      imageUrl={avatar.src}
      size={avatarSize}
      shape={compact ? 'circle' : 'rounded'}
      imageFit="cover"
      status={avatar.status ?? null}
      enablePreview={!compact}
    />
  ) : hasContent(avatar as ReactNode) ? (avatar as ReactNode) : null;

  const backButton = onBack ? (
    <WtIconButton
      onClick={onBack}
      title="Back"
      sx={{
        flexShrink: 0,
        width: 32,
        height: 32,
        borderRadius: '10px',
        bgcolor: 'transparent',
        borderColor: 'transparent',
        mt: compact ? 0 : 0.25,
      }}
    >
      <AppIcon name="arrow-left" className="fs-3" aria-hidden />
    </WtIconButton>
  ) : null;

  const sxList = Array.isArray(sx) ? sx : [sx];

  if (compact) {
    return (
      <Box
        sx={[
          {
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            minWidth: 0,
            bgcolor: 'transparent',
          },
          ...sxList,
        ] as SxProps<Theme>}
      >
        {backButton}
        {avatarNode && <Box sx={{ flexShrink: 0, display: 'flex' }}>{avatarNode}</Box>}
        <Box
          data-testid="entity-identity-text"
          sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.125, overflow: 'hidden' }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
            <Typography
              component="div"
              noWrap
              title={titleText}
              sx={{ fontWeight: 600, fontSize: 14, lineHeight: 1.35, color: 'text.primary', minWidth: 0, flex: '1 1 auto' }}
            >
              {title}
            </Typography>
            {chips && <Box sx={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>{chips}</Box>}
          </Box>
          {metaItems.length > 0 && <MetaLine items={metaItems} compact />}
        </Box>
        {actions && (
          <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 1 }}>{actions}</Box>
        )}
      </Box>
    );
  }

  return (
    <GlassSurface
      variant="thin"
      radius={16}
      sx={[
        {
          p: { xs: 2, md: 2.5 },
          display: 'flex',
          alignItems: 'flex-start',
          gap: { xs: 1.5, md: 2.5 },
          flexWrap: { xs: 'wrap', md: 'nowrap' },
          minWidth: 0,
        },
        ...sxList,
      ] as SxProps<Theme>}
    >
      {backButton}
      {avatarNode && <Box sx={{ flexShrink: 0, display: 'flex' }}>{avatarNode}</Box>}

      <Stack spacing={0.75} sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" alignItems="center" gap={1} sx={{ minWidth: 0, flexWrap: 'wrap' }}>
          <Typography
            variant="h5"
            // h5 is the visual scale only: on a detail page this follows the page h1.
            component="h2"
            noWrap
            title={titleText}
            sx={{ fontWeight: 700, lineHeight: 1.2, color: 'text.primary', minWidth: 0, maxWidth: '100%' }}
          >
            {title}
          </Typography>
          {chips && <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>{chips}</Box>}
        </Stack>

        {metaItems.length > 0 && <MetaLine items={metaItems} compact={false} />}

        {visibleLinks.length > 0 && (
          <Stack direction="row" alignItems="center" columnGap={2} rowGap={0.5} flexWrap="wrap" sx={{ pt: 0.25, minWidth: 0 }}>
            {visibleLinks.map((l, i) => {
              const content = (
                <>
                  <AppIcon name={l.icon} className="fs-6" aria-hidden />
                  <Box component="span" sx={ELLIPSIS_SX}>{l.label}</Box>
                </>
              );
              return l.href ? (
                <Link key={`${l.icon}-${i}`} href={l.href} underline="hover" variant="body2" color="text.primary" sx={LINK_SX}>
                  {content}
                </Link>
              ) : (
                <Typography key={`${l.icon}-${i}`} variant="body2" component="span" color="text.secondary" sx={LINK_SX}>
                  {content}
                </Typography>
              );
            })}
          </Stack>
        )}
      </Stack>

      {actions && (
        <Stack
          direction="row"
          gap={1}
          flexWrap="wrap"
          sx={{
            flexShrink: 0,
            width: { xs: '100%', md: 'auto' },
            justifyContent: { md: 'flex-end' },
          }}
        >
          {actions}
        </Stack>
      )}
    </GlassSurface>
  );
}

export default EntityIdentityHeader;
