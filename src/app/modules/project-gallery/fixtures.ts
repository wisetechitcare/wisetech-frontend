/** Demo data for the Media Gallery Storybook prototype only — fictional people and files, no tenant data. */
import type { Albums, MediaItem, MediaKind } from "./media"

export const PROJECT = {
  code: "#WT/PROJECT/26-27/789",
  revision: "R3",
  name: "Noori Horizon Sale at Bandra",
  initials: "NH",
  status: "Project - On Ongoing",
}

/** "Now" for the demo, so date groups and filters are stable. */
export const NOW = new Date("2026-10-29T18:00")

export const DEFAULT_ALBUMS: Albums = {
  project: ["Renders", "Exterior", "Interiors", "Handover"],
  site: ["Weekly client report", "Snag photos"],
}

/* ---------- Placeholder photos: generated SVG scenes (no binary assets in the repo) ---------- */
type Rand = () => number
const rng = (seed: number): Rand => {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647), (s - 1) / 2147483646)
}
const W = 800
const H = 600
const R = (x: number, y: number, w: number, h: number, f: string, e = "") => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}" ${e}/>`
const C = (x: number, y: number, r: number, f: string, e = "") => `<circle cx="${x}" cy="${y}" r="${r}" fill="${f}" ${e}/>`
const L = (a: number, b: number, c: number, d: number, s: string, w = 2) => `<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" stroke="${s}" stroke-width="${w}"/>`
const G = (id: string, a: string, b: string) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`
const T = (x: number, y: number, t: string, s = 18, f = "#2b3a55") => `<text x="${x}" y="${y}" font-family="Arial,sans-serif" font-size="${s}" font-weight="700" text-anchor="middle" fill="${f}">${t}</text>`

function exterior(r: Rand, night: boolean) {
  let b = `<defs>${G("sky", night ? "#08122c" : "#79b4e2", night ? "#344476" : "#e4f0f9")}${G("gl", night ? "#1a2744" : "#6a8bab", night ? "#0e172b" : "#bcd2e4")}</defs>` + R(0, 0, W, H, "url(#sky)")
  if (night) for (let i = 0; i < 50; i++) b += C(r() * 800, r() * 260, r() * 1.3 + 0.3, "#fff")
  else b += C(650, 105, 42, "#fff6d8", 'opacity=".85"')
  b += R(520, 170, 150, 330, night ? "#141d33" : "#9fb4c7")
  for (let y = 185; y < 490; y += 22) for (let x = 532; x < 656; x += 20) b += R(x, y, 12, 14, night ? (r() > 0.55 ? "#f7d77a" : "#1c2742") : "#d3e1ec")
  b += R(240, 60, 250, 440, "url(#gl)") + R(270, 38, 190, 24, night ? "#22304f" : "#4d6884")
  for (let y = 78; y < 490; y += 20) b += R(240, y, 250, 2, night ? "#0b1222" : "#eef3f7", 'opacity=".6"')
  for (let x = 240; x <= 490; x += 31) b += R(x, 60, 2, 440, night ? "#0b1222" : "#eef3f7", 'opacity=".6"')
  if (night) {
    for (let y = 80; y < 490; y += 20) for (let x = 242; x < 486; x += 31) if (r() > 0.5) b += R(x + 1, y, 29, 17, "#ffd97a", `opacity="${(0.45 + r() * 0.5).toFixed(2)}"`)
  } else b += `<polygon points="240,60 350,60 240,230" fill="#fff" opacity=".2"/>`
  b += R(150, 420, 560, 80, night ? "#2a2f3d" : "#dad2c4") + R(150, 420, 560, 10, night ? "#3a4256" : "#bdb3a2")
  for (let x = 172; x < 700; x += 60) b += R(x, 446, 40, 54, night ? "#f2c86a" : "#6c7f8f", night ? 'opacity=".85"' : "")
  b += R(0, 500, W, 100, night ? "#141822" : "#8d9a85") + R(0, 522, W, 28, night ? "#232836" : "#bab7ae")
  for (let x = 40; x < 800; x += 95) {
    const s = 22 + r() * 14
    b += R(x - 3, 478, 6, 32, "#5b4632") + C(x, 468, s, night ? "#1d3a2c" : "#4e7e49") + C(x + 12, 460, s * 0.7, night ? "#24463a" : "#6a995b")
  }
  return b
}

function lobby(_r: Rand, finished: boolean) {
  const wall = finished ? "#e8dccb" : "#d6d3cd"
  const floor = finished ? "#ccb99d" : "#a8a39b"
  const ln = finished ? "#b6a181" : "#96918a"
  let b = R(0, 0, W, 90, "#f4efe7") + R(0, 90, W, 300, wall) + `<polygon points="0,390 800,390 800,600 0,600" fill="${floor}"/>`
  for (let xb = -400; xb <= 1200; xb += 100) b += L(400 + (xb - 400) * 0.35, 390, xb, 600, ln, 1.5)
  for (const y of [418, 456, 510, 584]) b += L(0, y, 800, y, ln, 1.2)
  b += `<polygon points="300,390 500,390 560,600 240,600" fill="#fff" opacity=".13"/>`
  b += R(70, 90, 46, 300, "#f0e8db") + R(684, 90, 46, 300, "#f0e8db") + R(290, 128, 220, 200, finished ? "#7a5a40" : "#8b8f94")
  if (finished) for (let x = 300; x < 510; x += 14) b += R(x, 128, 3, 200, "#684a33")
  b += C(400, 200, 22, finished ? "#d8b46a" : "#a0a4a8")
  b += R(250, 320, 300, 80, finished ? "#3e3029" : "#6e6a64") + R(240, 312, 320, 12, finished ? "#ece4d7" : "#8a857e")
  for (const x of [190, 400, 610]) b += L(x, 0, x, 138, "#555", 1.5) + `<ellipse cx="${x}" cy="148" rx="26" ry="12" fill="#2b2b2b"/>` + C(x, 162, 44, "#ffe2a8", 'opacity=".33"')
  for (const x of [160, 640]) b += R(x - 18, 350, 36, 40, "#4a4a4a") + C(x, 330, 26, "#4e7e49") + C(x + 14, 315, 16, "#6a995b")
  if (!finished) b += R(560, 250, 8, 140, "#d69e2e") + R(620, 250, 8, 140, "#d69e2e") + R(556, 250, 76, 8, "#d69e2e") + R(556, 320, 76, 8, "#d69e2e")
  return b
}

const SCENES = {
  exterior: (r: Rand) => exterior(r, false),
  night: (r: Rand) => exterior(r, true),
  lobby: (r: Rand) => lobby(r, true),
  lobbyRaw: (r: Rand) => lobby(r, false),
  ceiling: () => {
    let b = `<defs>${G("sl", "#5b5f64", "#7d8186")}</defs>` + R(0, 0, W, H, "url(#sl)") + R(0, 0, W, 40, "#484b4f")
    for (let x = 0; x < W; x += 200) b += R(x, 0, 30, 62, "#53565a")
    for (let x = 60; x < W; x += 130) b += L(x, 40, x, 330, "#3b3d40", 2)
    b += R(0, 95, W, 95, "#c4ccd3") + R(0, 95, W, 14, "#e0e6eb") + R(0, 176, W, 14, "#a6afb7")
    for (let x = 90; x < W; x += 150) b += R(x, 92, 8, 101, "#8e98a1")
    b += R(520, 190, 60, 90, "#b5bec6") + `<ellipse cx="550" cy="281" rx="30" ry="9" fill="#8c959d"/>`
    b += R(0, 220, W, 16, "#c53030") + R(0, 248, W, 22, "#1f2a37") + R(0, 256, W, 6, "#2b6cb0")
    b += R(0, 296, W, 8, "#a9a48f") + R(0, 318, W, 6, "#8f8a76")
    for (let x = 10; x < W; x += 26) b += R(x, 296, 5, 28, "#b6b19c")
    ;["#222", "#c53030", "#d69e2e", "#2b6cb0", "#222"].forEach((c, i) => (b += R(0, 302 + i * 3, W, 2, c)))
    b += R(0, 360, W, 130, "#9a968e") + R(0, 490, W, 110, "#88847c")
    b += L(640, 600, 690, 330, "#d69e2e", 6) + L(700, 600, 750, 330, "#d69e2e", 6)
    for (let i = 1; i < 8; i++) {
      const t = i / 8
      b += L(640 + 50 * t, 600 - 270 * t, 700 + 50 * t, 600 - 270 * t, "#d69e2e", 4)
    }
    return b
  },
  hvac: () => {
    let b = R(0, 0, W, 430, "#c7cbcf") + R(0, 0, W, 30, "#a9adb1") + R(0, 430, W, 170, "#8e9194") + R(0, 430, W, 6, "#797c7f")
    b += R(500, 0, 120, 190, "#b9c2ca") + R(500, 0, 14, 190, "#d8dee3") + R(492, 180, 136, 22, "#3c3f42")
    b += R(110, 200, 560, 240, "#dfe3e7", 'stroke="#9aa2a9" stroke-width="3"')
    for (const x of [250, 400, 540]) b += R(x, 200, 3, 240, "#9aa2a9")
    for (const x of [180, 320, 470, 610]) b += R(x - 6, 300, 12, 40, "#7b848c")
    b += C(180, 250, 30, "#c9ced3", 'stroke="#7b848c" stroke-width="3"') + L(150, 250, 210, 250, "#7b848c", 3) + L(180, 220, 180, 280, "#7b848c", 3)
    b += R(420, 226, 90, 40, "#f4f6f8", 'stroke="#9aa2a9"') + T(465, 252, "AHU-2")
    b += R(100, 440, 580, 18, "#5e6265") + R(690, 120, 22, 330, "#2b6cb0") + R(730, 120, 22, 330, "#2f855a") + C(701, 300, 16, "#c53030") + C(741, 340, 16, "#c53030")
    return b
  },
  panel: (r: Rand) => {
    let b = R(0, 0, W, 500, "#d8d3c8") + R(0, 500, W, 100, "#9b968c") + R(0, 30, W, 14, "#9aa0a6")
    ;["#c53030", "#d69e2e", "#2b6cb0", "#222", "#2f855a", "#222"].forEach((c, i) => (b += R(300 + i * 14, 44, 8, 40, c)))
    b += R(220, 80, 360, 420, "#bfc4ca", 'stroke="#8b929a" stroke-width="3"') + R(240, 100, 320, 380, "#2c3036") + R(255, 112, 290, 10, "#c47f3a")
    for (let row = 0; row < 5; row++)
      for (let c = 0; c < 10; c++) {
        const x = 258 + c * 29
        const y = 140 + row * 62
        b += R(x, y, 22, 44, "#eceff2") + R(x + 7, y + (r() > 0.3 ? 8 : 22), 8, 14, r() > 0.86 ? "#c53030" : "#1f2328")
      }
    return b + R(350, 448, 100, 22, "#f6e05e") + T(400, 465, "DB-3", 15, "#1f2328")
  },
  flooring: () => {
    let b = R(0, 0, W, 250, "#e6e1d8") + R(0, 240, W, 10, "#cfc8bb") + `<polygon points="0,250 800,250 800,600 0,600" fill="#a6a198"/><polygon points="0,250 443,250 560,600 0,600" fill="#ede7db"/>`
    for (let xb = -660; xb <= 560; xb += 110) b += L(xb + (400 - xb) * 0.729, 250, xb, 600, "#c8c0b0", 1.6)
    for (const y of [262, 280, 305, 340, 392, 462, 560]) b += L(0, y, 443 + ((y - 250) / 350) * 117, y, "#c8c0b0", 1.6)
    return b + R(600, 430, 110, 60, "#c9a86b") + R(610, 402, 90, 30, "#d4b67c") + R(700, 505, 50, 62, "#dd6b20", 'rx="6"')
  },
  rooftop: (r: Rand) => {
    let b = `<defs>${G("sk", "#86bde6", "#ebf4fb")}</defs>` + R(0, 0, W, H, "url(#sk)")
    for (let x = 0; x < W; x += 40) {
      const h = 40 + r() * 90
      b += R(x, 380 - h, 36, h, "#a9bccb")
    }
    b += R(0, 380, W, 220, "#9c9b96") + R(0, 380, W, 8, "#7e7d79")
    for (const x of [90, 430]) {
      b += R(x, 250, 280, 150, "#e3e7eb", 'stroke="#9aa2a9" stroke-width="3"')
      for (let i = 0; i < 3; i++) b += `<ellipse cx="${x + 50 + i * 90}" cy="250" rx="38" ry="10" fill="#4a5058"/>`
      for (let y = 275; y < 390; y += 10) b += R(x + 10, y, 260, 3, "#c3c9cf")
      b += R(x, 400, 280, 14, "#5e6265")
    }
    b += R(370, 330, 60, 16, "#2b6cb0") + R(370, 360, 60, 16, "#2f855a") + R(0, 500, W, 5, "#d69e2e") + R(0, 540, W, 6, "#d69e2e")
    for (let x = 20; x < W; x += 80) b += R(x, 500, 6, 100, "#d69e2e")
    return b
  },
  fire: () => {
    let b = R(0, 0, W, H, "#8a8d91") + R(0, 0, W, 50, "#6d7074")
    for (let x = 50; x < W; x += 150) b += L(x, 50, x, 168, "#444", 2)
    b += R(0, 160, W, 26, "#c53030") + R(0, 160, W, 6, "#e05252")
    for (const x of [140, 460]) {
      b += R(x, 186, 14, 150, "#c53030") + R(x - 110, 330, 250, 14, "#c53030")
      for (let s = x - 90; s < x + 130; s += 60) b += R(s, 344, 8, 18, "#c53030") + `<polygon points="${s - 8},366 ${s + 16},366 ${s + 4},378" fill="#c9a227"/>`
    }
    return b + R(0, 540, W, 60, "#77736c") + R(642, 516, 16, 40, "#c53030") + C(650, 470, 46, "#f2f2f2", 'stroke="#333" stroke-width="5"') + L(650, 470, 676, 448, "#c53030", 4) + C(650, 470, 5, "#333")
  },
  plumbing: () => {
    let b = R(0, 0, W, 460, "#cfd2d4") + R(0, 460, W, 140, "#8f9294")
    for (const [x, c, w] of [[60, "#9aa3ab", 30], [120, "#dd6b20", 18], [690, "#2b6cb0", 26], [740, "#9aa3ab", 30]] as const)
      b += R(x, 0, w, 460, c) + R(x, 0, w * 0.3, 460, "#fff", 'opacity=".2"')
    b += R(180, 130, 500, 24, "#9aa3ab") + R(230, 154, 20, 100, "#9aa3ab") + R(460, 154, 20, 100, "#9aa3ab")
    for (const x of [200, 430])
      b += R(x, 380, 170, 20, "#4a5058") + R(x + 10, 320, 60, 60, "#2b6cb0", 'rx="10"') + R(x + 70, 330, 90, 40, "#2c5282", 'rx="6"') + R(x + 30, 250, 20, 70, "#9aa3ab") + C(x + 40, 240, 18, "#c53030")
    return b
  },
}
export type SceneName = keyof typeof SCENES

export function scene(name: SceneName, seed: number) {
  const r = rng(seed * 7919 + 13)
  const body = SCENES[name](r)
  const z = 1 + r() * 0.22
  const vw = W / z
  const vh = H / z
  const ox = r() * (W - vw)
  const oy = r() * (H - vh)
  return (
    "data:image/svg+xml;charset=utf-8," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${ox.toFixed(0)} ${oy.toFixed(0)} ${vw.toFixed(0)} ${vh.toFixed(0)}" width="800" height="600">${body}` +
        `<defs><radialGradient id="vg" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".32"/></radialGradient></defs><rect width="800" height="600" fill="url(#vg)"/></svg>`,
    )
  )
}

