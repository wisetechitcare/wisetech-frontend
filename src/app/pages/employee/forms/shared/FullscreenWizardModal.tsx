import type { ReactNode, Ref } from "react";
import { Modal } from "react-bootstrap";
import { KTIcon } from "@metronic/helpers";
import "./Workspace.css";
import "../onboarding/OnboardingModal.css";
import { Button } from '@/ds/ui/button';

/**
 * Fullscreen wizard host — same shell Employee Onboarding / Leads use.
 *
 * Workspace.css only applies enterprise-wizard height rules under
 * `.wt-wizard-modal`. Mounting a wizard in the page content area skips that
 * chrome. One host, reused by every full-page wizard.
 */
export interface FullscreenWizardModalProps {
  show: boolean;
  onClose: () => void;
  /** Accessible name for the header X. */
  closeLabel: string;
  children: ReactNode;
  bodyRef?: Ref<HTMLDivElement>;
  /** Extra modal class (e.g. `onboarding-wizard-modal` for draft-notice CSS). */
  className?: string;
}

export function FullscreenWizardModal({
  show,
  onClose,
  closeLabel,
  children,
  bodyRef,
  className,
}: FullscreenWizardModalProps) {
  return (
    <Modal
      show={show}
      onHide={onClose}
      fullscreen
      enforceFocus={false}
      dialogClassName="responsive-modal"
      className={["responsive-modal", "wt-wizard-modal", className].filter(Boolean).join(" ")}
    >
      <div className="ob-wizard-shell">
        <Button variant="ghost" size="icon-sm" type="button" onClick={onClose} aria-label={closeLabel}>
          <KTIcon iconName="cross" className="fs-2" />
        </Button>
        <Modal.Body ref={bodyRef} style={{ padding: 0, height: "100%", overflow: "hidden" }}>
          {children}
        </Modal.Body>
      </div>
    </Modal>
  );
}

export default FullscreenWizardModal;
