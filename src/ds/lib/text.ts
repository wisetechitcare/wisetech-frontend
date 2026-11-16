import * as React from "react"

/**
 * Headline capitalisation for the v2 kit — the same rule as the live kit's `toTitleCase`
 * (`app/modules/common/components/ui/text.ts`), so a title reads the same in both. Applied by the kit's
 * title components (CardTitle, DialogTitle, Label, Button…) so every title is Title Case without each
 * caller writing it: "Employee onboarding" renders "Employee Onboarding".
 *
 * Why a function, not `text-transform: capitalize`: CSS capitalises every word ("Rules Of The Road") and can
 * never leave an acronym alone. This keeps minor words lowercase mid-title and leaves any word that already
 * has a capital EXACTLY as written (PAN, OTP, CTC, "WISETECH MEP"), because titles are often user data.
 */
const MINOR_WORDS = new Set([
  "a", "an", "and", "as", "at", "but", "by", "for", "from", "in", "into", "nor",
  "of", "on", "onto", "or", "over", "per", "so", "the", "to", "up", "via", "vs", "with", "yet",
])

const capitaliseWord = (word: string): string => {
  const match = word.match(/^([^\p{L}\p{N}]*)(.*)$/u)
  if (!match) return word
  const [, lead, rest] = match
  return rest ? `${lead}${rest.charAt(0).toUpperCase()}${rest.slice(1)}` : word
}

export function titleCase(value: string): string {
  if (!value) return value
  const words = value.split(/(\s+)/)
  const content = words.map((w, i) => (w.trim() ? i : -1)).filter((i) => i !== -1)
  if (!content.length) return value
  const first = content[0]
  const last = content[content.length - 1]
  return words
    .map((word, i) => {
      if (!word.trim()) return word
      if (/\p{Lu}/u.test(word)) return word
      const bare = word.replace(/[^\p{L}\p{N}]/gu, "").toLowerCase()
      if (i !== first && i !== last && MINOR_WORDS.has(bare)) return word
      return capitaliseWord(word)
    })
    .join("")
}

/**
 * Title-case the text in a title's children: plain strings, arrays and fragments are rewritten; elements
 * (an icon, a link, a badge) pass through untouched — a caller rendering an element chose its own text.
 */
export function titleCaseChildren(children: React.ReactNode): React.ReactNode {
  if (typeof children === "string") return titleCase(children)
  // Children.map (not Array.map) keys each element, so mixed text + icon children raise no key warnings.
  if (Array.isArray(children)) return React.Children.map(children, (c) => titleCaseChildren(c))
  if (React.isValidElement<{ children?: React.ReactNode }>(children) && children.type === React.Fragment) {
    return React.cloneElement(children, undefined, titleCaseChildren(children.props.children))
  }
  return children
}
