/**
 * Golden confetti burst for the rank-1 reveal.
 *
 * - js-confetti is lazy-imported so it stays out of the initial/hot bundle
 *   (it isn't in vite manualChunks → gets its own async chunk).
 * - We own the <canvas> element so we can REMOVE it on cleanup. (BirthdayConfetti
 *   never removes its canvas; repeated replays/period-switches would otherwise
 *   stack canvases on document.body.)
 */
type JSConfettiCtor = typeof import("js-confetti").default;
type JSConfettiInstance = InstanceType<JSConfettiCtor>;

let instance: JSConfettiInstance | null = null;
let canvasEl: HTMLCanvasElement | null = null;

const GOLD_COLORS = ["#FFD700", "#FDE68A", "#F5C518", "#B8860B", "#FFF3B0"];

export async function fireGoldConfetti(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    if (!instance) {
      const { default: JSConfetti } = await import("js-confetti");
      canvasEl = document.createElement("canvas");
      canvasEl.style.position = "fixed";
      canvasEl.style.inset = "0";
      canvasEl.style.width = "100%";
      canvasEl.style.height = "100%";
      canvasEl.style.pointerEvents = "none";
      canvasEl.style.zIndex = "1200";
      document.body.appendChild(canvasEl);
      instance = new JSConfetti({ canvas: canvasEl });
    }
    await instance.addConfetti({
      confettiColors: GOLD_COLORS,
      confettiNumber: 120,
    });
  } catch {
    /* confetti is non-essential — never let it break the reveal */
  }
}

export function destroyConfetti(): void {
  try {
    instance?.clearCanvas();
  } catch {
    /* ignore */
  }
  if (canvasEl && canvasEl.parentNode) {
    canvasEl.parentNode.removeChild(canvasEl);
  }
  canvasEl = null;
  instance = null;
}
