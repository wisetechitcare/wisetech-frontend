import { cn } from './cn';

/**
 * Tailwind spinner — replaces MUI `CircularProgress` across the kit. `size` is
 * px; `color` defaults to the brand navy (pass '#fff' inside CTA buttons).
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
