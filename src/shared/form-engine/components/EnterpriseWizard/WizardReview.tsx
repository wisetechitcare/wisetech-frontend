import React from 'react';
import { Box, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import {
  AppIcon, DetailCard, DetailGrid, KeyValueList, SectionDivider, TRIO, WtButton, type Trio,
} from '@app/modules/common/components/ui';
import type { SummaryRow, WizardDraftStatus } from '../../types/formEngine.types';

/**
 * Shared pieces of the two wizard layouts (`steps` and `sections`): the optional
 * final Review step, the draft-save status line, and the visually-hidden heading
 * that names the step on screen. Both layouts render these so they cannot drift.
 */

/** Id of the synthetic Review step. Never a real step id, never counted as progress. */
export const REVIEW_STEP_ID = '__wizard_review__';
export const REVIEW_ICON = 'eye';
export const REVIEW_TONE: Trio = TRIO.purple;
export const DEFAULT_REVIEW_TITLE = 'Review';

/** Hidden from sight, kept for assistive tech (heading outline, live regions). */
export const SR_ONLY_SX = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  p: 0,
  m: '-1px',
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
} as const;

// ── Review status ─────────────────────────────────────────────────────────────

export type ReviewStatusKind = 'complete' | 'missing' | 'error' | 'optional';

export interface ReviewStatus {
  kind: ReviewStatusKind;
  text: string;
}

export interface ReviewStatusInput {
  /** The step owns at least one Formik error. */
  hasErrors: boolean;
  /** Required fields of the step that are still empty. */
  missingRequired: number;
  /** A structural requirement (`isComplete`) is declared and not met. */
  structuralIncomplete?: boolean;
  /** The step declares any requirement at all (required fields or `isComplete`). */
  hasRequirement: boolean;
  /** Any of the step's fields holds a value. */
  hasAnyValue: boolean;
}

/** One status per review card, worst first. The text always states it — never colour alone. */
export function reviewStatusOf({
  hasErrors, missingRequired, structuralIncomplete = false, hasRequirement, hasAnyValue,
}: ReviewStatusInput): ReviewStatus {
  if (hasErrors) return { kind: 'error', text: 'Has errors' };
  if (missingRequired > 0) return { kind: 'missing', text: `${missingRequired} required missing` };
  if (structuralIncomplete) return { kind: 'missing', text: 'Required details missing' };
  if (!hasRequirement && !hasAnyValue) return { kind: 'optional', text: 'Optional · nothing entered' };
  return { kind: 'complete', text: 'Complete' };
}

type PaletteKey = 'success' | 'warning' | 'error';

/** Readable on paper in both modes: the darker shade on light, the lighter on dark. */
const toneInk = (key: PaletteKey) => (theme: Theme) =>
  theme.palette.mode === 'dark' ? theme.palette[key].light : theme.palette[key].dark;

const STATUS_LOOK: Record<ReviewStatusKind, { icon: string; color: (theme: Theme) => string; strong: boolean }> = {
  complete: { icon: 'check-circle', color: toneInk('success'), strong: false },
  missing: { icon: 'information-5', color: toneInk('warning'), strong: true },
  error: { icon: 'cross-circle', color: toneInk('error'), strong: true },
  optional: { icon: 'information-5', color: (theme) => theme.palette.text.secondary, strong: false },
};

export function ReviewStatusText({ status }: { status: ReviewStatus }) {
  const look = STATUS_LOOK[status.kind];
  return (
    <Box
      component="span"
      data-review-status={status.kind}
      sx={(theme) => ({
        display: 'inline-flex', alignItems: 'center', gap: 0.5,
        color: look.color(theme), fontWeight: look.strong ? 700 : 500,
      })}
    >
      <AppIcon name={look.icon} aria-hidden fallbackSize={14} />
      {status.text}
    </Box>
  );
}

// ── Review step ───────────────────────────────────────────────────────────────

