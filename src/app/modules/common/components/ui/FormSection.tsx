import React from 'react';
import { Stack } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { GlassSurface } from './glass';
import { SectionHead, type Trio } from './patterns';

/**
 * Form spacing rhythm (MUI 8px unit) — the middle distance used by dialog forms.
 *
 * pad 16 · card gap 12 · field gap 14 · control↔label 10.
 * Not cramped (≤8) and not airy (≥20 between related controls).
 * Import these instead of inventing per-screen magic numbers.
 */
export const FORM_SPACE = {
  /** Inner padding of a form card. */
  cardPad: 2,
  /** Gap between stacked form cards. */
  stackGap: 1.5,
  /** Gap between fields / rows inside a card. */
  fieldGap: 1.75,
  /** Gap inside a 2-up field grid. */
  rowGap: 1.5,
  /** Dialog body padding. */
  bodyPad: { xs: 1.5, sm: 2 } as const,
  /** Dialog footer padding. */
  footerPx: 2.5,
  footerPy: 1.5,
} as const;

export interface FormSectionProps {
  /** Accent tone for the leading IconBox. */
  tone: Trio;
  /** Kit icon name or React icon node, passed through SectionHead to IconBox. */
  icon: React.ReactNode;
  title: string;
  /** Optional one-line guidance under the title. */
  desc?: string;
  children?: React.ReactNode;
  sx?: SxProps<Theme>;
  /** Branded top rule used by primary wizard canvases. */
  accentTop?: boolean;
}

/**
 * FormSection — thin glass card + SectionHead + field stack.
 *
 * The shape every multi-block dialog form wants (Sandwich Add Rule, Leave Policy
 * editors, billing configure blocks). Settings screens that need an accent-top
 * rule and a right-side action stay on `SettingsSection`; this is the denser
 * dialog-form cousin that shares SectionHead typography and FORM_SPACE.
 *
 * @example
 * <FormSection tone={TRIO.blue} icon="document" title="Rule Details">
 *   <WtField label="Name" … />
 * </FormSection>
 */
export function FormSection({ tone, icon, title, desc, children, sx, accentTop = false }: FormSectionProps) {
  return (
    <GlassSurface
      variant="thin"
      sx={[
        {
          p: FORM_SPACE.cardPad,
          borderRadius: '12px',
          borderColor: 'divider',
          ...(accentTop && { borderTop: '3px solid', borderTopColor: 'primary.main' }),
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ] as SxProps<Theme>}
    >
      <Stack spacing={FORM_SPACE.fieldGap}>
        <SectionHead tone={tone} icon={icon} title={title} desc={desc} />
        {children}
      </Stack>
    </GlassSurface>
  );
}

export default FormSection;
