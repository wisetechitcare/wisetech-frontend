import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { toast } from "@app/modules/common/components/ui";
import type { SlideSpec } from "@app/modules/company-profile/profileBuilder";

const W = 1600;
const H = 900;
const frame = () => new Promise((r) => requestAnimationFrame(r));

/** Downloads the shown slides as a PDF: renders them off-screen, captures each, one page per slide. */
// ponytail: pages are images (text not selectable); server-side Puppeteer fixes that later.
export function DeckExport({
  slides,
  render,
  onDone,
}: {
  slides: SlideSpec[];
  render: (s: SlideSpec) => ReactNode;
  onDone: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const [{ createContext, destroyContext, domToJpeg }, { jsPDF }] =
          await Promise.all([import("modern-screenshot"), import("jspdf")]);
        await document.fonts.ready;
        await frame(); // let text fitting settle
        await frame();
        if (!live) return;
        const pages = [...root.current!.children] as HTMLElement[];
        // One context for every page: fonts and images are fetched once.
        const ctx = await createContext(pages[0], {
          width: W,
          height: H,
          scale: 2,
          type: "image/jpeg",
          quality: 0.92,
          // Skip CSS variables (already resolved): ~2,700 per element made each page a 16 MB SVG.
          includeStyleProperties: [...getComputedStyle(document.body)].filter(
            (p) => !p.startsWith("--"),
          ),
        });
        const pdf = new jsPDF({
          orientation: "landscape",
          unit: "px",
          format: [W, H],
          hotfixes: ["px_scaling"],
        });
        for (const [i, page] of pages.entries()) {
          ctx.node = page;
          const jpg = await domToJpeg(ctx);
          if (!live) return destroyContext(ctx);
          if (i) pdf.addPage([W, H], "landscape");
          pdf.addImage(jpg, "JPEG", 0, 0, W, H);
        }
        destroyContext(ctx);
        pdf.save("Company Profile.pdf");
      } catch {
        if (live)
          void toast({
            icon: "error",
            title: "Export failed",
            text: "The PDF could not be created. Please try again.",
          });
      }
      if (live) onDone();
    })();
    return () => {
      live = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return createPortal(
    <div
      ref={root}
      aria-hidden
      className="pointer-events-none fixed top-0 left-[-20000px]"
    >
      {slides.map((s) => (
        // Keep px, not h-225: Metronic's 13px root font shrinks rem. Frame flattened; `!` beats Bootstrap's .border/.shadow-sm.
        <div
          key={s.id}
          className="h-[900px] w-[1600px] overflow-hidden [&>*>*]:rounded-none [&>*>*]:border-0! [&>*>*]:shadow-none!"
        >
          {render(s)}
        </div>
      ))}
    </div>,
    document.body,
  );
}
