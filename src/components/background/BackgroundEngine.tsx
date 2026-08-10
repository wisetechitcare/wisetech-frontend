import { useEffect, useRef } from 'react';
import { DotFieldEngine } from './engine';

/**
 * The application's ambient background — a procedural dot grid with a cursor-proximity
 * response, on one canvas.
 *
 * ─── REACT DOES NOT PARTICIPATE IN A FRAME ───────────────────────────────────
 * This component has NO state and renders exactly once. Everything — pointer tracking,
 * easing, painting, theme changes, resizes — happens inside DotFieldEngine against a ref.
 * A `useState` for the cursor here would re-render the entire subtree on every pointermove,
 * which is the classic way this kind of effect quietly destroys an app's performance.
 *
 * ─── INDEPENDENT OF THE NAVIGATION SYSTEM ────────────────────────────────────
 * It knows nothing about routes, applications, the workspace shell or the dock, and nothing
 * in those knows about it. It can be deleted by removing one line from MasterLayout.
 *
 * ─── SCOPED TO ITS HOST, NOT THE VIEWPORT ────────────────────────────────────
 * `absolute inset-0` inside whichever positioned container renders it — the Home stage —
 * rather than `fixed` over the whole app. That is what makes it robust here: a fixed canvas
 * has to negotiate Metronic's stacking contexts and hope no ancestor paints an opaque
 * background over it. An absolute canvas fills exactly one container it is a child of, and
 * `z-0` puts it under that container's own content with no negative-index guesswork.
 *
 * The engine measures the parent's rect and converts pointer coordinates into its space, so
 * the field lands wherever it is mounted with no configuration.
 *
 * `pointer-events: none` means it can never intercept a click.
 */
export function BackgroundEngine() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    let engine: DotFieldEngine;
    try {
      engine = new DotFieldEngine(canvas);
    } catch {
      // No 2D context (very old browser, or a canvas-blocking privacy extension). The
      // background is decorative, so failing to create it must never take the app with it.
      return;
    }
    engine.start();
    return () => engine.destroy();
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0"
    />
  );
}

export default BackgroundEngine;
