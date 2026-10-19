import { cn } from './cn';

/**
 * Tailwind spinner for surfaces already on the TW kit (`ui/tw`).
 * Product / Formik screens use MUI `CircularProgress` or `PageLoader` instead —
 * do not grow a parallel form loading API here. `size` is px; `color` defaults
 * to brand navy (pass `#fff` inside CTA buttons).
 */
export function Spinner({ size = 18, color = '#1E3A8A', className, thickness = 2 }: { size?: number; color?: string; className?: string; thickness?: number }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn('inline-block animate-spin rounded-full align-[-0.125em]', className)}
      style={{ width: size, height: size, borderWidth: thickness, borderStyle: 'solid', borderColor: `${color}33`, borderTopColor: color }}
    />
  );
}
