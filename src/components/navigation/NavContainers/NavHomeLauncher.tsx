import { useState } from 'react';
import { useNavContainers, type NavContainer } from '@hooks/useNavContainers';
import { NavOpenerTile } from './NavTile';
import { NavSectionDialog } from './NavSectionDialog';
import { LAUNCHER_ROW, sectionAccent } from './navTheme';

/**
 * Home body — one tile per navigation SECTION, nothing else.
 *
 * Showing every destination at once made the page a long scroll of near-identical icons
 * where the section headings were the only structure. Collapsing to five tiles makes the
 * shape of the product the first thing you see; a section's contents open on demand.
 */
export function NavHomeLauncher() {
  const containers = useNavContainers();
  const [openSection, setOpenSection] = useState<NavContainer | null>(null);

  // `useNavigation` recomputes when the authz capabilities land, so this is briefly empty
  // right after login. Render nothing rather than flashing an empty state.
  if (containers.length === 0) return null;

  return (
    <>
      <div className={LAUNCHER_ROW}>
        {containers.map((container) => (
          <NavOpenerTile
            key={container.id}
            accent={sectionAccent(container.id)}
            visual={{
              title: container.title,
              icon: container.icon,
              // Roll the section's pending approvals up to its tile — with the contents
              // behind a dialog, an alert inside would otherwise be invisible from Home.
              badgeCount: container.badgeTotal,
            }}
            onOpen={() => setOpenSection(container)}
          />
        ))}
      </div>

      <NavSectionDialog
        container={openSection}
        open={!!openSection}
        onClose={() => setOpenSection(null)}
      />
    </>
  );
}
