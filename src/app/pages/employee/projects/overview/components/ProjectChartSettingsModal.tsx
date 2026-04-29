import React from "react";
import { Modal } from "react-bootstrap";
import ProjectChartSettingsForm from "./ProjectChartSettingsForm";

interface ProjectChartSettingsModalProps {
  show: boolean;
  onHide: () => void;
}

const ProjectChartSettingsModal: React.FC<ProjectChartSettingsModalProps> = ({
  show,
  onHide,
}) => {
  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title style={{ fontFamily: "Inter", fontSize: "18px", fontWeight: "600" }}>
          Project Chart Settings
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <ProjectChartSettingsForm onSaveSuccess={onHide} />
      </Modal.Body>
    </Modal>
  );
};

export default ProjectChartSettingsModal;