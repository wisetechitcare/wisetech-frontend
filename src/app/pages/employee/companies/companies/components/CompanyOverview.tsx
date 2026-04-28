import { KTIcon } from "@metronic/helpers";
import { companiesIcons } from "@metronic/assets/sidepanelicons";
import { Company } from "@models/companies";
import { useEffect, useState } from "react";
import NoteModal from "./NoteModal";
import { getClientBranchesByCompanyId } from "@services/lead";
import { getAllCompanyTypes } from "@services/companies";
interface OverviewProps {
  company: Company;
}

const Overview = ({ company }: OverviewProps) => {
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [companyTypes, setCompanyTypes] = useState<any[]>([]);

  const fetchClientBranches = async () => {
    try {
      const response = await getClientBranchesByCompanyId(company.id);
      const companyTypesResponse = await getAllCompanyTypes();
      setCompanyTypes(companyTypesResponse.companyTypes || []);
      setBranches(response.leadBranches || []);
    } catch (error) {
      console.error("Failed to fetch branches", error);
    }
  };

  useEffect(() => {
    fetchClientBranches();
  }, [company.id]);

  const handleNoteClick = () => {
    setShowNoteModal(true);
  };

  const handleCloseNoteModal = () => {
    setShowNoteModal(false);
  };

  
  

  return (
    <div className="row g-4">
      {/* Company Info Card */}
      <div className="col-lg-6">
        <div className="card card-flush h-100">
          <div className="card-header d-flex justify-content-between align-items-center">
            <div className="card-title d-flex align-items-center gap-2">
              {/* <KTIcon iconName="abstract-26" className="fs-1 text-primary me-2" /> */}
              <img src={companiesIcons.companiesActiveIcon.default} alt="" style={{width: "36px", height: "36px"}}/>
              <h3 className="fw-bold mb-0">Company Info</h3>
            </div>
          </div>
          <div className="card-body">
            <div className="row mb-4">
              <div className="col-sm-4">
                <div className="fw-semibold" style={{fontFamily: "Inter", fontWeight: 500, fontSize: "14px"}}>Status</div>
              </div>
              <div className="col-sm-8 d-flex align-items-center justify-content-end">
                <span className="badge align-items-center justify-content-center" style={{backgroundColor:company.status === 'ACTIVE' ? 'green' : 'red', color: "white", padding: "7px 12px 7px 12px", borderRadius: "20px", height: "32px", opacity: "0.7", width: "97px", fontFamily:'Inter', fontSize:'14px', fontWeight:'400' }}>
                  {company.status}
                </span>
              </div>
            </div>
            
            <div className="row mb-4">
              <div className="col-sm-4">
                <div className="fw-semibold" style={{fontFamily: "Inter", fontWeight: 500, fontSize: "14px"}}>Company</div>
              </div>
              <div className="col-sm-8 d-flex align-items-center justify-content-end">
                <div style={{fontFamily: "Inter", fontWeight: 400, fontSize: "14px"}}>{company.companyName}</div>
              </div>
            </div>

            <div className="row mb-4">
              <div className="col-sm-4">
                <div className="fw-semibold" style={{fontFamily: "Inter", fontWeight: 500, fontSize: "14px"}}>Company Type</div>
              </div>
              <div className="col-sm-8 d-flex align-items-center justify-content-end">
                <div style={{fontFamily: "Inter", fontWeight: 400, fontSize: "14px"}}>{companyTypes.find((type) => type.id === company.companyTypeId)?.name || 'N/A'}</div>
              </div>
            </div>

            <div className="row mb-4">
              <div className="col-sm-4">
                <div className="fw-semibold" style={{fontFamily: "Inter", fontWeight: 500, fontSize: "14px"}}>Branches</div>
              </div>
              <div className="col-sm-8 d-flex align-items-center justify-content-end">
                <div style={{fontFamily: "Inter", fontWeight: 400, fontSize: "14px"}}>{branches.length}</div>
              </div>
            </div>

            {/* <div className="row mb-4">
              <div className="col-sm-4">
                <div className="fw-semibold">Active</div>
              </div>
              <div className="col-sm-8">
                <span className={`badge badge-light-${company.isActive ? 'success' : 'danger'}`}>
                  {company.isActive ? 'Yes' : 'No'}
                </span>
              </div>
            </div>

            <div className="row mb-4">
              <div className="col-sm-4">
                <div className="fw-semibold">Blacklisted</div>
              </div>
              <div className="col-sm-8">
                <span className={`badge badge-light-${company.blacklisted ? 'danger' : 'success'}`}>
                  {company.blacklisted ? 'Yes' : 'No'}
                </span>
              </div>
            </div> */}

            <div className="row mb-4">
              <div className="col-sm-4">
                <div className="fw-semibold" style={{fontFamily: "Inter", fontWeight: 500, fontSize: "14px"}}>Visibility</div>
              </div>
              <div className="col-sm-8 d-flex align-items-center justify-content-end">
                <div style={{fontFamily: "Inter", fontWeight: 400, fontSize: "14px"}}>{company.visibility || 'N/A'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Information Card */}
      <div className="col-lg-6">
        <div className="card card-flush h-100">
          <div className="card-header d-flex justify-content-between align-items-center">
            <div className="card-title d-flex align-items-center gap-2">
              <img src={companiesIcons.portalIcon.default} alt="" style={{width: "36px", height: "36px"}}/>
              <h3 className="fw-bold mb-0">Contact Information</h3>
            </div>
          </div>
          <div className="card-body">
            <div className="row mb-4">
              <div className="col-sm-4">
                <div className="fw-semibold" style={{fontFamily: "Inter", fontWeight: 500, fontSize: "14px"}}>Phone</div>
              </div>
              <div className="col-sm-8 d-flex align-items-center justify-content-end">
                <div style={{fontFamily: "Inter", fontWeight: 400, fontSize: "14px"}}>{company.phone || 'N/A'}</div>
              </div>
            </div>

            <div className="row mb-4">
              <div className="col-sm-4">
                <div className="fw-semibold" style={{fontFamily: "Inter", fontWeight: 500, fontSize: "14px"}}>Phone 2</div>
              </div>
              <div className="col-sm-8 d-flex align-items-center justify-content-end">
                <div  style={{fontFamily: "Inter", fontWeight: 400, fontSize: "14px"}}>{company.phone2 || 'N/A'}</div>
              </div>
            </div>

            <div className="row mb-4">
              <div className="col-sm-4">
                <div className="fw-semibold" style={{fontFamily: "Inter", fontWeight: 500, fontSize: "14px"}}>Email</div>
              </div>
              <div className="col-sm-8 d-flex align-items-center justify-content-end">
                <div style={{fontFamily: "Inter", fontWeight: 400, fontSize: "14px"}}>{company.email || 'N/A'}</div>
              </div>
            </div>

            <div className="row mb-4">
              <div className="col-sm-4">
                <div className="fw-semibold" style={{fontFamily: "Inter", fontWeight: 500, fontSize: "14px"}}>FAX</div>
              </div>
              <div className="col-sm-8 d-flex align-items-center justify-content-end">
                <div style={{fontFamily: "Inter", fontWeight: 400, fontSize: "14px"}}>{company.fax || 'N/A'}</div>
              </div>
            </div>

            <div className="row mb-4">
              <div className="col-sm-4">
                <div className="fw-semibold" style={{fontFamily: "Inter", fontWeight: 500, fontSize: "14px"}}>Website</div>
              </div>
              <div className="col-sm-8 d-flex align-items-center justify-content-end">
                <div style={{fontFamily: "Inter", fontWeight: 400, fontSize: "14px"}}>{company.website || 'N/A'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Address Information Card */}
      <div className="col-lg-6">
        <div className="card card-flush h-100">
          <div className="card-header">
            <div className="card-title d-flex align-items-center gap-2">
              <KTIcon iconName="geolocation" className="fs-1 text-primary me-2" />
              <h3 className="fw-bold mb-0">Address Information</h3>
            </div>
          </div>
          <div className="card-body">
            <div className="row mb-4">
              <div className="col-sm-4">
                <div className="fw-semibold" style={{fontFamily: "Inter", fontWeight: 500, fontSize: "14px"}}>Address</div>
              </div>
              <div className="col-sm-8 d-flex align-items-center justify-content-end">
                <div style={{fontFamily: "Inter", fontWeight: 400, fontSize: "14px"}}>{company.address || 'N/A'}</div>
              </div>
            </div>

            <div className="row mb-4">
              <div className="col-sm-4">
                <div className="fw-semibold" style={{fontFamily: "Inter", fontWeight: 500, fontSize: "14px"}}>Area</div>
              </div>
              <div className="col-sm-8 d-flex align-items-center justify-content-end">
                <div style={{fontFamily: "Inter", fontWeight: 400, fontSize: "14px"}}>{company.area || 'N/A'}</div>
              </div>
            </div>

            <div className="row mb-4">
              <div className="col-sm-4">
                <div className="fw-semibold" style={{fontFamily: "Inter", fontWeight: 500, fontSize: "14px"}}>City</div>
              </div>
              <div className="col-sm-8 d-flex align-items-center justify-content-end">
                <div style={{fontFamily: "Inter", fontWeight: 400, fontSize: "14px"}}>{company.city || 'N/A'}</div>
              </div>
            </div>

            <div className="row mb-4">
              <div className="col-sm-4">
                <div className="fw-semibold" style={{fontFamily: "Inter", fontWeight: 500, fontSize: "14px"}}>State</div>
              </div>
              <div className="col-sm-8 d-flex align-items-center justify-content-end">
                <div style={{fontFamily: "Inter", fontWeight: 400, fontSize: "14px"}}>{company.state || 'N/A'}</div>
              </div>
            </div>

            <div className="row mb-4">
              <div className="col-sm-4">
                <div className="fw-semibold" style={{fontFamily: "Inter", fontWeight: 500, fontSize: "14px"}}>Country</div>
              </div>
              <div className="col-sm-8 d-flex align-items-center justify-content-end">
                <div style={{fontFamily: "Inter", fontWeight: 400, fontSize: "14px"}}>{company.country || 'N/A'}</div>
              </div>
            </div>

            <div className="row mb-4">
              <div className="col-sm-4">
                <div className="fw-semibold" style={{fontFamily: "Inter", fontWeight: 500, fontSize: "14px"}} >ZIP Code</div>
              </div>
              <div className="col-sm-8 d-flex align-items-center justify-content-end">
                <div style={{fontFamily: "Inter", fontWeight: 400, fontSize: "14px"}}>{company.zipCode || 'N/A'}</div>
              </div>
            </div>

            {company.location && (
              <div className="row">
                <div className="col-sm-4">
                  <div className="fw-semibold" style={{fontFamily: "Inter", fontWeight: 500, fontSize: "14px"}}>Location</div>
                </div>
                <div className="col-sm-8 d-flex align-items-center justify-content-end">
                  <div className="d-flex align-items-center">
                    <KTIcon iconName="geolocation" className="fs-6 text-primary me-2" />
                    <span style={{fontFamily: "Inter", fontWeight: 400, fontSize: "14px"}}>{company.location}</span>
                    <a href="#" className="ms-2 text-primary">View on map</a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="col-lg-6">
        <div className="card card-flush h-100">
          <div className="card-header d-flex justify-content-between align-items-center">
            <div className="card-title d-flex align-items-center gap-2">
              <img
                src={companiesIcons.notesIcon.default}
                alt=""
                style={{ width: "36px", height: "36px" }}
              />
              <h3 style={{fontFamily: "Inter", fontWeight: 500, fontSize: "14px"}}>Notes</h3>
            </div>
            <button
              className="btn btn-sm btn-primary"
              onClick={handleNoteClick}
              style={{ fontFamily: "Barlow", fontWeight: 600, fontSize: "14px" }}
            >
              Edit Notes
            </button>
          </div>
          <div className="card-body">
            <div style={{fontFamily: "Inter", fontWeight: 400, fontSize: "14px"}}>
              {company.note || "No notes available"}
            </div>
          </div>
        </div>
      </div>

    <NoteModal show={showNoteModal} onClose={handleCloseNoteModal} companyId={company.id} />

    </div>
  );
};

export default Overview;