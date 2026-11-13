import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CSSProperties } from "react";
import { Flag } from "lucide-react";
import { cn } from "@/ds/lib/utils";
import { DEMO_DATA } from "./fixtures";
import { AboutSlide, SlideContext, type JourneyDesign } from "./slides";

/**
 * TEMPORARY: five candidate designs for About us → Our journey, shown on the real About slide.
 * Once one is approved it replaces MilestoneTimeline in slides.tsx and this file is deleted.
 */
const meta = {
  title: "Screens/Company Showcase/Our Journey designs",
  component: AboutSlide,
  parameters: { layout: "padded" },
  args: { data: DEMO_DATA },
  decorators: (Story) => (
    // Same wrapper ProfileSlide gives a light slide (ink variables + white fill).
    <div
      data-artwork=""
      className="mx-auto max-w-275 [--s-body:#475569] [--s-brand:#2b5797] [--s-ink:#1b2a4e] [--s-line:#e2e8f0] [--s-muted:#64748b]"
      style={{ "--slide-bg": "#ffffff" } as CSSProperties}
    >
      <SlideContext.Provider
        value={{ page: 2, total: 20, wordmark: DEMO_DATA.org.wordmark }}
      >
        <Story />
      </SlideContext.Provider>
    </div>
  ),
} satisfies Meta<typeof AboutSlide>;

export default meta;
type Story = StoryObj<typeof meta>;

const RED = "text-[#c62828]";

function Eyebrow() {
  return (
    <p
      className={cn("text-[1.15cqw] font-bold tracking-[0.3em] uppercase", RED)}
    >
      Our journey
    </p>
  );
}

