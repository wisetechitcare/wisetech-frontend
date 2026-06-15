/**
 * Professional, dependency-free line icons (Lucide/Feather style).
 * Stroke-based, inherit `currentColor`, crisp at any size. Reusable app-wide.
 */
import { CSSProperties } from 'react';

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: CSSProperties;
  className?: string;
}

const base = (size: number, color: string, sw: number, style?: CSSProperties, className?: string) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: color,
  strokeWidth: sw,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  style,
  className,
});

export function IconBuilding({ size = 18, color = 'currentColor', strokeWidth = 1.8, style, className }: IconProps) {
  return (
    <svg {...base(size, color, strokeWidth, style, className)}>
      <rect x="3" y="3" width="11" height="18" rx="1.5" />
      <path d="M14 8h5a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-5" />
      <path d="M7 7h3M7 11h3M7 15h3" />
      <path d="M17 12h0M17 16h0" />
    </svg>
  );
}

export function IconHierarchy({ size = 18, color = 'currentColor', strokeWidth = 1.8, style, className }: IconProps) {
  return (
    <svg {...base(size, color, strokeWidth, style, className)}>
      <rect x="9" y="2.5" width="6" height="6" rx="1.2" />
      <rect x="2.5" y="15.5" width="6" height="6" rx="1.2" />
      <rect x="15.5" y="15.5" width="6" height="6" rx="1.2" />
      <path d="M12 8.5v3.5M5.5 15.5V13a1 1 0 0 1 1-1h11a1 1 0 0 1 1 1v2.5" />
    </svg>
  );
}

export function IconBranch({ size = 18, color = 'currentColor', strokeWidth = 1.8, style, className }: IconProps) {
  return (
    <svg {...base(size, color, strokeWidth, style, className)}>
      <path d="M12 21s-6.5-5.2-6.5-10.5A6.5 6.5 0 0 1 12 4a6.5 6.5 0 0 1 6.5 6.5C18.5 15.8 12 21 12 21z" />
      <circle cx="12" cy="10.5" r="2.4" />
    </svg>
  );
}

export function IconUsers({ size = 18, color = 'currentColor', strokeWidth = 1.8, style, className }: IconProps) {
  return (
    <svg {...base(size, color, strokeWidth, style, className)}>
      <path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5H7a3.5 3.5 0 0 0-3.5 3.5V20" />
      <circle cx="9.75" cy="8" r="3.25" />
      <path d="M20.5 20v-1.5a3.5 3.5 0 0 0-2.6-3.38M15.5 4.9a3.25 3.25 0 0 1 0 6.2" />
    </svg>
  );
}

export function IconSearch({ size = 18, color = 'currentColor', strokeWidth = 1.8, style, className }: IconProps) {
  return (
    <svg {...base(size, color, strokeWidth, style, className)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function IconPlus({ size = 18, color = 'currentColor', strokeWidth = 2, style, className }: IconProps) {
  return (
    <svg {...base(size, color, strokeWidth, style, className)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconEdit({ size = 18, color = 'currentColor', strokeWidth = 1.8, style, className }: IconProps) {
  return (
    <svg {...base(size, color, strokeWidth, style, className)}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  );
}

export function IconTrash({ size = 18, color = 'currentColor', strokeWidth = 1.8, style, className }: IconProps) {
  return (
    <svg {...base(size, color, strokeWidth, style, className)}>
      <path d="M3 6h18" />
      <path d="M19 6v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function IconChevron({ size = 18, color = 'currentColor', strokeWidth = 2.2, style, className }: IconProps) {
  return (
    <svg {...base(size, color, strokeWidth, style, className)}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function IconImage({ size = 18, color = 'currentColor', strokeWidth = 1.8, style, className }: IconProps) {
  return (
    <svg {...base(size, color, strokeWidth, style, className)}>
      <rect x="3" y="3" width="18" height="18" rx="2.5" />
      <circle cx="8.5" cy="8.5" r="1.8" />
      <path d="m21 16-4.5-4.5a2 2 0 0 0-2.8 0L4 21" />
    </svg>
  );
}

export function IconGear({ size = 18, color = 'currentColor', strokeWidth = 1.8, style, className }: IconProps) {
  return (
    <svg {...base(size, color, strokeWidth, style, className)}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 13.5a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-2.82-1.17l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 13.5H4.5a2 2 0 0 1 0-4h.1A1.65 1.65 0 0 0 5.77 6.7l-.06-.06A2 2 0 1 1 8.54 3.8l.06.06A1.65 1.65 0 0 0 11.4 2.7V2.5a2 2 0 0 1 4 0v.1a1.65 1.65 0 0 0 2.82 1.17l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9.5a1.65 1.65 0 0 0 1.48.92h.1a2 2 0 0 1 0 4h-.1a1.65 1.65 0 0 0-1.48.92z" />
    </svg>
  );
}

export function IconClose({ size = 18, color = 'currentColor', strokeWidth = 2, style, className }: IconProps) {
  return (
    <svg {...base(size, color, strokeWidth, style, className)}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function IconArrowLeft({ size = 18, color = 'currentColor', strokeWidth = 2, style, className }: IconProps) {
  return (
    <svg {...base(size, color, strokeWidth, style, className)}>
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}
