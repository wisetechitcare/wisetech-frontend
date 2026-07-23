import clsx, { type ClassValue } from 'clsx';

/**
 * `cn` — the single class-name composer for the Tailwind kit.
 *
 * Thin wrapper over `clsx` so every kit component merges base + variant +
 * caller `className` the same way, with the caller's classes placed LAST so
 * they win ordering ties. (No `tailwind-merge` in the dep tree yet; kit
 * components are authored so callers rarely need to override base utilities —
 * they extend layout/spacing, which don't conflict.)
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
