// Bootstrap Reboot (unlayered Metronic CSS) overrides Tailwind utilities on raw
// h1-h6, p, label, ul, ol, li, dl, dt, dd, button and a. src/main.css shields them only when they
// carry `data-slot`, so every lowercase intrinsic of those tags in this module needs one.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

const MODULE_DIR = __dirname;
const SHIELDED = /^(h[1-6]|p|label|ul|ol|li|dl|dt|dd|button|a)$/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return full.endsWith(".tsx") && !/\.(test|stories)\.tsx$/.test(name) ? [full] : [];
  });
}

/** Returns the full text of the opening tag starting at `start` (just after `<`), skipping braces and strings. */
function openingTag(src: string, start: number): string {
  let depth = 0;
  let quote = "";
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      if (c === "\\" && quote !== "`") i++;
      else if (c === quote) quote = "";
      continue;
    }
    if (depth > 0) {
      if (c === '"' || c === "'" || c === "`") quote = c;
      else if (c === "{") depth++;
      else if (c === "}") depth--;
      continue;
    }
    if (c === "{") depth++;
    else if (c === '"' || c === "'") quote = c;
    else if (c === ">") return src.slice(start, i);
  }
  return src.slice(start);
}

/** Blanks comments (keeping newlines) so a tag mentioned in prose is not mistaken for JSX. */
function stripComments(src: string): string {
  const NL = String.fromCharCode(10);
  const BS = String.fromCharCode(92);
  const out = src.split("");
  const blankRange = (from: number, to: number) => {
    for (let k = from; k < to; k++) if (out[k] !== NL) out[k] = " ";
  };
  let quote = "";
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      if (c === BS) i++;
      else if (c === quote) quote = "";
    } else if (c === "/" && src[i + 1] === "*") {
      const end = src.indexOf("*/", i + 2);
      const stop = end < 0 ? src.length : end + 2;
      blankRange(i, stop);
      i = stop - 1;
    } else if (c === "/" && src[i + 1] === "/" && !/[:A-Za-z0-9_]/.test(src[i - 1] ?? "")) {
      const end = src.indexOf(NL, i);
      const stop = end < 0 ? src.length : end;
      blankRange(i, stop);
      i = stop - 1;
    } else if (c === "`") quote = c;
  }
  return out.join("");
}

export function findUnshielded(source: string): number[] {
  const NL = String.fromCharCode(10);
  const src = stripComments(source);
  const lines: number[] = [];
  const re = /<([a-z][a-z0-9]*)(?=[\s/>])/g;
  for (let m = re.exec(src); m; m = re.exec(src)) {
    const prev = src[m.index - 1] ?? "";
    const lineStart = src.lastIndexOf(NL, m.index) + 1;
    if (/[\w$.\])]/.test(prev) || !SHIELDED.test(m[1])) continue;
    // An HTML string built in a template literal (e.g. a SweetAlert body) is not JSX.
    if (src.slice(lineStart, m.index).includes("`")) continue;
    if (!/(^|\s)data-slot\s*=/.test(openingTag(src, m.index + 1))) {
      lines.push(src.slice(0, m.index).split(NL).length);
    }
  }
  return lines;
}

describe("Reboot shield: raw typographic and interactive elements carry data-slot", () => {
  it("scanner flags a bare tag, a multi-line tag and ignores a shielded one", () => {
    expect(findUnshielded('<p className="a">x</p>')).toEqual([1]);
    expect(findUnshielded('<a\n  href="/x"\n  onClick={() => go()}\n>y</a>')).toEqual([1]);
    expect(findUnshielded('<button data-slot="x" onClick={() => a > b}>z</button>')).toEqual([]);
    expect(findUnshielded("<Label>k</Label><span>s</span>")).toEqual([]);
    expect(findUnshielded('<dl data-slot="s"><dt>k</dt><dd data-slot="v">x</dd></dl>')).toEqual([1]);
    expect(findUnshielded('<dt className="font-bold">k</dt>')).toEqual([1]);
  });

  it("every h1-h6/p/label/ul/ol/li/dl/dt/dd/button/a in the module has data-slot", () => {
    const offenders = sourceFiles(MODULE_DIR).flatMap((file) =>
      findUnshielded(readFileSync(file, "utf8")).map((line) => `${relative(MODULE_DIR, file).split(sep).join("/")}:${line} raw element without data-slot (Reboot would override its Tailwind classes)`),
    );
    expect(offenders).toEqual([]);
  });
});
