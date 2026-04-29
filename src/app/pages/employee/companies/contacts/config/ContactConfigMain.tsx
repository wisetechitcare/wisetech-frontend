import { useState } from "react";
import PrefixSettingsForm from "@app/modules/common/components/PrefixSettingsForm";
import CompanyConfigForm from "../../companyConfig/components/CompanyConfigForm";
import { Container } from "react-bootstrap";
import { useContactConfig } from "@hooks/useContactConfig";

// Common button styles
const buttonStyles = {
  base: {
    border: "1px solid #9D4141",
    fontWeight: 500,
    color: "#9D4141",
    backgroundColor: "transparent",
    borderRadius: "5px",
    cursor: "pointer",
    transition: "all 0.3s ease-in-out",
    paddingLeft: "20px",
    paddingRight: "20px",
    height: "40px",
  },
  hover: {
    color: "white",
    backgroundColor: "#9D4141",
  },
};

const ContactConfigMain = () => {
  const {
    loading,
    contactRoleTypes,
    contactStatuses,
    fetchContactRoleTypes,
    fetchContactStatuses,
    handleContactRoleTypeDelete,
    handleContactStatusDelete,
    contactRoleTypeDeleteConfirmation,
  } = useContactConfig();

  const [showCompanyRoleTypeModal, setShowCompanyRoleTypeModal] = useState(false);
  const [editingCompanyRoleType, setEditingCompanyRoleType] = useState<any | null>(null);
  const [showContactStatusModal, setShowContactStatusModal] = useState(false);
  const [editingContactStatus, setEditingContactStatus] = useState<any | null>(null);

  const handleReferralTypeModalOpen = () => {
    setShowCompanyRoleTypeModal(true);
  };

  const handleReferralTypeModalClose = () => {
    setShowCompanyRoleTypeModal(false);
    setEditingCompanyRoleType(null);
  };

  const handleReferralTypeEdit = (contactRoleType: any) => {
    setEditingCompanyRoleType(contactRoleType);
    setShowCompanyRoleTypeModal(true);
  };

  const handleContactStatusEdit = (contactStatus: any) => {
    setEditingContactStatus(contactStatus);
    setShowContactStatusModal(true);
  };

  const handleContactStatusModalClose = () => {
    setShowContactStatusModal(false);
    setEditingContactStatus(null);
  };

  const handleContactStatusModalOpen = () => {
    setShowContactStatusModal(true);
  };

  if (loading) {
    return (
      <Container fluid className="my-4 w-100 px-0 d-flex justify-content-center align-items-center" style={{ minHeight: "300px" }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </Container>
    );
  }

  return (
    <div>
      {/* Configure Heading */}
      <div className="d-flex pb-4" style={{ fontFamily: "Barlow", fontSize: "24px", fontWeight: "600" }}>
        Contact Config
      </div>

      {/* Prefix Settings Card */}
      {/* <div className="card mb-5" style={{ fontFamily: "Inter", fontSize: "16px", fontWeight: "400" }}>
        <div className="card-body">
          <h5 className="card-title mb-4" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "16px" }}>
            Contact Prefix Settings
          </h5>
          <PrefixSettingsForm
            typeLabel="Contact"
            typeValue="CONTACT"
          />
        </div>
      </div> */}

      {/* Contact Role Type Card */}
      <div className="card mt-5" style={{ fontFamily: "Inter", fontSize: "16px", fontWeight: "400" }}>
        <div className="card-body">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
            <h5 className="card-title" style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
              fontStyle: "normal",
              fontSize: "16px",
              lineHeight: "100%",
              letterSpacing: "0"
            }}>
              Contact Roles
            </h5>
            <button
              onClick={handleReferralTypeModalOpen}
              className="btn"
              style={buttonStyles.base}
              onMouseEnter={(e) => Object.assign(e.currentTarget.style, buttonStyles.hover)}
              onMouseLeave={(e) => Object.assign(e.currentTarget.style, buttonStyles.base)}
            >
              New Contact Role Type
            </button>
          </div>

          <div className="row mt-4">
            {contactRoleTypes.map((contactRoleType: any) => (
              <div key={contactRoleType.id} className="col-12 col-md-3 mb-3">
                <div
                  className="d-flex align-items-center justify-content-between"
                  style={{
                    backgroundColor: "#F2F5F8",
                    padding: "0 15px",
                    height: "40px",
                    borderRadius: "5px",
                  }}
                >
                  <div className="d-flex align-items-center gap-2">
                    <div
                      className="rounded-circle"
                      style={{
                        width: "18px",
                        height: "18px",
                        backgroundColor: contactRoleType.color,
                      }}
                    ></div>
                    <div style={{
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 400,
                      fontStyle: 'normal',
                      fontSize: '14px',
                      lineHeight: '100%',
                      letterSpacing: '0',
                      cursor: 'pointer'
                    }} title={contactRoleType.name}>
                      {contactRoleType.name.length > 10 ? contactRoleType.name.slice(0, 10) + '...' : contactRoleType.name}
                    </div>
                  </div>
                  <div className="ms-4 d-flex gap-3">
                    <i
                      className="fa fa-pencil cursor-pointer"
                      onClick={() => handleReferralTypeEdit(contactRoleType)}
                    ></i>
                    <i
                      className="fa fa-trash cursor-pointer"
                      onClick={() => handleContactRoleTypeDelete(contactRoleType.id)}
                    ></i>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contact Status Card */}
      <div className="card mt-5" style={{ fontFamily: "Inter", fontSize: "16px", fontWeight: "400" }}>
        <div className="card-body">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
            <h5 className="card-title" style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
              fontStyle: "normal",
              fontSize: "16px",
              lineHeight: "100%",
              letterSpacing: "0"
            }}>
              Contact Status
            </h5>
            <button
              onClick={handleContactStatusModalOpen}
              className="btn"
              style={buttonStyles.base}
              onMouseEnter={(e) => Object.assign(e.currentTarget.style, buttonStyles.hover)}
              onMouseLeave={(e) => Object.assign(e.currentTarget.style, buttonStyles.base)}
            >
              New Contact Status
            </button>
          </div>

          <div className="row mt-4">
            {contactStatuses.map((contactStatus: any) => (
              <div key={contactStatus.id} className="col-12 col-md-3 mb-3">
                <div
                  className="d-flex align-items-center justify-content-between"
                  style={{
                    backgroundColor: "#F2F5F8",
                    padding: "0 15px",
                    height: "40px",
                    borderRadius: "5px",
                  }}
                >
                  <div className="d-flex align-items-center gap-2">
                    <div
                      className="rounded-circle"
                      style={{
                        width: "18px",
                        height: "18px",
                        backgroundColor: contactStatus.color,
                      }}
                    ></div>
                    <div style={{
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 400,
                      fontStyle: 'normal',
                      fontSize: '14px',
                      lineHeight: '100%',
                      letterSpacing: '0',
                      cursor: 'pointer'
                    }} title={contactStatus.name}>
                      {contactStatus.name.length > 10 ? contactStatus.name.slice(0, 10) + '...' : contactStatus.name}
                    </div>
                  </div>
                  <div className="ms-4 d-flex gap-3">
                    <i
                      className="fa fa-pencil cursor-pointer"
                      onClick={() => handleContactStatusEdit(contactStatus)}
                    ></i>
                    <i
                      className="fa fa-trash cursor-pointer"
                      onClick={() => handleContactStatusDelete(contactStatus.id)}
                    ></i>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      <CompanyConfigForm
        show={showCompanyRoleTypeModal}
        onClose={handleReferralTypeModalClose}
        onSuccess={fetchContactRoleTypes}
        initialData={editingCompanyRoleType}
        isEditing={!!editingCompanyRoleType}
        type="contact-role-type"
        title="Contact Role Type"
      />
      <CompanyConfigForm
        show={showContactStatusModal}
        onClose={handleContactStatusModalClose}
        onSuccess={fetchContactStatuses}
        initialData={editingContactStatus}
        isEditing={!!editingContactStatus}
        type="contact-status"
        title="Contact Status"
      />

      {/* Delete Confirmation Modal for Contact Role Types */}
      {contactRoleTypeDeleteConfirmation.DeleteModal}
    </div>
  );
};

export default ContactConfigMain;
