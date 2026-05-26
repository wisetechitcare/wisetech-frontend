import { KTIcon } from "@metronic/helpers";
import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";
import ObSectionsSidebar, { type ObSectionItem, type ObSidebarProfile } from "./ObSectionsSidebar";

export type WizardSectionConfig = {
  id: string;
  title: string;
  icon: string;
  subtitle?: string;
};

type WizardSectionLayoutProps = {
  sections: WizardSectionConfig[];
  activeSection: string;
  onSectionChange: (sectionId: string) => void;
  sidebarProfile?: ObSidebarProfile;
  children: ReactNode;
};

function WizardSectionCard({
  section,
  children,
}: {
  section: WizardSectionConfig;
  children: ReactNode;
}) {
  return (
    <section
      className="ob-section-card ob-section-card-active"
      id={`section-${section.id}`}
    >
      <div className="ob-section-header ob-section-header-static">
        <span className="ob-section-icon-wrap">
          <KTIcon iconName={section.icon} className="fs-3" />
        </span>
        <span className="flex-grow-1 text-start">
          <span className="ob-section-header-title d-block">{section.title}</span>
          {section.subtitle && (
            <span className="text-muted fs-8">{section.subtitle}</span>
          )}
        </span>
      </div>
      <div className="ob-section-body">{children}</div>
    </section>
  );
}

function WizardSectionLayout({
  sections,
  activeSection,
  onSectionChange,
  sidebarProfile,
  children,
}: WizardSectionLayoutProps) {
  const activeSectionConfig =
    sections.find((s) => s.id === activeSection) || sections[0];

  const sidebarSections: ObSectionItem[] = sections.map((section) => ({
    id: section.id,
    label: section.title,
    ktIcon: section.icon,
  }));

  return (
    <div className="ob-content-row">
      <ObSectionsSidebar
        sections={sidebarSections}
        activeSection={activeSection}
        onSectionChange={onSectionChange}
        profile={sidebarProfile}
      />

      {/* ── Form area ── */}
      <div className="ob-form-area">
        <AnimatePresence mode="wait">
          <motion.div
            className="ob-section-motion"
            key={activeSection}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
          >
            <WizardSectionCard section={activeSectionConfig}>
              {children}
            </WizardSectionCard>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default WizardSectionLayout;