export interface WizardReviewItem {
  id: string;
  title: string;
  tone: Trio;
  /** The step's icon. A KT icon name shows on the card; a node falls back to a neutral glyph. */
  icon: React.ReactNode;
  status: ReviewStatus;
  rows?: SummaryRow[];
}

export interface WizardReviewProps {
  title: string;
  identity?: React.ReactNode;
  items: WizardReviewItem[];
  onEdit: (id: string) => void;
  disabled?: boolean;
}

/** Read-only recap: one DetailCard per real step, each with its status and an Edit jump. */
export function WizardReview({ title, identity, items, onEdit, disabled }: WizardReviewProps) {
  const attention = items.filter((item) => item.status.kind === 'error' || item.status.kind === 'missing').length;
  return (
    <Box data-wizard-review>
      <SectionDivider tone={REVIEW_TONE} icon={REVIEW_ICON} label={title} sx={{ mt: 0 }} />
      {identity != null && <Box sx={{ mb: 2 }}>{identity}</Box>}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        {attention > 0
          ? `${attention} ${attention === 1 ? 'section needs' : 'sections need'} attention before you submit.`
          : 'Check each section, then submit.'}
      </Typography>
      <DetailGrid>
        {items.map((item) => (
          <DetailCard
            key={item.id}
            tone={item.tone}
            icon={typeof item.icon === 'string' && item.icon ? item.icon : 'abstract-26'}
            title={item.title}
            subtitle={<ReviewStatusText status={item.status} />}
            action={(
              <WtButton ghost size="small" onClick={() => onEdit(item.id)} disabled={disabled} aria-label={`Edit ${item.title}`}>
                Edit
              </WtButton>
            )}
          >
            {item.rows ? <KeyValueList rows={item.rows} /> : undefined}
          </DetailCard>
        ))}
      </DetailGrid>
    </Box>
  );
}

// ── Draft status ──────────────────────────────────────────────────────────────

const DRAFT_TEXT: Record<Exclude<WizardDraftStatus, 'idle'>, string> = {
  saving: 'Saving…',
  saved: 'Saved',
  failed: 'Save failed — your changes are still here',
  conflict: 'Conflict — reload to see the latest',
};

const DRAFT_LOOK: Record<Exclude<WizardDraftStatus, 'idle'>, { icon: string; color: (theme: Theme) => string }> = {
  saving: { icon: 'arrows-circle', color: (theme) => theme.palette.text.secondary },
  saved: { icon: 'check-circle', color: toneInk('success') },
  failed: { icon: 'cross-circle', color: toneInk('error') },
  conflict: { icon: 'information-5', color: toneInk('warning') },
};

/** An in-flight save always reads as 'saving', whatever the last outcome was. */
export function resolveDraftStatus(status?: WizardDraftStatus, saving?: boolean): WizardDraftStatus {
  return saving ? 'saving' : status ?? 'idle';
}

/**
 * Polite live region beside the draft button. Always mounted so a change is announced;
 * while idle it is empty and out of the layout. `quietWhileSaving` keeps 'Saving…'
 * announced but off screen when the draft button already reads "Saving…" itself.
 */
export function WizardDraftStatusText({ status, quietWhileSaving = false }: {
  status: WizardDraftStatus;
  quietWhileSaving?: boolean;
}) {
  const idle = status === 'idle';
  const hidden = idle || (quietWhileSaving && status === 'saving');
  const look = idle ? null : DRAFT_LOOK[status];
  return (
    <Typography
      component="span"
      role="status"
      aria-live="polite"
      data-draft-status={status}
      sx={[
        (theme: Theme) => ({
          display: 'inline-flex', alignItems: 'center', gap: 0.5, alignSelf: 'center',
          fontSize: 12.5, fontWeight: 600, minWidth: 0,
          color: look ? look.color(theme) : theme.palette.text.secondary,
        }),
        hidden ? SR_ONLY_SX : {},
      ] as SxProps<Theme>}
    >
      {look && <AppIcon name={look.icon} aria-hidden fallbackSize={14} />}
      {idle ? '' : DRAFT_TEXT[status]}
    </Typography>
  );
}
