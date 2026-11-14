import { useLayoutEffect, useRef, type CSSProperties } from "react";
import { cn } from "@/ds/lib/utils";
import type { OrgProfile } from "@app/modules/company-profile/profile";

/** The road's drawing box in cqw: the slide's content width (Frame's 4.4cqw side padding) by the road band's height. */
export const ROAD_W = 91.2;
export const ROAD_H = 5;
const TOP = 1;
const BOTTOM = ROAD_H - 1;

/**
 * One wave through every milestone, computed from the count alone (no DOM measuring, so stage, thumbnail and
 * print agree). Milestone i sits at x = (i + 1) · W / (n + 1), alternating high and low; the road's two ends
 * are the wave's own turning points at the edges. Every segment has the same width and horizontal tangents at
 * both ends, so each join is smooth (same direction and curvature) for any count.
 */
export function roadGeometry(count: number) {
  const step = ROAD_W / (count + 1);
  const points = Array.from({ length: count + 2 }, (_, k): [number, number] => [
    +(k * step).toFixed(3),
    k % 2 ? TOP : BOTTOM,
  ]);
  const d = points
    .map(([x, y], k) => {
      if (!k) return `M${x} ${y}`;
      const [px, py] = points[k - 1];
      const mx = +((px + x) / 2).toFixed(3);
      return `C${mx} ${py} ${mx} ${y} ${x} ${y}`;
    })
    .join(" ");
  return { d, nodes: points.slice(1, -1) };
}

const MIN_FIT = 0.6;

/**
 * Never lose a milestone: when About us overflows its slide (many milestones, long descriptions), shrink the
 * milestone text (`--fit`, 1 → MIN_FIT) to the largest size that fits, binary-searched in one synchronous pass.
 * Sizes are all cqw, so the result holds at every slide size. Re-fits when the slide's content box resizes (the
 * stage or the PDF export) and when fonts load.
 * `box` is Frame's content column, the section's parent.
 */
function fitToSlide(section: HTMLElement | null) {
  const box = section?.parentElement;
  const win = section?.ownerDocument.defaultView;
  if (!section || !box || !win?.ResizeObserver) return; // jsdom
  const fits = (f: number) => {
    section.style.setProperty("--fit", String(f));
    return box.scrollHeight <= box.clientHeight;
  };
  const fit = () => {
    if (fits(1)) return;
    let [lo, hi] = [MIN_FIT, 1];
    for (let i = 0; i < 7; i++) {
      const mid = (lo + hi) / 2;
      if (fits(mid)) lo = mid;
      else hi = mid;
    }
    // ponytail: below MIN_FIT text stops being readable; that many milestones would need a second slide.
    fits(lo);
  };
  fit();
  const ro = new win.ResizeObserver(fit);
  ro.observe(box);
  void section.ownerDocument.fonts?.ready.then(fit);
  return () => ro.disconnect();
}

/**
 * Our journey as a winding road (CRM About us only; the Storybook deck keeps the straight timeline).
 * Layout: n + 1 equal columns over three rows (labels above / the road / labels below). Each label spans the two
 * columns either side of its marker, so it is centred on it, and its same-row neighbours start where it ends.
 * The label rows size to their tallest label, so text of any length pushes away from the road, never onto it.
 */
export function WindingRoadJourney({
  milestones,
}: {
  milestones: OrgProfile["milestones"];
}) {
  const section = useRef<HTMLElement>(null);
  useLayoutEffect(() => fitToSlide(section.current), [milestones]);
  if (!milestones.length) return null;
  const n = milestones.length;
  const { d, nodes } = roadGeometry(n);
  return (
    <section ref={section} className="mt-auto pt-[1.4cqw]">
      <p className="text-[1.15cqw] font-bold tracking-[0.3em] text-[#c62828] uppercase">
        Our journey
      </p>
      {/* The column count is data; a custom property is the one inline style (as ProfileSlide's --slide-bg). */}
      <div
        className="mt-[0.8cqw] grid grid-cols-[repeat(var(--cols),minmax(0,1fr))] grid-rows-[auto_5cqw_auto] gap-y-[0.6cqw]"
        style={{ "--cols": n + 1 } as CSSProperties}
      >
        <svg
          aria-hidden
          viewBox={`0 0 ${ROAD_W} ${ROAD_H}`}
          preserveAspectRatio="none"
          className="col-span-full row-start-2 size-full"
        >
          <path
            d={d}
            fill="none"
            strokeWidth={1.4}
            className="stroke-(--s-ink)/20"
          />
          <path
            d={d}
            fill="none"
            strokeWidth={0.15}
            strokeDasharray="0.8 0.6"
            className="stroke-(--slide-bg)"
          />
          {nodes.map(([x, y], i) => (
            <circle
              key={x}
              cx={x}
              cy={y}
              r={0.75}
              strokeWidth={0.25}
              className={cn(
                "stroke-(--slide-bg)",
                i === n - 1 ? "fill-[#c62828]" : "fill-(--s-ink)",
              )}
            />
          ))}
        </svg>
        <ol className="col-span-full row-span-3 row-start-1 grid grid-cols-subgrid grid-rows-subgrid">
          {milestones.map((m, i) => (
            <li
              key={`${m.year}-${m.title}`}
              className={cn(
                "px-[0.8cqw] text-center col-[var(--at)/span_2]",
                i % 2 ? "row-start-3 self-start" : "row-start-1 self-end",
              )}
              style={{ "--at": i + 1 } as CSSProperties}
            >
              <p className="text-[calc(2cqw*var(--fit,1))] leading-none font-bold text-[#c62828] tabular-nums">
                {m.year}
              </p>
              <p className="mt-[calc(0.3cqw*var(--fit,1))] text-[calc(1.3cqw*var(--fit,1))] leading-tight font-bold text-(--s-ink)">
                {m.title}
              </p>
              <p className="mt-[calc(0.2cqw*var(--fit,1))] text-[calc(1.05cqw*var(--fit,1))] leading-snug text-(--s-body)">
                {m.text}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
