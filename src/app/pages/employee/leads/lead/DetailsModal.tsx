import { Modal } from "react-bootstrap";
import { useEffect, useState } from "react";
import LeadFormModal from "./LeadFormModal";
import { fetchAllEmployeesAsync } from "@redux/slices/allEmployees";

interface DetailsModalProps {
  open: boolean;
  onClose: () => void;
  Datas: any[];
  onLeadCreated?: (leadData: any) => void;
  closeDetailsModal?: () => void;
}

const DetailsModal = ({ open, onClose, closeDetailsModal, Datas, onLeadCreated }: DetailsModalProps) => {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<any | null>(null);

  const handleTemplateClick = (template: any) => {
    setCurrentTemplate(template);
    setShowLeadForm(true);
  };

  const handleLeadFormClose = () => {
    setShowLeadForm(false);
    setCurrentTemplate(null);
    onClose();
  };

  const handleLeadSubmit = (formData: any) => {
    if (!currentTemplate) return;

    const leadData = {
      ...formData,
      template: currentTemplate.id,
      templateTitle: currentTemplate.title,
    };

    onLeadCreated?.(leadData);
    handleLeadFormClose();
    onClose();
  };

  useEffect(() => {
    fetchAllEmployeesAsync();
  }, []);

  return (
    <>
      <Modal
        show={open}
        onHide={onClose}
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
            onClick={onClose}
            aria-label="Close modal"
          />

          {/* Title */}
          <div className="mb-4">
            <h4
              className="fw-semibold mb-2"
              style={{ fontSize: "clamp(1.25rem, 3vw, 1.5rem)" }}
            >
              New Project
            </h4>
            {/* <p
              className="text-muted mb-0"
              style={{ fontSize: "clamp(0.875rem, 2vw, 1rem)" }}
            >
              Select a template to start your lead
            </p> */}
          </div>

          {/* Template Cards */}
          <div className="row g-3 g-md-4 mt-3">
            {Datas.map((template) => (
              <div className="col-12 col-md-6 col-lg-4 mb-4" key={template.id}>
                <div
                  className="d-flex flex-column justify-content-center align-items-center text-center h-100 transition-all"
                  style={{
                    minHeight: "180px",
                    height: "clamp(160px, 20vw, 193px)",
                    backgroundColor:
                      hoveredCard === template.id ? "#f8f0f0" : "#fdf5f5",
                    border:
                      hoveredCard === template.id
                        ? "1px solid #9D4141"
                        : "1px solid #eacaca",
                    borderRadius: "16px",
                    padding: "clamp(16px, 2vw, 20px)",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    transform:
                      hoveredCard === template.id
                        ? "translateY(-2px)"
                        : "translateY(0)",
                    boxShadow:
                      hoveredCard === template.id
                        ? "0 8px 25px rgba(0,0,0,0.1)"
                        : "0 2px 8px rgba(0,0,0,0.05)",
                  }}
                  onClick={() => handleTemplateClick(template)}
                  onMouseEnter={() => setHoveredCard(template.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleTemplateClick(template);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Select ${template.title}`}
                >
                  <div
                    className="fw-semibold mb-2"
                    style={{
                      fontSize: "clamp(1rem, 2.5vw, 1.125rem)",
                      color:
                        hoveredCard === template.id ? "#9D4141" : "#212529",
                    }}
                  >
                    {template.title}
                  </div>
                  <div
                    // className="text-muted"
                    style={{
                      fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                      color:"#A57C7C",
                      opacity: 0.8,
                    }}
                  >
                    {template.description || " "}

                  </div>

                  {/* Bottom hover indicator */}
                  {hoveredCard === template.id && (
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

        <style jsx>{`
          .transition-all {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .modal-content {
            max-height: 90vh;
            overflow-y: auto;
          }

          [role="button"]:focus {
            outline: 2px solid #0d6efd;
            outline-offset: 2px;
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
        `}</style>
      </Modal>

      {/* Lead Form Modal */}
      {currentTemplate && (
        <LeadFormModal
          leadTemplateId={currentTemplate.id}
          open={showLeadForm}
          onClose={handleLeadFormClose}
          onSubmit={handleLeadSubmit}
          title={`New ${currentTemplate.title}`}
          initialData={{...currentTemplate, title: ''}}
        />
      )}
    </>
  );
};

export default DetailsModal;