/* ---------- Demo media ---------- */
type Seed = Omit<MediaItem, "id" | "src" | "size" | "album" | "kind"> & { sc: SceneName; album?: string; kind?: MediaKind; size?: number }

const P = (caption: string, name: string, sc: SceneName, album: string, by: string, at: string, x: Partial<Seed> = {}): Seed => ({ view: "project", caption, name, sc, album, by, at, ...x })
const S = (caption: string, name: string, sc: SceneName, zone: string, discipline: string, by: string, at: string, x: Partial<Seed> = {}): Seed => ({ view: "site", caption, name, sc, zone, discipline, by, at, ...x })

const SEEDS: Seed[] = [
  P("Front elevation render", "NH_render_front_elev_R3.jpg", "exterior", "Renders", "Ayesha Shaikh", "2026-09-12T11:20"),
  P("Night view render", "NH_render_night_R3.jpg", "night", "Renders", "Ayesha Shaikh", "2026-09-12T11:24"),
  P("Lobby reception render", "NH_render_lobby_R2.jpg", "lobby", "Renders", "Ayesha Shaikh", "2026-09-18T15:05"),
  P("Project walkthrough animation", "NH_walkthrough_R3.mp4", "exterior", "Renders", "Ayesha Shaikh", "2026-09-25T10:40", { kind: "video", duration: "2:14", size: 148 }),
  P("East façade, Hill Road side", "DSC_0412.jpg", "exterior", "Exterior", "Mustafa Khan", "2026-10-02T09:15"),
  P("Main entrance canopy", "DSC_0431.jpg", "night", "Exterior", "Mustafa Khan", "2026-10-02T19:42"),
  P("Lobby with finishes complete", "DSC_0507.jpg", "lobby", "Interiors", "Neha Rao", "2026-10-10T12:30"),
  P("Sample flat corridor", "DSC_0522.jpg", "flooring", "Interiors", "Neha Rao", "2026-10-10T12:48"),
  P("Plant room handover", "HO_plantroom_AHU2.jpg", "hvac", "Handover", "Neha Rao", "2026-10-24T16:10"),
  P("Main electrical room handover", "HO_elec_room_DB3.jpg", "panel", "Handover", "Neha Rao", "2026-10-24T16:22"),
  P("Rooftop chillers commissioned", "HO_roof_chillers.jpg", "rooftop", "Handover", "Mustafa Khan", "2026-10-26T11:05"),
  P("Handover walkthrough", "HO_walkthrough.mp4", "lobby", "Handover", "Neha Rao", "2026-10-26T17:30", { kind: "video", duration: "4:38", size: 186 }),

  S("L3 corridor ducting complete", "IMG_20261028_161204.jpg", "ceiling", "Level 3", "HVAC", "Rahul Patil", "2026-10-28T16:12", { album: "Weekly client report" }),
  S("L3 sprinkler mains and drops", "IMG_20261028_155010.jpg", "fire", "Level 3", "Fire Fighting", "Rahul Patil", "2026-10-28T15:50"),
  S("Sprinkler hydro test, 12 bar", "VID_20261028_153301.mp4", "fire", "Level 3", "Fire Fighting", "Rahul Patil", "2026-10-28T15:33", { kind: "video", duration: "0:42", size: 38 }),
  S("DB-3 panel dressing", "IMG_20261028_121845.jpg", "panel", "Level 3", "Electrical", "Imran Shaikh", "2026-10-28T12:18"),
  S("L3 corridor tiling started", "IMG_20261028_102233.jpg", "flooring", "Level 3", "Interiors", "Imran Shaikh", "2026-10-28T10:22", { album: "Weekly client report" }),
  S("Chiller placement on terrace", "IMG_20261027_174512.jpg", "rooftop", "Terrace", "HVAC", "Rahul Patil", "2026-10-27T17:45", { album: "Weekly client report" }),
  S("Crane lift of chiller 2", "VID_20261027_113020.mp4", "rooftop", "Terrace", "HVAC", "Rahul Patil", "2026-10-27T11:30", { kind: "video", duration: "1:18", size: 72 }),
  S("AHU-2 installation", "IMG_20261021_143005.jpg", "hvac", "Basement", "HVAC", "Imran Shaikh", "2026-10-21T14:30"),
  S("Domestic water pump room", "IMG_20261021_120140.jpg", "plumbing", "Basement", "Plumbing", "Imran Shaikh", "2026-10-21T12:01"),
  S("LT panel delivered to site", "IMG_20261021_094415.jpg", "panel", "Ground", "Electrical", "Rahul Patil", "2026-10-21T09:44"),
  S("Duct leak at L2 joint", "IMG_20261014_165511.jpg", "ceiling", "Level 2", "MEP", "Rahul Patil", "2026-10-14T16:55", { album: "Snag photos" }),
  S("Drainage stack, L2 shaft", "IMG_20261014_142201.jpg", "plumbing", "Level 2", "Plumbing", "Imran Shaikh", "2026-10-14T14:22"),
  S("Shaft inspection walk", "VID_20261014_110908.mp4", "ceiling", "Level 2", "MEP", "Imran Shaikh", "2026-10-14T11:09", { kind: "video", duration: "1:05", size: 54 }),
  S("Lobby ceiling framing", "IMG_20261003_101512.jpg", "lobbyRaw", "Ground", "Interiors", "Rahul Patil", "2026-10-03T10:15"),
]

export function demoMedia(): MediaItem[] {
  return SEEDS.map(({ sc, ...s }, i) => ({
    kind: "image",
    album: "",
    size: 2 + ((i * 37) % 50) / 10,
    ...s,
    id: String(i + 1),
    src: scene(sc, i + 1),
  }))
}
