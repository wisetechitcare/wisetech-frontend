/**
 * Golden confetti burst for the rank-1 reveal — the kit's celebrate() in gold.
 * celebrate() owns the lazy js-confetti import and the one removable canvas.
 */
import { celebrate, clearCelebration } from "@/ds/effects/celebrate";

const GOLD_COLORS = ["#FFD700", "#FDE68A", "#F5C518", "#B8860B", "#FFF3B0"];

export function fireGoldConfetti(): Promise<void> {
  return celebrate({ confettiColors: GOLD_COLORS, confettiNumber: 120 });
}

export function destroyConfetti(): void {
  clearCelebration();
}
