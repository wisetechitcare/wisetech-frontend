import React from "react";
import { Modal } from "react-bootstrap";
import CompanyChartSettingsForm from "./CompanyChartSettingsForm";

interface CompanyChartSettingsModalProps {
  show: boolean;
  onHide: () => void;
}

const CompanyChartSettingsModal: React.FC<CompanyChartSettingsModalProps> = ({
  show,
  onHide,
}) => {
  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title style={{ fontFamily: "Inter", fontSize: "18px", fontWeight: "600" }}>
          Company Chart Settings
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <CompanyChartSettingsForm onSaveSuccess={onHide} />
      </Modal.Body>
    </Modal>
  );
};

export default CompanyChartSettingsModal;