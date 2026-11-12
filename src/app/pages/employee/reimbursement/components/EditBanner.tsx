import { Badge } from '@/ds/ui/badge';
import type { IconComponent } from '@/ds/ui/dynamic-icon';
import { cn } from '@/ds/lib/utils';
import { CircleX, CircleQuestionMark, Pencil } from 'lucide-react';

/**
 * Contextual banner displayed at the top of an edit form.
 *
 * Shows why the user is editing: after rejection, after query, or regular edit.
 * This banner always remains visible and helps the user understand the context.
 */

export type EditContext = 'rejection' | 'query' | 'edit';

export interface EditBannerProps {
  context: EditContext;
  rejectionReason?: string;
  queryText?: string;
  level?: number;
}

const CONTEXT_CONFIG: Record<
  EditContext,
  {
    icon: IconComponent;
    title: string;
    /** The kit Badge variant for the chip. */
    badge: 'danger' | 'warning' | 'brand';
    /** Soft fill + edge for the strip, and the readable ink for the icon and eyebrow, per tone. */
    strip: string;
    inner: string;
    ink: string;
    label: string;
  }
> = {
  rejection: {
    icon: CircleX,
    title: 'Editing After Rejection',
    badge: 'danger',
    strip: 'bg-destructive-soft border-destructive/25',
    inner: 'border-destructive/15',
    ink: 'text-destructive-foreground',
    label: 'Rejected',
  },
  query: {
    icon: CircleQuestionMark,
    title: 'Updating Based on Query',
    badge: 'warning',
    strip: 'bg-warning-soft border-warning/25',
    inner: 'border-warning/15',
    ink: 'text-warning-foreground',
    label: 'Query',
  },
  edit: {
    icon: Pencil,
    title: 'Editing Reimbursement',
    badge: 'brand',
    strip: 'bg-accent border-primary/25',
    inner: 'border-primary/15',
    ink: 'text-accent-foreground',
    label: 'Edit',
  },
};

export default function EditBanner({
  context,
  rejectionReason,
  queryText,
  level,
}: EditBannerProps) {
  const config = CONTEXT_CONFIG[context];
  const eyebrow = cn('text-[10.5px] font-extrabold uppercase tracking-[0.04em]', config.ink);

  return (
    <div className={cn('flex min-w-0 flex-col gap-2 rounded-xl border p-3', config.strip)}>
      {/* Header */}
      <div className="flex items-center gap-1.5">
        <span className={config.ink}>
          <config.icon className="size-[18px]" />
        </span>
        <h4 data-slot="banner-title" className="m-0 text-[13px] font-extrabold text-foreground">{config.title}</h4>
        <Badge variant={config.badge} className="ml-auto border-current/40 bg-card">{config.label}</Badge>
      </div>

      {/* Reason/Query text */}
      {(rejectionReason || queryText) && (
        <div className={cn('min-w-0 rounded-lg border bg-card p-2', config.inner)}>
          {rejectionReason && (
            <div className="flex flex-col gap-1">
              <p data-slot="banner-eyebrow" className={cn('m-0', eyebrow)}>Rejection Reason</p>
              <p data-slot="banner-text" className="m-0 break-words text-[12.5px] leading-[1.4] text-foreground">"{rejectionReason}"</p>
            </div>
          )}
          {queryText && (
            <div className="flex flex-col gap-1">
              <p data-slot="banner-eyebrow" className={cn('m-0', eyebrow)}>
                Approver Query
                {level && ` (Level ${level})`}
              </p>
              <p data-slot="banner-text" className="m-0 break-words text-[12.5px] leading-[1.4] text-foreground">"{queryText}"</p>
            </div>
          )}
        </div>
      )}

      {/* Helper text */}
      <p data-slot="banner-hint" className="m-0 text-[11px] italic text-muted-foreground">
        {context === 'rejection' &&
          'Make the necessary corrections and resubmit for approval.'}
        {context === 'query' &&
          'Update your reimbursement based on the approver feedback and resubmit.'}
        {context === 'edit' &&
          'Update your reimbursement and resubmit for approval.'}
      </p>
    </div>
  );
}
