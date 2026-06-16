import { useEffect, useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { KTIcon } from "@metronic/helpers";

export type ObSectionItem = {
  id: string;
  label: string;
  icon?: ReactNode;
  ktIcon?: string;
  isComplete?: boolean;
};

export type ObSidebarProfile = {
  name: string;
  avatar?: string;
  initials: string;
  animate?: boolean;
};

type ObSectionsSidebarProps = {
  sections: ObSectionItem[];
  activeSection: string;
  onSectionChange: (sectionId: string) => void;
  title?: string;
  profile?: ObSidebarProfile;
};

function SectionNavButton({
  section,
  isActive,
  onSelect,
}: {
  section: ObSectionItem;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`ob-section-nav-link${isActive ? " active" : ""}${section.isComplete ? " complete" : ""}`}
      onClick={onSelect}
    >
      <span className="ob-section-nav-icon">
        {section.icon ??
          (section.ktIcon ? <KTIcon iconName={section.ktIcon} className="fs-4" /> : null)}
      </span>
      <span className="ob-section-nav-label">{section.label}</span>
      {section.isComplete && (
        <span className="ob-section-nav-check" aria-hidden>
          <KTIcon iconName="check" className="fs-7 text-white" />
        </span>
      )}
    </button>
  );
}

function ObSectionsSidebar({
  sections,
  activeSection,
  onSectionChange,
  title = "Sections",
  profile,
}: ObSectionsSidebarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const activeItem = sections.find((s) => s.id === activeSection) ?? sections[0];

  useEffect(() => {
    setDrawerOpen(false);
  }, [activeSection]);

  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const selectSection = (id: string) => {
    onSectionChange(id);
    setDrawerOpen(false);
  };

  const sidebarProfile = profile && (profile.name || profile.avatar) ? (
    <div className={`ob-sidebar-profile${profile.animate ? " animate-in" : ""}`}>
      <span className="ob-sidebar-profile-avatar" aria-hidden>
        {profile.avatar ? <img src={profile.avatar} alt="" /> : profile.initials}
      </span>
      <span className="ob-sidebar-profile-name" title={profile.name}>
        {profile.name}
      </span>
    </div>
  ) : null;

  return (
    <>
      <div className="ob-mobile-sections-bar">
        <button
          type="button"
          className="ob-mobile-sections-toggle"
          onClick={() => setDrawerOpen(true)}
          aria-expanded={drawerOpen}
          aria-controls="ob-mobile-sections-drawer"
        >
          <Menu size={18} aria-hidden />
          <span>Sections</span>
        </button>
        <span className="ob-mobile-sections-current" title={activeItem?.label}>
          {activeItem?.label}
        </span>
      </div>

      <aside className="ob-sections-sidebar" aria-label={title}>
        <div className="ob-sections-sidebar-title">{title}</div>
        <nav className="ob-sections-sidebar-nav">
          {sections.map((section) => (
            <SectionNavButton
              key={section.id}
              section={section}
              isActive={activeSection === section.id}
              onSelect={() => onSectionChange(section.id)}
            />
          ))}
        </nav>
        {sidebarProfile}
      </aside>

      {drawerOpen && (
        <div
          className="ob-mobile-sections-overlay"
          role="presentation"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {drawerOpen && (
      <div
        id="ob-mobile-sections-drawer"
        className="ob-mobile-sections-drawer is-open"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="ob-mobile-sections-drawer-header">
          <span className="ob-mobile-sections-drawer-title">{title}</span>
          <button
            type="button"
            className="ob-mobile-sections-close"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close sections menu"
          >
            <X size={18} />
          </button>
        </div>
        <nav className="ob-mobile-sections-drawer-nav">
          {sections.map((section) => (
            <SectionNavButton
              key={section.id}
              section={section}
              isActive={activeSection === section.id}
              onSelect={() => selectSection(section.id)}
            />
          ))}
        </nav>
      </div>
      )}
    </>
  );
}

export default ObSectionsSidebar;
