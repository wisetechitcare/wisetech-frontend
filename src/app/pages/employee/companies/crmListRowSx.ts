/**
 * CRM Contacts / Companies list rows — same tint recipe as Leads (`leadRowSx`)
 * and Projects (`${statusColor}20`): fixed Active / Inactive colours, not the
 * per-record status-master palette (that read as random blues/purples).
 *
 * Active green matches the company form Active option (`#50cd89`).
 * Inactive grey matches SmartAvatar's inactive badge (`#64748b`).
 */
export const CRM_ACTIVE_COLOR = "#50cd89";
export const CRM_INACTIVE_COLOR = "#64748b";

const BLACKLISTED = { bg: "#1a1a1a", hover: "#3a3a3a", text: "#ffffff" };

type CrmListRowOpts = {
  /** Company blacklist wins over active/inactive. */
  blacklisted?: boolean;
};

/** MRT `muiTableBodyRowProps` `.sx` for active / inactive / blacklisted rows. */
export function crmListRowSx(active: boolean, opts: CrmListRowOpts = {}) {
  if (opts.blacklisted) {
    return {
      cursor: "pointer",
      backgroundColor: BLACKLISTED.bg,
      borderBottom: "6px solid transparent",
      backgroundClip: "padding-box" as const,
      "& .MuiTableCell-root": {
        whiteSpace: "nowrap" as const,
        overflow: "hidden",
        textOverflow: "ellipsis",
        fontSize: "14px",
        fontFamily: "Inter",
        fontWeight: "400",
        padding: "8px 16px !important",
        borderBottom: "2px solid white",
        borderTop: "2px solid white",
        color: `${BLACKLISTED.text} !important`,
        backgroundColor: `${BLACKLISTED.bg} !important`,
      },
      "& .MuiTableCell-root:first-of-type": {
        borderTopLeftRadius: "12px",
        borderBottomLeftRadius: "12px",
        borderLeft: "3px solid white",
      },
      "& .MuiTableCell-root:last-of-type": {
        borderTopRightRadius: "12px",
        borderBottomRightRadius: "12px",
        borderRight: "3px solid white",
      },
      "&:hover": {
        backgroundColor: BLACKLISTED.hover,
        "& td": { color: `${BLACKLISTED.text} !important` },
      },
      "&.MuiTableRow-root:hover .MuiTableCell-root": {
        backgroundColor: `${BLACKLISTED.hover} !important`,
        color: `${BLACKLISTED.text} !important`,
      },
    };
  }

  const color = active ? CRM_ACTIVE_COLOR : CRM_INACTIVE_COLOR;
  const text = active ? "#333" : CRM_INACTIVE_COLOR;

  return {
    cursor: "pointer",
    // Lead/Project pattern: hex + `20` alpha channel (~12% tint, readable text).
    backgroundColor: `${color}20`,
    borderBottom: "6px solid transparent",
    backgroundClip: "padding-box" as const,
    transition: "background-color 0.2s ease, box-shadow 0.2s ease",
    "& .MuiTableCell-root": {
      whiteSpace: "nowrap" as const,
      overflow: "hidden",
      textOverflow: "ellipsis",
      fontSize: "14px",
      fontFamily: "Inter",
      fontWeight: "400",
      padding: "8px 16px !important",
      borderBottom: "2px solid white",
      borderTop: "2px solid white",
      color: text,
      backgroundColor: `${color}20`,
    },
    "& .MuiTableCell-root:first-of-type": {
      borderTopLeftRadius: "12px",
      borderBottomLeftRadius: "12px",
      // Status rail — green / grey, not white or a master colour.
      borderLeft: `3px solid ${color} !important`,
    },
    "& .MuiTableCell-root:last-of-type": {
      borderTopRightRadius: "12px",
      borderBottomRightRadius: "12px",
      borderRight: "3px solid white",
    },
    "&:hover": {
      backgroundColor: (t: { palette: { background: { default: string } } }) =>
        `${t.palette.background.default} !important`,
      boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
      "& td": { color: text },
      "& .MuiTableCell-root:first-of-type": {
        borderLeftColor: `${color} !important`,
      },
    },
    "&.MuiTableRow-root:hover .MuiTableCell-root": {
      backgroundColor: (t: { palette: { background: { default: string } } }) =>
        `${t.palette.background.default} !important`,
      color: `${text} !important`,
    },
  };
}