/* 1 ─ Growth steps: a rising bar per milestone, so the company visibly climbs; the latest step is red. */
const STEP_HEIGHTS = [
  "h-[4cqw]",
  "h-[5.5cqw]",
  "h-[7cqw]",
  "h-[8.5cqw]",
  "h-[10cqw]",
  "h-[11.5cqw]",
];
const GrowthSteps: JourneyDesign = ({ milestones }) => {
  if (!milestones.length) return null;
  const last = milestones.length - 1;
  return (
    <section className="mt-auto">
      <Eyebrow />
      <ol className="mt-[1.2cqw] flex items-end gap-[0.8cqw] border-b-[0.25cqw] border-[#1b2a4e]">
        {milestones.map((m, i) => (
          <li
            key={`${m.year}-${m.title}`}
            className="flex min-w-0 flex-1 flex-col justify-end"
          >
            <p className="text-[1.35cqw] leading-tight font-bold text-(--s-ink)">
              {m.title}
            </p>
            <p className="mt-[0.3cqw] mb-[0.8cqw] line-clamp-2 text-[1.08cqw] leading-snug">
              {m.text}
            </p>
            <div
              className={cn(
                "rounded-t-[0.6cqw] p-[0.9cqw] text-white",
                STEP_HEIGHTS[last ? Math.round((i * 5) / last) : 5],
                i === last
                  ? "bg-[#c62828]"
                  : ["bg-[#1b2a4e]/60", "bg-[#1b2a4e]/80", "bg-[#1b2a4e]"][
                      i % 3
                    ],
              )}
            >
              <span className="text-[2.3cqw] leading-none font-bold tabular-nums">
                {m.year}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
};

/* 2 ─ Chapter cards: each milestone a card with its year as a large ghost numeral; the latest card is navy. */
const ChapterCards: JourneyDesign = ({ milestones }) => {
  if (!milestones.length) return null;
  const last = milestones.length - 1;
  return (
    <section className="mt-auto">
      <Eyebrow />
      <ol className="mt-[1.2cqw] grid auto-cols-fr grid-flow-col gap-[1.2cqw]">
        {milestones.map((m, i) => (
          <li
            key={`${m.year}-${m.title}`}
            className={cn(
              "relative overflow-hidden rounded-[0.8cqw] p-[1.4cqw] pt-[1.8cqw] ring-1 before:absolute before:inset-x-0 before:top-0 before:h-[0.35cqw] before:bg-[#c62828]",
              i === last
                ? "bg-[#1b2a4e] text-white/80 ring-transparent"
                : "bg-slate-50 ring-slate-200",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "absolute right-[-0.4cqw] bottom-[-1.4cqw] text-[7cqw] leading-none font-black tabular-nums",
                i === last ? "text-white/10" : "text-[#1b2a4e]/[0.07]",
              )}
            >
              {m.year}
            </span>
            <p
              className={cn(
                "relative text-[1.05cqw] font-bold tracking-[0.2em] tabular-nums",
                i === last ? "text-red-300" : RED,
              )}
            >
              {m.year} · {String(i + 1).padStart(2, "0")}
            </p>
            <p
              className={cn(
                "relative mt-[0.5cqw] text-[1.45cqw] leading-tight font-bold",
                i === last ? "text-white" : "text-(--s-ink)",
              )}
            >
              {m.title}
            </p>
            <p className="relative mt-[0.4cqw] line-clamp-3 text-[1.08cqw] leading-snug">
              {m.text}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
};

/* 3 ─ Winding road: a curving road with a pin per milestone, labels alternating above and below. */
const ROAD_W = 91; // ≈ slide content width in cqw, so the viewBox scales evenly
const ROAD_H = 5;
const WindingRoad: JourneyDesign = ({ milestones }) => {
  if (!milestones.length) return null;
  const n = milestones.length;
  const pts = milestones.map((_, i) => [
    ((i + 0.5) * ROAD_W) / n,
    i % 2 ? ROAD_H - 1 : 1,
  ]);
  const path = [[0, ROAD_H / 2], ...pts, [ROAD_W, ROAD_H / 2]].reduce(
    (d, [x, y], i, all) => {
      if (!i) return `M${x} ${y}`;
      const [px, py] = all[i - 1];
      const mx = (px + x) / 2;
      return `${d} C${mx} ${py} ${mx} ${y} ${x} ${y}`;
    },
    "",
  );
  const label = (m: (typeof milestones)[number], above: boolean) => (
    <div
      className={cn(
        "flex h-[7.6cqw] flex-col px-[0.6cqw] text-center",
        above ? "justify-end" : "justify-start",
      )}
    >
      <p className={cn("text-[2cqw] leading-none font-bold tabular-nums", RED)}>
        {m.year}
      </p>
      <p className="mt-[0.3cqw] text-[1.3cqw] leading-tight font-bold text-(--s-ink)">
        {m.title}
      </p>
      <p className="mt-[0.2cqw] line-clamp-2 text-[1.05cqw] leading-snug">
        {m.text}
      </p>
    </div>
  );
  return (
    <section className="mt-auto">
      <Eyebrow />
      <div className="relative mt-[0.6cqw]">
        <svg
          aria-hidden
          viewBox={`0 0 ${ROAD_W} ${ROAD_H}`}
          className="absolute inset-x-0 top-[7.6cqw] h-[5cqw] w-full overflow-visible"
        >
          <path
            d={path}
            fill="none"
            stroke="#cbd5e1"
            strokeWidth={1.4}
            strokeLinecap="round"
          />
          <path
            d={path}
            fill="none"
            stroke="#ffffff"
            strokeWidth={0.15}
            strokeDasharray="0.8 0.6"
          />
          {pts.map(([x, y], i) => (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={0.75}
              fill={i === n - 1 ? "#c62828" : "#1b2a4e"}
              stroke="#ffffff"
              strokeWidth={0.25}
            />
          ))}
        </svg>
        <ol className="grid auto-cols-fr grid-flow-col">
          {milestones.map((m, i) => (
            <li key={`${m.year}-${m.title}`}>
              {i % 2 ? <div className="h-[7.6cqw]" /> : label(m, true)}
              <div className="h-[5cqw]" />
              {i % 2 ? label(m, false) : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};

/* 4 ─ Chevron flow: a process arrow, navy deepening toward the red present; the story reads under each arrow. */
const CHEVRON =
  "[clip-path:polygon(0_0,calc(100%-1.8cqw)_0,100%_50%,calc(100%-1.8cqw)_100%,0_100%,1.8cqw_50%)]";
const ChevronFlow: JourneyDesign = ({ milestones }) => {
  if (!milestones.length) return null;
  const last = milestones.length - 1;
  return (
    <section className="mt-auto">
      <Eyebrow />
      <ol className="mt-[1.4cqw] grid auto-cols-fr grid-flow-col gap-[0.3cqw]">
        {milestones.map((m, i) => (
          <li key={`${m.year}-${m.title}`} className="min-w-0">
            <div
              className={cn(
                "flex h-[5.4cqw] items-center gap-[0.9cqw] pr-[2.4cqw] pl-[3cqw] text-white",
                CHEVRON,
                i === last
                  ? "bg-[#c62828]"
                  : [
                      "bg-[#5b74a8]",
                      "bg-[#3d5a94]",
                      "bg-[#2a4072]",
                      "bg-[#1b2a4e]",
                    ][Math.min(i, 3)],
              )}
            >
              <span className="text-[2.6cqw] leading-none font-bold tabular-nums">
                {m.year}
              </span>
            </div>
            <div className="mt-[1cqw] border-l-[0.2cqw] border-(--s-line) pr-[1cqw] pl-[1cqw]">
              <p className="text-[1.35cqw] leading-tight font-bold text-(--s-ink)">
                {m.title}
              </p>
              <p className="mt-[0.3cqw] line-clamp-2 text-[1.1cqw] leading-snug">
                {m.text}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
};

/* 5 ─ Since panel: a navy "Since 2017" block beside a compact vertical log; reads like a résumé. */
const SincePanel: JourneyDesign = ({ milestones }) => {
  if (!milestones.length) return null;
  const first = milestones[0].year;
  const span = new Date().getFullYear() - first;
  return (
    <section className="mt-auto grid grid-cols-[20cqw_minmax(0,1fr)] gap-[2.6cqw]">
      <div className="relative flex flex-col justify-center overflow-hidden rounded-[0.9cqw] bg-[#1b2a4e] p-[1.8cqw] text-white">
        <Flag
          aria-hidden
          strokeWidth={1.25}
          className="absolute right-[-1cqw] bottom-[-1cqw] size-[9cqw] text-white/10"
        />
        <p className="text-[1.05cqw] font-bold tracking-[0.3em] text-red-300 uppercase">
          Our journey
        </p>
        <p className="mt-[0.6cqw] text-[1.3cqw] text-white/70">Since</p>
        <p className="text-[5cqw] leading-none font-bold tabular-nums">
          {first}
        </p>
        <span
          aria-hidden
          className="mt-[1cqw] block h-[0.3cqw] w-[3cqw] bg-[#c62828]"
        />
        <p className="mt-[0.8cqw] text-[1.2cqw] text-white/80">
          {span}+ years · {milestones.length} milestones
        </p>
      </div>
      <ol className="relative flex flex-col justify-center gap-[1.1cqw] before:absolute before:top-[0.9cqw] before:bottom-[0.9cqw] before:left-[0.55cqw] before:w-[0.2cqw] before:bg-(--s-line)">
        {milestones.map((m, i) => (
          <li
            key={`${m.year}-${m.title}`}
            className="relative grid grid-cols-[1.3cqw_6.4cqw_minmax(0,1fr)] items-baseline gap-[1cqw]"
          >
            <span
              aria-hidden
              className={cn(
                "size-[1.3cqw] self-center rounded-full border-[0.3cqw] border-white",
                i === milestones.length - 1 ? "bg-[#c62828]" : "bg-[#1b2a4e]",
              )}
            />
            <span
              className={cn(
                "text-[2cqw] leading-none font-bold tabular-nums",
                RED,
              )}
            >
              {m.year}
            </span>
            <p className="truncate text-[1.2cqw]">
              <span className="font-bold text-(--s-ink)">{m.title}</span>
              <span className="text-(--s-muted)"> — </span>
              {m.text}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
};

/** Today's design, for comparison. */
export const Current: Story = {};
export const D1_GrowthSteps: Story = {
  name: "1 · Growth steps",
  args: { Journey: GrowthSteps },
};
export const D2_ChapterCards: Story = {
  name: "2 · Chapter cards",
  args: { Journey: ChapterCards },
};
export const D3_WindingRoad: Story = {
  name: "3 · Winding road",
  args: { Journey: WindingRoad },
};
export const D4_ChevronFlow: Story = {
  name: "4 · Chevron flow",
  args: { Journey: ChevronFlow },
};
export const D5_SincePanel: Story = {
  name: "5 · Since panel",
  args: { Journey: SincePanel },
};
