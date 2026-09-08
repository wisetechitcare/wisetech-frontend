# UI / UX Resource Map

> **Status:** Reference · **Date:** 2026-09-07 · **Scope:** `wisetech-frontend`
> **Purpose:** One place for design inspiration and open-source UI sources, with an honest verdict on what actually fits *this* codebase.

This is a bookmark file with opinions attached. It is **not** an instruction to install anything.
Before pulling any component from any source below, the house rules in [Rules of engagement](#8-rules-of-engagement) apply — especially reuse-first.

---

## 1. What this repo already has

Verified against `package.json` and `components.json` on 2026-09-07.

| Layer | Installed | Notes |
|---|---|---|
| Styling | `tailwindcss@^4.3.2` + `@tailwindcss/vite@^4.3.3` | v4, CSS-first config (`tailwind.config` is empty in `components.json`), full Preflight, layered so Metronic/MUI stay shielded |
| Animation | `framer-motion@^12.38.0` | This **is** Motion — v12 is the post-rename runtime, `framer-motion` is the compatibility alias. No need for a second animation lib |
| Icons | `lucide-react@^1.14.0` | shadcn's default set. Note the app standard is **KTIcon** — Lucide is for new/decorative UI only |
| WebGL | `ogl@^1.0.11` | Pulled in by React Bits backgrounds. Lightweight; not Three.js |
| Registry | `@react-bits` -> `https://reactbits.dev/r/{name}.json` | Wired in `components.json`, shadcn `new-york` style, `baseColor: neutral`, `cssVariables: false` |
| Component systems | `@mui/material@^5`, `@mantine/core@^7`, `antd@^6`, `bootstrap@5` + `react-bootstrap@^2` | **Four of them.** See the warning in section 4 |
| Utils | `clsx@2.1.0` | |

### The gap

Most shadcn-format registries (shadcn/ui itself, Origin UI, Aceternity, Motion Primitives, 21st.dev) emit components that import three things this repo **does not have**:

```
tailwind-merge            # the cn() helper
class-variance-authority  # variant props
@radix-ui/react-*         # per-component behaviour primitives
```

React Bits is the exception — most of its components are self-contained, which is why it worked without these. Anything else will fail to build until they are added. That is a deliberate decision to make, not an accident to stumble into.

Two more traps in the current `components.json`:

- **`cssVariables: false`** — pulled components arrive with hard-coded `neutral` Tailwind classes, not themeable tokens. Our brand is navy `#1E3A8A`. Every import needs recolouring by hand, or flip this to `true` and define the variables once.
- **`baseColor: neutral`** — same root cause. Flipping it is a one-time migration, not a per-component fix.

---

## 2. Tier S — the foundation

These are the layers everything else is built on. Worth understanding before installing any collection.

| Project | What it is | Verdict here |
|---|---|---|
| [shadcn/ui](https://ui.shadcn.com) | Not a library — a registry you copy into your repo. Won the ecosystem; nearly everything in section 3 is downstream of it | Format already configured; needs the section 1 gap closed |
| [Radix Primitives](https://www.radix-ui.com/primitives) | Headless, unstyled, correct. The a11y/behaviour engine under shadcn | Not installed |
| [React Aria Components](https://react-spectrum.adobe.com/react-aria/) (Adobe) | The best accessibility work on the web. Harder than Radix, more correct than Radix | Consider only if a11y becomes a contract requirement |
| [Motion](https://motion.dev) (ex-Framer Motion) | The animation runtime; has a vanilla JS build too | **Already have it** as `framer-motion@12` |
| [GSAP](https://gsap.com) | Fully free including every plugin (ScrollTrigger, SplitText, MorphSVG) since the Webflow acquisition. What awwwards sites actually run on | Overlaps Motion — only add for timeline/scroll work Motion genuinely cannot do |
| [Tailwind v4](https://tailwindcss.com) | Oxide engine, CSS-first config, native cascade layers | **Already have it** |

> Motion + Tailwind + Radix rebuilds ~90% of every "wow component" in section 3 from scratch. Two of those three are already here.

---

## 3. Copy-paste animated component registries

All shadcn-format. Many are reskins of each other. The differentiated ones:

**Best of the genre**

| Source | Why | Fit |
|---|---|---|
| [Origin UI](https://originui.com) | 500+ components — real inputs, selects, dialogs, not just hero eye-candy. The most *usable* of the bunch | Needs Radix + cva + tailwind-merge |
| [Fancy Components](https://fancycomponents.dev) | Daniel Petho. Genuinely novel interactions, not template filler. The most creatively interesting | Mostly Motion-only — good fit |
| [Motion Primitives](https://motion-primitives.com) | Clean, well-abstracted Motion patterns | Motion-only — good fit |
| [Aceternity UI](https://ui.aceternity.com) | The big-splash 3D/gradient/spotlight aesthetic clients ask for. Heavy | Use sparingly; audit bundle cost |
| [21st.dev](https://21st.dev) | Registry of shadcn components from many authors, **plus an MCP server** so Claude can pull them directly | See section 9 — the one worth wiring into the workflow |
| [React Bits](https://reactbits.dev) | Already wired as `@react-bits`. Self-contained; uses `ogl` for WebGL pieces | **In use** — Login page is the benchmark |

**Also worth bookmarking:** [Cult UI](https://cult-ui.com) · [Kokonut UI](https://kokonutui.com) · [Animate UI](https://animate-ui.com) · [Smoothui](https://smoothui.dev) · [Eldora UI](https://eldoraui.site) · [UI Layouts](https://www.ui-layouts.com) · [Skiper UI](https://skiper-ui.com) · [Tailark](https://tailark.com) (marketing blocks) · [Hover.dev](https://www.hover.dev) · [Magic UI](https://magicui.design)

---

## 4. Full component systems

> **Warning:** this repo already runs four (MUI, Mantine, antd, Bootstrap). Adding a fifth is a net loss. This section is reference material and input to an eventual consolidation decision — not a shopping list.

| System | Standing |
|---|---|
| [Mantine](https://mantine.dev) | 120+ components, best-in-class hooks library, batteries included. Already a dependency (`@mantine/core@7`) — under-used |
| [Base UI](https://base-ui.com) | MUI + Radix teams merged. The future headless standard. **Worth watching closely** — the natural next home for a repo already on MUI |
| [Ark UI](https://ark-ui.com) | Chakra team, state-machine driven, React/Vue/Solid/Svelte |
| [HeroUI](https://heroui.com) (ex-NextUI) · [Chakra v3](https://chakra-ui.com) · [daisyUI](https://daisyui.com) | Alternatives; no reason to adopt here |

---

## 5. Creative / WebGL — the awwwards layer

| Tool | Use |
|---|---|
| [Three.js](https://threejs.org) + [React Three Fiber](https://r3f.docs.pmnd.rs) + [Drei](https://drei.docs.pmnd.rs) | The full 3D web stack. Heavy — `ogl` already covers our lighter needs |
| [Paper Design Shaders](https://shaders.paper.design) | Drop-in animated shader backgrounds. Best-looking thing released in this space recently |
| [Lenis](https://lenis.darkroom.engineering) | Smooth scroll, by Darkroom Engineering. On half the awwwards SOTD winners |
| [Rive](https://rive.app) | Interactive vector animation, free runtimes. Replaces Lottie for anything interactive |
| [Theatre.js](https://www.theatrejs.com) | A real motion-design timeline editor for the web |
| [Anime.js v4](https://animejs.com) | Fully rewritten, MIT. Excellent for lighter work — but we have Motion |

**Reality check for an HR product:** this layer belongs on marketing and login surfaces only. Never on data grids, attendance boards, or payroll screens — the perf cost lands on the screens people use all day.

---

## 6. Inspiration

**Already bookmarked:** [Dribbble](https://dribbble.com) · [Awwwards](https://www.awwwards.com) · [Mobbin](https://mobbin.com) · [Bokaap](https://bokaap.design) · [Behance](https://www.behance.net) · [Envato Elements](https://elements.envato.com)

**Missing, ranked**

| Site | Why |
|---|---|
| [Codrops](https://tympanus.net/codrops/) | The single best resource on this page. Interaction *techniques* with full source, not screenshots |
| [Godly](https://godly.website) | Best-curated awwwards alternative |
| [Refero](https://refero.design) | Real product UI patterns, searchable by element — closest to our actual problem space |
| [Page Flows](https://pageflows.com) · [Screensdesign](https://screensdesign.com) | Recorded user flows; the natural companion to Mobbin |
| [Land-book](https://land-book.com) · [Lapa Ninja](https://www.lapa.ninja) | Landing pages |
| [Cosmos](https://www.cosmos.so) · [Savee](https://savee.it) | Visual moodboarding; replacing Pinterest for designers |
| [Typewolf](https://www.typewolf.com) | Type pairing in the wild |
| [SiteInspire](https://www.siteinspire.com) · [Minimal Gallery](https://minimal.gallery) · [Navbar Gallery](https://www.navbar.gallery) · [Footer.design](https://footer.design) | Narrow, fast reference |

---

## 7. Assets — all open source

**Icons** — [Lucide](https://lucide.dev) (installed) · [Phosphor](https://phosphoricons.com) · [Tabler](https://tabler.io/icons) (5900+) · [Iconify](https://iconify.design) (200k+, every set behind one API)

> App standard is **KTIcon**. Lucide is sanctioned for new and decorative UI. Do not introduce a fourth icon set — `bootstrap-icons`, `line-awesome` and `@fortawesome` are all already here as legacy.

**Fonts** — [Fontshare](https://www.fontshare.com) (best free quality anywhere) · [Uncut.wtf](https://uncut.wtf) · [Fontsource](https://fontsource.org) (self-host via npm) · [Velvetyne](https://velvetyne.fr) (experimental)

> `DESIGN_SYSTEM.md` locks the app to an **all-system font stack** (Barlow retired). Custom fonts are for marketing surfaces only.

**Illustration** — [unDraw](https://undraw.co) · [Open Peeps](https://www.openpeeps.com) · [Popsy](https://popsy.co) · [DrawKit](https://www.drawkit.com)

**Colour** — [Radix Colors](https://www.radix-ui.com/colors) (the only palette system designed for dark mode from first principles) · [OKLCH.com](https://oklch.com) · [Huetone](https://huetone.ardov.me) (APCA contrast) · [Open Props](https://open-props.style)

> Brand is navy `#1E3A8A`, semantics are Apple hues toned ~10%. Radix Colors is a **reference for how to construct a scale**, not a palette to import wholesale.

---

## 8. Rules of engagement

These are not new rules — they are the existing standards, restated for the specific hazard of copy-paste UI.

1. **Reuse before build.** Cross-check the whole codebase for an existing solution first. Read [ui/README.md](src/app/modules/common/components/ui/README.md) before any UI work — there are two non-interchangeable kits and they are not swappable.
2. **Check the design system first.** Icons, badges, toggles, chips, animations, colours — scan `@app/modules/configuration` and reuse or promote. Never duplicate.
3. **Every pulled component gets recoloured.** `cssVariables: false` means imports arrive neutral-grey. Brand is navy. No exceptions.
4. **Responsive is not optional.** Desktop, tablet, mobile. Hero components from section 3 are usually desktop-first and need real work to survive a phone.
5. **Perf and realtime are standing bars.** Animated components carry a bundle and a paint cost. Data surfaces stay plain.
6. **Motion is the only animation runtime.** Do not add GSAP, Anime or Lottie without a reason Motion genuinely cannot cover.
7. **The animated-component sites are a commodity.** New ones ship monthly, recycling the same twenty effects. The staying power is in the layers underneath — Radix / React Aria for behaviour, Motion for animation, Tailwind for styling, Codrops for ideas.

**If the bookmark list had to be five:** shadcn/ui · 21st.dev · Codrops · Motion · Mobbin.

---

## 9. 21st.dev MCP — pulling components directly

21st.dev ships an MCP server, so components can be searched and inserted without leaving the editor. Setup requires an API key from <https://21st.dev/mcp>.

**Current path (plugin):**

```
claude plugin marketplace add 21st-dev/magic-mcp
/plugin install 21st
```

Then set `API_KEY_21ST` in the environment.

**Direct MCP path** — the older `@21st-dev/magic` package, still supported through a compatibility proxy:

```
claude mcp add magic --scope local --env API_KEY_21ST="<your-key>" -- npx -y @21st-dev/magic@latest
```

Notes:

- Plugin installs are blocked while Claude Code is in auto mode — exit auto mode first.
- `--scope local` keeps it to this project; `--scope user` makes it global.
- Never commit the key, and do not put it in a tracked `.mcp.json`.
- Anything it inserts still lands on the section 1 gap: Radix + cva + tailwind-merge must exist first.

---

## Related docs

- [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) — the canonical token system: navy brand, Apple-structured, light + dark
- [CLAUDE.md](CLAUDE.md) — repo working agreement
- [ENGINEERING_PRINCIPLES.md](../ENGINEERING_PRINCIPLES.md) — workspace-level standards
