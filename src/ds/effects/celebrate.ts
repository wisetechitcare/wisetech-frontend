import { prefersReducedMotion } from "@/ds/lib/motion"

type JSConfettiInstance =InstanceType<typeof import("js-confetti").default>

/** Passed straight to js-confetti's addConfetti: confettiColors, confettiNumber, confettiRadius, emojis, emojiSize. */
export type CelebrateOptions = NonNullable<Parameters<JSConfettiInstance["addConfetti"]>[0]>

let instance: JSConfettiInstance | null = null
let canvas: HTMLCanvasElement | null = null

/**
 * A confetti burst for a real celebration. js-confetti is lazy-loaded, so it stays out of the
 * initial bundle, and the whole app shares ONE canvas that we own, so clearCelebration() can
 * remove it (a bare `new JSConfetti()` appends a canvas to <body> that nothing ever removes).
 * Never throws: confetti is non-essential. A no-op under reduced motion.
 */
export async function celebrate(options?: CelebrateOptions): Promise<void> {
  if (typeof window === "undefined" || prefersReducedMotion()) return
  try {
    if (!instance) {
      const { default: JSConfetti } = await import("js-confetti")
      // Two first calls can both be waiting on the import; only one may create the canvas.
      if (!instance) {
        canvas = document.createElement("canvas")
        canvas.dataset.slot = "celebrate"
        canvas.setAttribute("aria-hidden", "true")
        canvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:1200"
        document.body.appendChild(canvas)
        instance = new JSConfetti({ canvas })
      }
    }
    await instance.addConfetti(options)
  } catch {
    /* never let confetti break the moment it celebrates */
  }
}

/** Clears and removes the canvas; the next celebrate() creates a fresh one. */
export function clearCelebration(): void {
  try {
    instance?.clearCanvas()
  } catch {
    /* ignore */
  }
  canvas?.remove()
  canvas = null
  instance = null
}
