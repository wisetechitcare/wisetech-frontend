import { useTheme } from "@mui/material";

/**
 * Header sort indicators for `MaterialTable`, handed to MRT through its `icons` prop.
 *
 * Unsorted: a quiet up/down chevron pair that wakes on header hover (the CSS for that lives
 * with the head cell). Sorted: one arrow in a tinted chip — up for ascending, down for
 * descending — so the active column is the only thing in the header row that has colour.
 *
 * Colours are explicit rather than `currentColor`: MRT forces the sort icon's `color` with
 * `!important`, which would repaint a `currentColor` glyph grey.
 */
const INK = { light: "#1E3A8A", dark: "#93C5FD" };

const useInk = () => (useTheme().palette.mode === "dark" ? INK.dark : INK.light);

/** Unsorted — replaces MRT's rotated "swap" arrows. Ignores MRT's rotate transform. */
export const SortNeutralIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden style={{ display: "block" }}>
    <path d="M4 5.5 7 2.5l3 3M4 8.5l3 3 3-3" stroke="#98A2B3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * Sorted — MUI's TableSortLabel flips this icon 180° for ascending, so it is drawn as a
 * down arrow and rotates itself into an up arrow.
 */
export const SortActiveIcon = (props: { className?: string; style?: React.CSSProperties }) => {
  const ink = useInk();
  return (
    <span
      className={props.className}
      style={{
        ...props.style,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 20,
        height: 20,
        borderRadius: 6,
        background: `${ink}1F`,
        boxShadow: `inset 0 0 0 1px ${ink}33`,
        flexShrink: 0,
      }}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
        <path d="M6 2v8M2.75 6.75 6 10l3.25-3.25" stroke={ink} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
};
