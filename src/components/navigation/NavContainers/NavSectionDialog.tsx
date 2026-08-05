import { useEffect, useState } from 'react';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import { Dialog, IconButton } from '@mui/material';
import type { NavContainer } from '@hooks/useNavContainers';
import { NavLinkTile, NavOpenerTile } from './NavTile';
import { navIcon } from './navIcons';
import { LAUNCHER_ROW, sectionAccent } from './navTheme';

/**
 * A section's contents, opened from its Home tile.
 *
 * Two levels in ONE dialog rather than a second stacked dialog: the section's own links,
 * and — when the section contains a group (Project Team, Finance, Organization) — that
 * group's links behind a back control. Stacking dialogs is unusable on a phone, where
 * both would be full-screen with a scrim between them.
 */
export function NavSectionDialog({
  container, open, onClose,
}: { container: NavContainer | null; open: boolean; onClose: () => void }) {
  const [groupId, setGroupId] = useState<string | null>(null);

  // Always reopen at the top level; a stale drill-in from the previous section would
  // otherwise be the first thing shown.
  useEffect(() => {
    if (open) setGroupId(null);
  }, [open, container?.id]);

  if (!container) return null;

  const accent = sectionAccent(container.id);
  const group = groupId
    ? container.entries.find((e) => e.kind === 'group' && e.group.id === groupId)
    : undefined;
  const activeGroup = group?.kind === 'group' ? group.group : null;

  const HeaderIcon = navIcon(activeGroup ? activeGroup.fontIcon : container.icon);
  const title = activeGroup ? activeGroup.title : container.title;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      // PaperProps, not slotProps.paper — this project is on MUI v5, where the `paper`
      // slot does not exist yet (it arrives in v6).
      PaperProps={{
        className:
          'rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900',
      }}
    >
      <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
        {activeGroup ? (
          <IconButton onClick={() => setGroupId(null)} aria-label="Back to section" size="small" className="shrink-0">
            <ArrowBackRounded fontSize="small" />
          </IconButton>
        ) : (
          <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent.iconWrap}`}>
            <HeaderIcon sx={{ fontSize: 22 }} />
          </span>
        )}
        <h2 className="min-w-0 flex-1 truncate text-[17px] font-bold text-slate-900 dark:text-slate-100">
          {title}
        </h2>
        <IconButton onClick={onClose} aria-label="Close" size="small" className="shrink-0">
          <CloseRounded fontSize="small" />
        </IconButton>
      </div>

      <div className="bg-gradient-to-br from-[#eef2f9] via-[#f5f8fb] to-[#e9eef8] px-5 py-7 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
        <div className={LAUNCHER_ROW}>
          {activeGroup
            ? activeGroup.links.map((link) => (
              <NavLinkTile
                key={link.id}
                to={link.to}
                accent={accent}
                onNavigate={onClose}
                visual={{
                  // Children carry no icon of their own in the nav tree, so they take
                  // the group's glyph rather than an invented one.
                  title: link.title,
                  icon: link.fontIcon ?? activeGroup.fontIcon,
                  badgeCount: link.badgeCount,
                }}
              />
            ))
            : container.entries.map((entry) => entry.kind === 'link' ? (
              <NavLinkTile
                key={entry.link.id}
                to={entry.link.to}
                accent={accent}
                onNavigate={onClose}
                visual={{
                  title: entry.link.title,
                  icon: entry.link.fontIcon,
                  badgeCount: entry.link.badgeCount,
                }}
              />
            ) : (
              <NavOpenerTile
                key={entry.group.id}
                accent={accent}
                visual={{
                  title: entry.group.title,
                  icon: entry.group.fontIcon,
                  // Pending approvals from inside the group, so an alert is not hidden
                  // one level down.
                  badgeCount: entry.group.links.reduce((n, l) => n + (l.badgeCount ?? 0), 0),
                }}
                onOpen={() => setGroupId(entry.group.id)}
              />
            ))}
        </div>
      </div>
    </Dialog>
  );
}
