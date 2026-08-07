import React from 'react';
import { Box } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { GlassSurface } from '@app/modules/common/components/ui';
import { C, FONT } from './ConfigDesignSystem';

export interface ConfigRailItem {
  id: string;
  label: string;
  /**
   * Bootstrap icon class (`"bi-briefcase"`) or a KTIcon name (`"briefcase"`).
   *
   * Pass the SAME icon the section's own card uses. The rail is how a user finds a
   * section, so a rail entry drawn with a different glyph than the card it scrolls to
   * reads as a different thing entirely.
   */
  icon?: string;
  /** Shown right-aligned; omit for sections that have no count. */
  count?: number;
}

export interface ConfigRailGroup {
  id: string;
  label: string;
  items: ConfigRailItem[];
}

export interface ConfigSectionRailProps {
  groups: ConfigRailGroup[];
  /** Section currently in view — set by the caller's scroll-spy. */
  activeId: string;
  /** Scrolls the page to that section; the rail never swaps the content itself. */
  onChange: (id: string) => void;
  ariaLabel?: string;
}

/**
 * Grouped scroll-spy rail for configuration pages — the FaqsBoard pattern.
 *
 * The rail NAVIGATES, it does not filter: every section stays on the page in one
 * scroll and this highlights whichever one is in view.
 *
 * One element, two layouts, no duplicated markup:
 *   lg and up — sticky vertical rail beside the content, group headings visible.
 *   below lg  — the same rail becomes a horizontally scrolling strip above the
 *               content; headings hide (they cannot survive a single scroll line)
 *               and the count rides in the pill so nothing is lost.
 */
const ConfigSectionRail: React.FC<ConfigSectionRailProps> = ({
  groups,
  activeId,
  onChange,
  ariaLabel = 'Configuration sections',
}) => (
  <GlassSurface
    component="nav"
    aria-label={ariaLabel}
    variant="thin"
    radius={16}
    sx={{
      // Layout lives in `sx`, not Tailwind. GlassSurface renders an emotion-styled MUI
      // Box, and emotion injects its rules after Tailwind's utility layer — a utility
      // that collides with anything the styled Box sets loses silently. That is why an
      // earlier Tailwind version of this rail collapsed to content width with a scroll
      // bar. FaqsBoard's rail is sx for the same reason; sizes below match it.
      position: { lg: 'sticky' },
      top: { lg: 88 },
      alignSelf: { lg: 'flex-start' },
      width: { xs: '100%', lg: 232 },
      flexShrink: 0,
      p: 1,
      display: 'flex',
      flexDirection: { xs: 'row', lg: 'column' },
      alignItems: { xs: 'center', lg: 'stretch' },
      gap: { xs: 1, lg: 0.25 },
      // The strip scrolls itself rather than pushing the page wide.
      overflowX: { xs: 'auto', lg: 'visible' },
      overflowY: 'visible',
    }}
  >
    {groups.map((group, groupIndex) => (
      <React.Fragment key={group.id}>
        {/* Heading, not a control: bigger and heavier than the rows beneath it, with a
            rule above every group after the first. It has no hover, no pointer and no
            tab stop, so the distinction is behavioural as well as visual. */}
        <Box
          component="h3"
          sx={{
            display: { xs: 'none', lg: 'block' },
            px: 1.5,
            pb: 1,
            pt: groupIndex === 0 ? 0.5 : 2,
            mt: groupIndex === 0 ? 0 : 1,
            borderTop: groupIndex === 0 ? 0 : '1px solid',
            borderColor: C.border,
            fontFamily: FONT.body,
            fontSize: 14,
            fontWeight: 700,
            lineHeight: 1.25,
            letterSpacing: '-0.01em',
            color: C.textPrimary,
          }}
        >
          {group.label}
        </Box>

        {group.items.map((item) => {
          const active = item.id === activeId;
          return (
            <Box
              key={item.id}
              component="button"
              type="button"
              onClick={() => onChange(item.id)}
              aria-current={active ? 'true' : undefined}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                px: 1.5,
                py: 1.15,
                border: 0,
                // Metronic's globally imported style.scss carries UNLAYERED Bootstrap
                // button rules, so a <button> radius has to be stated here to win.
                borderRadius: '10px',
                cursor: 'pointer',
                font: 'inherit',
                fontFamily: FONT.body,
                fontSize: 13.5,
                textAlign: 'left',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'background-color .15s, color .15s',
                fontWeight: active ? 700 : 500,
                color: active ? '#fff' : C.textSecondary,
                bgcolor: active ? C.primary : 'transparent',
                '&:hover': { bgcolor: active ? C.primary : 'action.hover' },
              }}
            >
              {item.icon &&
                (item.icon.startsWith('bi-') ? (
                  <Box
                    component="i"
                    className={item.icon}
                    aria-hidden
                    sx={{ flexShrink: 0, fontSize: 15, lineHeight: 1 }}
                  />
                ) : (
                  <KTIcon iconName={item.icon} className="fs-6" />
                ))}
              <Box
                component="span"
                // Truncates in the rail; on the strip each pill keeps its full label
                // and the strip scrolls instead.
                sx={{ flex: { lg: 1 }, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                {item.label}
              </Box>
              {typeof item.count === 'number' && (
                <Box
                  component="span"
                  sx={{ flexShrink: 0, fontSize: 12, fontVariantNumeric: 'tabular-nums', opacity: active ? 0.85 : 0.65 }}
                >
                  {item.count}
                </Box>
              )}
            </Box>
          );
        })}
      </React.Fragment>
    ))}
  </GlassSurface>
);

export default ConfigSectionRail;
