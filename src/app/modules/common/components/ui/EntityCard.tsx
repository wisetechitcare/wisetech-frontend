/**
 * EntityCard — the ONE collection-card layout for Roles, Adverts, Candidates, Projects, …
 *
 * Composes GlassCard + ToneChip so features stop hand-rolling title / subtitle / status /
 * meta-pill / footer stacks. Pass ReactNode for `actions` (ActionIconButton / WtButton rows)
 * and an array of tag objects for status + meta pills — enough for Role today and Candidate
 * tomorrow without a second card primitive.
 *
 * Prefer this inside AutoGrid. Do not invent a parallel card in a feature folder.
 */
import type { ReactNode, MouseEvent } from 'react';
import { Box, Stack, Typography, type SxProps, type Theme } from '@mui/material';
import { GlassCard, type GlassCardProps } from './glass';
import { ToneChip } from './chips';
import type { SemanticTone } from './tokens';
import { IconBox, TRIO, type Trio } from './patterns';

/** Soft pastel pill — maps to ToneChip semantic tones (Open → success, Draft → warning, …). */
export interface EntityCardTag {
  label: string;
  tone?: SemanticTone;
  /** Identity colour (admin-configured). Overrides `tone` when set. */
  color?: string;
}

export interface EntityCardProps {
  title: ReactNode;
  /** Req ID / prefix / secondary identifier under the title. */
  subtitle?: ReactNode;
  /** Department, branch, or other category line (muted). */
  category?: ReactNode;
  /** Optional body copy (clamped to 2 lines). */
  description?: ReactNode;
  /**
   * Leading identity tile — KTIcon name or a node. Entity *type* (briefcase / share),
   * not status (chips already carry Open / Draft / Published).
   */
  icon?: ReactNode;
  /** Tint for `icon`. Defaults to brand blue. */
  iconTrio?: Trio;
  /** Top-right status pills (Archived, Open, Draft / Published, …). */
  status?: EntityCardTag | EntityCardTag[];
  /** Meta pills under the body (filled count, location, CTC, …). */
  tags?: EntityCardTag[];
  /** Footer actions — Edit / Delete / Publish. Click does not bubble to `onClick`. */
  actions?: ReactNode;
  onClick?: () => void;
  /**
   * Hover lift. Defaults to true when `onClick` is set.
   * Uses GlassCard `interactive` (soft shadow + translateY) — not a feature-local hover.
   */
  interactive?: boolean;
  /** GlassCard left keyline when the entity has a vivid state. */
  accentEdge?: GlassCardProps['accentEdge'];
  sx?: SxProps<Theme>;
  children?: ReactNode;
}

function asTagList(value: EntityCardTag | EntityCardTag[] | undefined): EntityCardTag[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export function EntityCard({
  title,
  subtitle,
  category,
  description,
  icon,
  iconTrio = TRIO.blue,
  status,
  tags,
  actions,
  onClick,
  interactive,
  accentEdge,
  sx,
  children,
}: EntityCardProps) {
  const statusTags = asTagList(status);
  const metaTags = tags ?? [];
  const isInteractive = interactive ?? Boolean(onClick);

  const stopActions = (e: MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <GlassCard
      preset="row"
      interactive={isInteractive}
      accentEdge={accentEdge}
      onClick={onClick}
      sx={[
        {
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          height: '100%',
          p: 1.75,
          cursor: onClick ? 'pointer' : 'default',
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ] as SxProps<Theme>}
    >
      <Stack direction="row" alignItems="flex-start" spacing={1} sx={{ minWidth: 0 }}>
        {icon != null && icon !== '' && (
          <IconBox icon={icon} trio={iconTrio} size={40} fs="fs-3" />
        )}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            component="div"
            sx={{ fontWeight: 700, fontSize: 15, lineHeight: 1.3, color: 'text.primary', overflowWrap: 'anywhere' }}
          >
            {title}
          </Typography>
          {subtitle != null && subtitle !== '' && (
            <Typography
              component="div"
              sx={{
                fontSize: 11.5,
                color: 'text.disabled',
                fontWeight: 700,
                letterSpacing: '0.02em',
                mt: 0.15,
              }}
            >
              {subtitle}
            </Typography>
          )}
          {category != null && category !== '' && (
            <Typography
              component="div"
              sx={{ fontSize: 12.5, color: 'text.secondary', fontWeight: 500, mt: 0.35 }}
            >
              {category}
            </Typography>
          )}
        </Box>
        {statusTags.length > 0 && (
          <Stack direction="row" spacing={0.5} alignItems="center" flexShrink={0} flexWrap="wrap" useFlexGap>
            {statusTags.map((t) => (
              <ToneChip key={t.label} dense tone={t.tone} color={t.color} label={t.label} />
            ))}
          </Stack>
        )}
      </Stack>

      {description != null && description !== '' && (
        <Typography
          component="div"
          sx={{
            fontSize: 12.5,
            color: 'text.secondary',
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {description}
        </Typography>
      )}

      {metaTags.length > 0 && (
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.25 }}>
          {metaTags.map((t) => (
            <ToneChip key={t.label} dense tone={t.tone ?? 'neutral'} color={t.color} label={t.label} />
          ))}
        </Stack>
      )}

      {children}

      <Box sx={{ flex: 1 }} />

      {actions != null && (
        <Box
          onClick={stopActions}
          onKeyDown={(e) => e.stopPropagation()}
          sx={{ pt: 1, borderTop: '1px solid', borderColor: 'divider' }}
        >
          {actions}
        </Box>
      )}
    </GlassCard>
  );
}

export default EntityCard;
