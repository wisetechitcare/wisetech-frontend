import { Modal } from "react-bootstrap";
import { useState } from "react";
import BlankBasicProjectForm from "./BlankBasicProjectForm";
import { ProjectType } from "@models/clientProject";

interface ChooseProjectTypeModalProps {
  show: boolean;
  onHide: () => void;
  onProjectTypeSelect?: (projectType: ProjectType) => void;
}

//

const projectTypes: ProjectType[] = [
  {
    id: "blank",
    title: "Blank Project",
    subtitle: "Start from scratch",
  },
  {
    id: "mep",
    title: "MEP Project",
    subtitle: "Template",
  },
  {
    id: "web",
    title: "Web Development",
    subtitle: "Template",
  },
];

const ChooseProjectTypeModal = ({
  show,
  onHide,
  onProjectTypeSelect,
}: ChooseProjectTypeModalProps) => {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [hoveredCard2, setHoveredCard2] = useState<string | null>(null);
  const [showBlankProjectForm, setShowBlankProjectForm] = useState(false);
  const [selectedProjectType, setSelectedProjectType] =
    useState<ProjectType | null>(null);

  const handleCardClick = (projectType: ProjectType) => {
    setSelectedProjectType(projectType);
    setShowBlankProjectForm(true);
    onProjectTypeSelect?.(projectType);
  };

  const handleCloseBlankForm = () => {
    setShowBlankProjectForm(false);
    setSelectedProjectType(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, projectType: ProjectType) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleCardClick(projectType);
    }
  };

  return (
    <>
      <Modal
        show={show}
        onHide={onHide}
        centered
        size="xl"
        contentClassName="border-0 shadow-lg"
        dialogClassName="modal-dialog-centered"
      >
        <div
          className="bg-white position-relative"
          style={{
            maxWidth: "1140px",
            borderRadius: "12px",
            padding: "clamp(24px, 4vw, 44px)",
            margin: "0 auto",
            width: "100%",
          }}
        >
          {/* Close Button */}
          <button
            type="button"
            className="btn-close position-absolute"
            style={{
              top: "20px",
              right: "20px",
              zIndex: 1000,
            }}
            onClick={onHide}
            aria-label="Close modal"
          />

          {/* Title */}
          <div className="mb-4">
            <h4
              className="fw-semibold mb-2"
              style={{ fontSize: "clamp(1.25rem, 3vw, 1.5rem)" }}
            >
              Create New Project
            </h4>
            <p
              className="text-muted mb-0"
              style={{ fontSize: "clamp(0.875rem, 2vw, 1rem)" }}
            >
              Choose a project type to get started
            </p>
          </div>

          {/* Project Type Cards */}
          <div
            className="row g-3 g-md-4"
            style={{ marginTop: "clamp(20px, 3vw, 28px)" }}
          >
            {projectTypes?.map((projectType) => (
              <div
                key={projectType.id}
                className="col-12 col-md-6 col-lg-4 mb-4"
              >
                <div
                  className="d-flex flex-column justify-content-center align-items-center text-center h-100 transition-all"
                  style={{
                    minHeight: "180px",
                    height: "clamp(160px, 20vw, 193px)",
                    backgroundColor:
                      hoveredCard === projectType.id ? "#f8f0f0" : "#fdf5f5",
                    border:
                      hoveredCard === projectType.id
                        ? "1px solid #9D4141"
                        : "1px solid #eacaca",
                    borderRadius: "16px",
                    padding: "clamp(16px, 2vw, 20px)",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    transform:
                      hoveredCard === projectType.id
                        ? "translateY(-2px)"
                        : "translateY(0)",
                    boxShadow:
                      hoveredCard === projectType.id
                        ? "0 8px 25px rgba(0,0,0,0.1)"
                        : "0 2px 8px rgba(0,0,0,0.05)",
                  }}
                  onClick={() => handleCardClick(projectType)}
                  onMouseEnter={() => setHoveredCard(projectType.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                  onKeyDown={(e) => handleKeyDown(e, projectType)}
                  tabIndex={0}
                  role="button"
                  aria-label={`Select ${projectType.title} project type`}
                >
                  {/* Title */}
                  <div
                    className="fw-semibold mb-2"
                    style={{
                      fontSize: "clamp(1rem, 2.5vw, 1.125rem)",
                      color:
                        hoveredCard === projectType.id ? "#9D4141" : "#212529",
                    }}
                  >
                    {projectType.title}
                  </div>

                  {/* Subtitle */}
                  {projectType.subtitle && (
                    <div
                      className="text-muted"
                      style={{
                        fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                        opacity: 0.8,
                      }}
                    >
                      {projectType.subtitle}
                    </div>
                  )}

                  {/* Hover indicator */}
                  {hoveredCard === projectType.id && (
                    <div
                      className="position-absolute bottom-0 start-50 translate-middle-x"
                      style={{
                        width: "60%",
                        height: "3px",
                        backgroundColor: "#9D4141",
                        borderRadius: "2px",
                        marginBottom: "-1px",
                      }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Custom Styles */}
        <style jsx>{`
          .transition-all {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .modal-content {
            max-height: 90vh;
            overflow-y: auto;
          }

          @media (max-width: 768px) {
            .modal-dialog {
              margin: 1rem;
              max-width: calc(100vw - 2rem);
            }
          }

          @media (max-width: 576px) {
            .modal-dialog {
              margin: 0.5rem;
              max-width: calc(100vw - 1rem);
            }
          }

          /* Focus styles for accessibility */
          [role="button"]:focus {
            outline: 2px solid #0d6efd;
            outline-offset: 2px;
          }

          /* Loading state if needed */
          .card-loading {
            pointer-events: none;
            opacity: 0.6;
          }
        `}</style>
      </Modal>
      <BlankBasicProjectForm
        showBlankProjectForm={showBlankProjectForm}
        onHide={handleCloseBlankForm}
        projectType={selectedProjectType}
      />
    </>
  );
};

export default ChooseProjectTypeModal;
