import React from 'react';
import { projectOverviewIcons } from "@metronic/assets/sidepanelicons";
import dayjs from "dayjs";
import { Link, useNavigate } from "react-router-dom";

const ContactOverview = ({ contact }: { contact: any }) => {
  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return dayjs(dateString).format("DD-MM-YYYY");
  };

  const navigate = useNavigate();
  const handleViewCompany = () => {
    navigate(`/companies/${contact?.company?.id}`);
  };

  const handleWhatsAppShare = () => {
    // Format contact address
    const contactAddressParts = [
      contact?.address,
      contact?.area,
      contact?.city,
      contact?.state,
      contact?.country,
      contact?.zipCode,
    ].filter(Boolean);
    const contactAddress = contactAddressParts.length ? contactAddressParts.join(", ") : 'N/A';

    // Format company address
    const companyAddressParts = contact?.company ? [
      contact.company.address,
      contact.company.area,
      contact.company.city,
      contact.company.state,
      contact.company.country,
      contact.company.zipCode,
    ].filter(Boolean) : [];
    const companyAddress = companyAddressParts.length ? companyAddressParts.join(", ") : 'N/A';

    // Create comprehensive contact message
    const message = `📋 Contact Information:

👤 PERSONAL DETAILS:
• Name: ${contact?.fullName || 'N/A'}
• Email: ${contact?.email || 'N/A'}
• Phone: ${contact?.phone || 'N/A'}
${contact?.phone2 ? `• Phone 2: ${contact.phone2}` : ''}
• Gender: ${contact?.gender || 'N/A'}
• Date of Birth: ${formatDate(contact?.dateOfBirth)}
• Role: ${contact?.roleInCompany || 'N/A'}
• Anniversary: ${formatDate(contact?.anniversary)}
• Address: ${contactAddress}
• Status: ${contact?.isContactActive ? 'Active' : 'Inactive'}
• Primary Contact: ${contact?.isPrimaryContact ? 'Yes' : 'No'}

🏢 COMPANY DETAILS:
• Company: ${contact?.company?.companyName || 'N/A'}
• Status: ${contact?.company?.status || 'N/A'}
• Rating: ${contact?.company?.overallRating ? `${contact.company.overallRating}/5` : 'N/A'}
• Phone: ${contact?.company?.phone || 'N/A'}
${contact?.company?.phone2 ? `• Phone 2: ${contact.company.phone2}` : ''}
• Email: ${contact?.company?.email || 'N/A'}
• Website: ${contact?.company?.website || 'N/A'}
• Fax: ${contact?.company?.fax || 'N/A'}
• Address: ${companyAddress}
• Blacklisted: ${contact?.company?.blacklisted ? 'Yes' : 'No'}`;

    // Create WhatsApp URL
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

    // Open WhatsApp
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div>
      <div className="row mt-5">
        {/* Contact Details */}
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-5">
                <div className="d-flex align-items-center gap-2">
                  <img
                    src={projectOverviewIcons.projectOverviewIcon.default}
                    alt=""
                    style={{ width: "44px", height: "44px", cursor: "pointer" }}
                  />
                  <span
                    style={{
                      fontFamily: "Barlow",
                      fontSize: "19px",
                      fontWeight: "600",
                    }}
                  >
                    Personal Details
                  </span>
                </div>
                <button
                  className="btn btn-success btn-sm d-flex align-items-center gap-1"
                  onClick={handleWhatsAppShare}
                  style={{
                    padding: "6px 12px",
                    fontSize: "14px",
                    borderRadius: "6px"
                  }}
                  title="Share via WhatsApp"
                >
                  <i className="fab fa-whatsapp"></i>
                  Share
                </button>
              </div>

              {/* Full Name */}
              <div className="d-flex align-items-center justify-content-between mt-4">
                <div
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Full Name
                </div>
                <div
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "400",
                  }}
                >
                  {contact?.fullName || "-"}
                </div>
              </div>

              {/* Email */}
              <div className="d-flex align-items-center justify-content-between mt-4">
                <div
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Email
                </div>
                <div
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "400",
                  }}
                >
                  {contact?.email || "-"}
                </div>
              </div>

              {/* Phone */}
              <div className="d-flex align-items-center justify-content-between mt-4">
                <div
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Phone
                </div>
                <div
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "400",
                  }}
                >
                  {contact?.phone || "-"}
                </div>
              </div>

              {/* Phone 2 */}
              <div className="d-flex align-items-center justify-content-between mt-4">
                <div
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Phone 2
                </div>
                <div
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "400",
                  }}
                >
                  {contact?.phone2 || "-"}
                </div>
              </div>

              {/* Gender */}
              <div className="d-flex align-items-center justify-content-between mt-4">
                <div
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Gender
                </div>
                <div
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "400",
                  }}
                >
                  {contact?.gender || "-"}
                </div>
              </div>

              {/* Date of Birth */}
              <div className="d-flex align-items-center justify-content-between mt-4">
                <div
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Date of Birth
                </div>
                <div
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "400",
                  }}
                >
                  {formatDate(contact?.dateOfBirth)}
                </div>
              </div>

              {/* Role in Company */}
              <div className="d-flex align-items-center justify-content-between mt-4">
                <div
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Role in Company
                </div>
                <div
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "400",
                  }}
                >
                  {contact?.roleInCompany || "-"}
                </div>
              </div>

              {/* Primary Contact */}
              <div className="d-flex align-items-center justify-content-between mt-4">
                <div
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Primary Contact
                </div>
                {typeof contact?.isPrimaryContact === 'boolean' ? (
                  <div
                    style={{
                      backgroundColor: contact.isPrimaryContact ? "green" : "gray",
                      color: "white",
                      padding: "5px 12px",
                      borderRadius: "20px",
                      opacity: "0.8",
                      fontSize: "14px",
                      fontWeight: "400",
                      fontFamily: "Inter",
                    }}
                  >
                    {contact.isPrimaryContact ? "Yes" : "No"}
                  </div>
                ) : (
                  <div style={{ fontFamily: 'Inter', fontSize: '14px', fontWeight: 400 }}>-</div>
                )}
              </div>

              {/* Status */}
              <div className="d-flex align-items-center justify-content-between mt-4">
                <div
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Status
                </div>
                <div
                  style={{
                    backgroundColor:
                      contact?.isContactActive ? "green" : "red",
                    color: "white",
                    padding: "5px 12px",
                    borderRadius: "20px",
                    opacity: "0.8",
                    fontSize: "14px",
                    fontWeight: "400",
                    fontFamily: "Inter",
                  }}
                >
                  {contact?.isContactActive ? "Active" : "Inactive"}
                </div>
              </div>

              {/* Visibility */}
              <div className="d-flex align-items-center justify-content-between mt-4">
                <div
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Visibility
                </div>
                <div
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "400",
                  }}
                >
                  {contact?.visibility || "-"}
                </div>
              </div>

              {/* Anniversary */}
              <div className="d-flex align-items-center justify-content-between mt-4">
                <div
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Anniversary
                </div>
                <div
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "400",
                  }}
                >
                  {formatDate(contact?.anniversary)}
                </div>
              </div>

              {/* Contact Address */}
              <div className="d-flex align-items-center justify-content-between mt-4">
                <div
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Address
                </div>
                <div
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "400",
                    textAlign: "right",
                    maxWidth: "200px"
                  }}
                >
                  {(() => {
                    const parts = [
                      contact?.address,
                      contact?.area,
                      contact?.city,
                      contact?.state,
                      contact?.country,
                      contact?.zipCode,
                    ].filter(Boolean);
                    return parts.length ? parts.join(", ") : '-';
                  })()}
                </div>
              </div>

              {/* View on map link for Contact - ONLY if coordinates are valid and non-zero */}
              {(() => {
                const lat = parseFloat(String(contact?.latitude));
                const lng = parseFloat(String(contact?.longitude));
                if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
                  return (
                    <div className="d-flex align-items-center justify-content-between mt-4">
                      <div
                        style={{
                          fontFamily: "Inter",
                          fontSize: "14px",
                          fontWeight: "500",
                        }}
                      >
                        Location
                      </div>
                      <div className="d-flex align-items-center" style={{ gap: "4px" }}>
                        <img
                          src={projectOverviewIcons.mapIcon?.default}
                          alt=""
                          style={{ width: "20px", height: "20px" }}
                        />
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: "#9d4141",
                            textDecoration: "none",
                            fontWeight: "400",
                            fontFamily: "Inter",
                            fontSize: "14px"
                          }}
                        >
                          View on map
                        </a>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

            </div>
          </div>
        </div>

        {/* Company Details */}
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-4">
                <div className="d-flex align-items-center gap-2">
                  <img
                    src={projectOverviewIcons.clientsIcon.default}
                    alt=""
                    style={{ width: "44px", height: "44px", cursor: "pointer" }}
                  />
                  <span
                    style={{
                      fontFamily: "Barlow",
                      fontSize: "19px",
                      fontWeight: "600",
                    }}
                  >
                    Company Info
                  </span>
                </div>
                <button
                className='btn btn-primary'
                  onClick={handleViewCompany}
                  style={{
                    color: "white",
                    padding: "8px 16px",
                    borderRadius: "6px",
                    border: "none",
                    fontSize: "14px",
                    cursor: "pointer",
                    fontFamily: "Inter"
                  }}
                >
                  View Company
                </button>
              </div>

              {/* Company Logo */}
              <div className="d-flex align-items-center justify-content-between mt-3">
                <div
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Company Logo
                </div>
                <div>
                  {contact?.company?.logo ? (
                    <img
                      src={contact.company.logo}
                      alt="Company Logo"
                      style={{
                        width: "40px",
                        height: "40px",
                        objectFit: "contain",
                        border: "1px solid #e5e7eb",
                        borderRadius: "4px"
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
                        backgroundColor: "#f3f4f6",
                        border: "1px solid #e5e7eb",
                        borderRadius: "4px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      🏢
                    </div>
                  )}
                </div>
              </div>

              {/* Company Name */}
              <div className="d-flex align-items-center justify-content-between mt-3">
                <div
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Company Name
                </div>
                <div
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "400",
                  }}
                >
                  {/* {contact?.company?.companyName || "-"} */}
                  <Link to={`/companies/${contact?.company?.id}`}>{contact?.company?.companyName || "-"}</Link>
                </div>
              </div>

              {/* Company Status */}
              <div className="d-flex align-items-center justify-content-between mt-3">
                <div
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Company Status
                </div>
                <div
                  style={{
                    backgroundColor: contact?.company?.status === "ACTIVE" ? "green" : "gray",
                    color: "white",
                    padding: "5px 12px",
                    borderRadius: "20px",
                    opacity: "0.8",
                    fontSize: "14px",
                    fontWeight: "400",
                    fontFamily: "Inter",
                  }}
                >
                  {contact?.company?.status || "-"}
                </div>
              </div>

              {/* Overall Rating */}
              <div className="d-flex align-items-center justify-content-between mt-3">
                <div
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Overall Rating
                </div>
                <div
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "400",
                  }}
                >
                  {contact?.company?.overallRating ? `${contact.company.overallRating}/5` : "-"}
                </div>
              </div>

              {/* Company Phone */}
              <div className="d-flex align-items-center justify-content-between mt-3">
                <div
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Company Phone
                </div>
                <div
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "400",
                  }}
                >
                  {contact?.company?.phone || "-"}
                </div>
              </div>

              {/* Company Phone 2 */}
              <div className="d-flex align-items-center justify-content-between mt-3">
                <div
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Company Phone 2
                </div>
                <div
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "400",
                  }}
                >
                  {contact?.company?.phone2 || "-"}
                </div>
              </div>

              {/* Company Email */}
              <div className="d-flex align-items-center justify-content-between mt-3">
                <div
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Company Email
                </div>
                <div
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "400",
                  }}
                >
                  {contact?.company?.email || "-"}
                </div>
              </div>

              {/* Company Fax */}
              <div className="d-flex align-items-center justify-content-between mt-3">
                <div
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Fax
                </div>
                <div
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "400",
                  }}
                >
                  {contact?.company?.fax || "-"}
                </div>
              </div>

              {/* Website */}
              <div className="d-flex align-items-center justify-content-between mt-3">
                <div
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Website
                </div>
                <div
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "400",
                  }}
                >
                  {contact?.company?.website ? (
                    <a 
                      href={`https://${contact.company.website}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ color: "#3b82f6", textDecoration: "none" }}
                    >
                      {contact.company.website}
                    </a>
                  ) : "-"}
                </div>
              </div>

              {/* Company Address */}
              <div className="d-flex align-items-center justify-content-between mt-3">
                <div
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Company Address
                </div>
                <div style={{ 
                  fontFamily: "Inter", 
                  fontSize: "14px",
                  fontWeight: "400",
                  textAlign: "right",
                  maxWidth: "200px"
                }}>
                  {(() => {
                    if (!contact?.company) return '-';
                    const c = contact.company;
                    const parts = [c.address, c.area, c.city, c.state, c.country, c.zipCode].filter(Boolean);
                    return parts.length ? parts.join(', ') : '-';
                  })()}
                </div>
              </div>

              {/* View on map link for Company - ONLY if coordinates are valid and non-zero */}
              {(() => {
                const lat = parseFloat(String(contact?.company?.latitude));
                const lng = parseFloat(String(contact?.company?.longitude));
                if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
                  return (
                    <div className="d-flex align-items-center justify-content-between mt-3">
                      <div
                        style={{
                          fontFamily: "Inter",
                          fontSize: "14px",
                          fontWeight: "500",
                        }}
                      >
                        Location
                      </div>
                      <div className="d-flex align-items-center" style={{ gap: "4px" }}>
                        <img
                          src={projectOverviewIcons.mapIcon?.default}
                          alt=""
                          style={{ width: "20px", height: "20px" }}
                        />
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: "#9d4141",
                            textDecoration: "none",
                            fontWeight: "400",
                            fontFamily: "Inter",
                            fontSize: "14px"
                          }}
                        >
                          View on map
                        </a>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Blacklisted */}
              <div className="d-flex align-items-center justify-content-between mt-3">
                <div
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Blacklisted
                </div>
                {typeof contact?.company?.blacklisted === 'boolean' ? (
                  <div
                    style={{
                      backgroundColor: contact.company.blacklisted ? "red" : "green",
                      color: "white",
                      padding: "5px 12px",
                      borderRadius: "20px",
                      opacity: "0.8",
                      fontSize: "14px",
                      fontWeight: "400",
                      fontFamily: "Inter",
                    }}
                  >
                    {contact.company.blacklisted ? "Yes" : "No"}
                  </div>
                ) : (
                  <div style={{ fontFamily: 'Inter', fontSize: '14px', fontWeight: 400 }}>-</div>
                )}
              </div>

              {/* Company Visibility */}
              <div className="d-flex align-items-center justify-content-between mt-3">
                <div
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Company Visibility
                </div>
                <div
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "400",
                  }}
                >
                  {contact?.company?.visibility || "-"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactOverview;