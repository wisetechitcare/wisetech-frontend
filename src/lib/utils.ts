import { clsx, type ClassValue } from "clsx";

/**
 * `cn` — class-name combiner used by registry (shadcn / React Bits) components.
 * Uses clsx (already a dependency). If Tailwind class conflicts ever need
 * resolving, add `tailwind-merge` and wrap: `twMerge(clsx(inputs))`.
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
