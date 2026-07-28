import { WtButton } from './Buttons';
import { cn } from './cn';

/**
 * ErrorState — the canonical "this section failed to load" surface.
 *
 * Replaces silent `console.error`-only failure paths with something the user can
 * see and act on (Nielsen #1 visibility, #9 recovery). Theme-aware (light/dark),
 * announced to assistive tech via `role="alert"`, and self-contained so any
 * screen — MUI or Tailwind — can drop it in.
 */
export interface ErrorStateProps {
  title?: string;
  message?: string;
  /** Show a retry button wired to this handler. */
  onRetry?: () => void;
  /** Reflects an in-flight retry (disables + relabels the button). */
  retrying?: boolean;
  retryLabel?: string;
  /** Tighter padding for inline/section use. */
  compact?: boolean;
  className?: string;
}

export function ErrorState({
  title = 'Couldn’t load this section',
  message = 'Something went wrong while fetching the data. Check your connection and try again.',
  onRetry,
  retrying = false,
  retryLabel = 'Try again',
  compact = false,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-2xl border text-center',
        'border-rose-200 bg-rose-50/70 text-slate-600',
        'dark:border-rose-500/25 dark:bg-rose-500/[0.07] dark:text-slate-300',
        compact ? 'px-5 py-6' : 'px-6 py-12',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="grid h-11 w-11 place-items-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </span>
      <div>
        <div className="text-[15px] font-semibold text-slate-800 dark:text-white">{title}</div>
        <p className="mx-auto mt-1 max-w-sm text-[13.5px] leading-relaxed">{message}</p>
      </div>
      {onRetry && (
        <WtButton onClick={onRetry} disabled={retrying} className="mt-1">
          {retrying ? 'Retrying…' : retryLabel}
        </WtButton>
      )}
    </div>
  );
}

export default ErrorState;
