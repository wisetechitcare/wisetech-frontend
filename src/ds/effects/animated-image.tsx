import * as React from "react"
import { cn } from "cn"
import { useReducedMotion } from "@/ds/lib/motion"

/** A crop of the image's own pixels — trims transparent margins an exported animation often carries. */
export type ImageCrop = {
  /** The image's natural size, px. */
  width: number
  height: number
  /** The visible box inside it, px. */
  x: number
  y: number
  w: number
  h: number
}

/**
 * An illustration that moves only for a moment: a light still paints first, the animation (GIF / animated
 * WebP) loads in the background and takes over while `playing`, and when `playing` turns false it finishes the
 * loop it is in and rests on the still — no jump, because the still is the loop's first frame. For moments only
 * (a sign-in brand panel), never in working screens.
 *
 * - Ends within one loop of `playing` turning false (keep `loopMs` short: WCAG 2.2.2 wants motion to end ~5s).
 * - Never moves under reduced motion — the still only, and the animation is never downloaded.
 * - Pass `animated` only where it should load (e.g. desktop): without it this is just the still.
 * - Decorative: hidden from assistive tech.
 */
export function AnimatedImage({
  still,
  animated,
  loopMs,
  playing,
  crop,
  className,
}: {
  /** The resting frame — the animation's FIRST frame, so the hand-over is seamless. Small (WebP/PNG). */
  still: string
  /** The animation; omit to show only the still. Loaded in the background, never blocking the first paint. */
  animated?: string
  /** One loop of the animation, ms. */
  loopMs: number
  /** Moving while true; false = finish the current loop, then rest for good. */
  playing: boolean
  crop?: ImageCrop
  className?: string
}) {
  const reduced = useReducedMotion()
  const [ready, setReady] = React.useState(false)
  const [moving, setMoving] = React.useState(false)
  /** Once at rest it stays at rest — the moment is over. */
  const done = React.useRef(false)
  const startedAt = React.useRef(0)

  // Preload the animation in the background; it takes over only once it is fully loaded.
  React.useEffect(() => {
    if (!animated || reduced || done.current || !playing) return
    let cancelled = false
    const img = new Image()
    img.onload = () => !cancelled && setReady(true)
    img.src = animated
    return () => {
      cancelled = true
    }
  }, [animated, reduced, playing])

  React.useEffect(() => {
    if (ready && playing && !done.current && !reduced) {
      startedAt.current = performance.now()
      setMoving(true)
    }
  }, [ready, playing, reduced])

  // Stop at the end of the loop in progress.
  React.useEffect(() => {
    if (!moving || playing) return
    const elapsed = performance.now() - startedAt.current
    const timer = window.setTimeout(() => {
      done.current = true
      setMoving(false)
    }, loopMs - (elapsed % loopMs))
    return () => window.clearTimeout(timer)
  }, [moving, playing, loopMs])

  const showAnimated = moving && !reduced && Boolean(animated)
  const src = showAnimated ? animated! : still

  if (!crop) {
    return <img data-slot="animated-image" data-moving={showAnimated || undefined} src={src} alt="" aria-hidden="true" className={cn("block h-auto w-full", className)} />
  }
  // Crop: a box with the visible area's aspect ratio; the image is scaled and shifted so only that area shows.
  return (
    <div
      data-slot="animated-image"
      data-moving={showAnimated || undefined}
      aria-hidden="true"
      className={cn("relative w-full overflow-hidden [aspect-ratio:var(--crop-w)/var(--crop-h)]", className)}
      style={
        {
          "--crop-nw": crop.width,
          "--crop-x": crop.x,
          "--crop-y": crop.y,
          "--crop-w": crop.w,
          "--crop-h": crop.h,
        } as React.CSSProperties
      }
    >
      <img
        src={src}
        alt=""
        className="absolute top-[calc(var(--crop-y)/var(--crop-h)*-100%)] left-[calc(var(--crop-x)/var(--crop-w)*-100%)] w-[calc(var(--crop-nw)/var(--crop-w)*100%)] max-w-none"
      />
    </div>
  )
}
