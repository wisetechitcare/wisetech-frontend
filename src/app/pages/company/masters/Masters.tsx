import React, { useState } from 'react'
import Towns from './Towns';
import Departments from '../Departments';
import Designations from '../Designation';
import OrganizationConfigure from './OrganizationConfigure';
import { C, FONT, SP, RADIUS } from '@app/modules/configuration';

/**
 * Company masters, one section at a time.
 *
 * These four used to render STACKED on a single scroll with no sub-navigation, so the
 * page looked like it contained only Shifts — everything below the first (often empty)
 * card sat under the fold with nothing hinting it existed. Designations in particular
 * was effectively unfindable, which is why the onboarding "Job Profile" list appeared
 * to have no config screen at all.
 *
 * A deliberately light strip rather than the kit's ConfigPageLayout `tabs`: each
 * section already renders its own ConfigPageLayout header, so a second layout here
 * would stack two banners. This sits ABOVE those headers and only chooses which one
 * mounts, which also means only the visible section fetches.
 */

interface MasterSection {
  id: string;
  label: string;
  icon: string;
  render: () => React.ReactNode;
}

const SECTIONS: MasterSection[] = [
  { id: 'shifts', label: 'Shifts', icon: 'bi-clock', render: () => <OrganizationConfigure /> },
  { id: 'departments', label: 'Departments', icon: 'bi-diagram-2', render: () => <Departments /> },
  // Named for the field it feeds. The table/column is `designations.role`, but the
  // onboarding form calls it Job Profile, and that mismatch is what made it unfindable.
  { id: 'designations', label: 'Job Profiles (Designations)', icon: 'bi-briefcase', render: () => <Designations /> },
  { id: 'towns', label: 'Towns', icon: 'bi-geo-alt', render: () => <Towns /> },
];

function Masters() {
  const [activeId, setActiveId] = useState(SECTIONS[0].id);
  const active = SECTIONS.find((s) => s.id === activeId) ?? SECTIONS[0];

  return (
    <>
      <div
        role="tablist"
        aria-label="Company masters"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: SP.sm,
          padding: SP.sm,
          marginBottom: SP.md,
          background: '#fff',
          border: `1px solid ${C.border}`,
          borderRadius: RADIUS.xl,
          boxShadow: '0 1px 0 #e8eaf0, 0 4px 24px rgba(24,28,50,0.06)',
        }}
      >
        {SECTIONS.map((section) => {
          const isActive = section.id === activeId;
          return (
            <button
              key={section.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveId(section.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: SP.sm,
                padding: `${SP.sm} ${SP.lg}`,
                border: `1px solid ${isActive ? 'transparent' : C.border}`,
                borderRadius: RADIUS.md,
                background: isActive ? C.info : '#fff',
                color: isActive ? '#fff' : C.textPrimary,
                fontFamily: FONT.body,
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
              }}
            >
              <i className={`bi ${section.icon}`} aria-hidden />
              {section.label}
            </button>
          );
        })}
      </div>

      {active.render()}
    </>
  )
}

export default Masters
