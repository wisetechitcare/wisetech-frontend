import { Spinner as KitSpinner } from '@/ds/ui/spinner';
import { cn } from './cn';

/**
 * Adapter for the TW kit's spinner API, so its call sites keep their props: the loader itself is the design
 * system's one Spinner (src/ds/ui/spinner.tsx — the chasing dots). `size` is px; `color` paints the dots
 * (pass `#fff` inside CTA buttons) and otherwise they take the brand colour. `thickness` belonged to the old
 * ring and is accepted but unused.
 */
export function Spinner({ size = 18, color, className }: { size?: number; color?: string; className?: string; thickness?: number }) {
  return (
    <KitSpinner
      className={cn(!color && 'text-primary', className)}
      // Arbitrary px size and caller colours are runtime values, so they ride on style (the kit sizes by class).
      style={{ width: size, height: size, ...(color ? { color } : {}) }}
    />
  );
}
