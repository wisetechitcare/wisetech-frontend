import React from "react";
import { Modal } from "react-bootstrap";
import { WtCloseButton } from "@app/modules/common/components/ui/tw";
import ChartVisibilitySettings from "./ChartVisibilitySettings";

/**
 * "Customize Cards Visibility" — the chart on/off list, in a dialog.
 *
 * One component for the three screens that open it (Leads, Leads Overview, Projects Overview).
 * Each used to paste its own copy, and none had a close control: on a phone the only way out
 * was tapping the backdrop, which the full-width list barely left visible.
 *
 * Phones: full screen (`fullscreen="sm-down"`), with the title and close button pinned while the
 * list scrolls. Larger screens: a centred dialog.
 */
const ChartVisibilityModal: React.FC<{
  show: boolean;
  onHide: () => void;
  /** A PROJECT_CHART_SETTINGS_MODAL_TYPE value. */
  type: string;
}> = ({ show, onHide, type }) => (
  <Modal show={show} onHide={onHide} size="xl" centered fullscreen="sm-down" scrollable>
    {/*
      Sticky, so the title and the close button stay reachable while the card
      list scrolls. `bg-body` rather than a literal white: this is a
      react-bootstrap header, so it takes Bootstrap's own themed background
      instead of an MUI token, and still follows the colour mode.
    */}
    <Modal.Header className="border-bottom px-4 py-3 bg-body position-sticky top-0" style={{ zIndex: 1 }}>
      <Modal.Title as="h2" style={{ fontFamily: "Inter", fontWeight: 600, fontSize: 17, color: "#1E293B", margin: 0 }}>
        Customize Cards Visibility
      </Modal.Title>
      <WtCloseButton onClick={onHide} aria-label="Close" className="ms-auto" />
    </Modal.Header>
    <Modal.Body className="px-3 py-3 px-sm-4">
      <ChartVisibilitySettings type={type} />
    </Modal.Body>
  </Modal>
);

export default ChartVisibilityModal;
