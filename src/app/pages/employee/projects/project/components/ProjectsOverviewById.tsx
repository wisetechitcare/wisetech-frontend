import { useState, useEffect, useRef } from "react";
import dayjs from "dayjs";
import { getDurationText } from "@utils/leadsProjectCompanies";
import { formatNumber } from "@utils/statistics";
import { projectOverviewIcons } from "@metronic/assets/sidepanelicons";
import { getAllCompanyTypes } from "@services/companies";
import { useSelector } from "react-redux";
import type { RootState } from "@redux/store";
import { Link, useNavigate, useParams } from "react-router-dom";
import NewCompanyForm from "@pages/employee/companies/companies/components/NewCompanyForm";
import { getAllTimeSheetWithCostByProjectId } from "@services/tasks";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";

const ProjectOverviewById = ({
  projectId,
  projectData,
}: {
  projectId: string;
  projectData: any;
}) => {

  const allEmployees = useSelector((state: RootState) => state.allEmployees);
  const [companyTypes, setCompanyTypes] = useState<any>([]);
  const [showCompany, setShowCompany] = useState(false);
  const [timeSheets, setTimeSheets] = useState<any>([]);
  const [billableFilter, setBillableFilter] = useState<null | string>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchCompanyTypes() {
      try {
        const data = await getAllCompanyTypes();

        setCompanyTypes(data?.companyTypes);
      } catch (error) {
        console.error("Error fetching company types:", error);
      }
    }
    fetchCompanyTypes();
  }, []);

  useEffect(() => {
    const fetchTimeSheets = async () => {
      const response = await getAllTimeSheetWithCostByProjectId(
        projectId!,
        billableFilter!
      );

      setTimeSheets(response);
    };
    fetchTimeSheets();
  }, [projectId, billableFilter]);

  const farmatedTimeSheetData =
    timeSheets?.timeSheets?.map((item: any) => {
      return {
        taskName: item.taskName,
        totalHours: item.workedDuration,
        costFormatted: item.costFormatted,
      };
    }) || [];

  const calculateTotalCost = () => {
    return projectData?.projectCommercialMappings?.reduce((total: number, mapping: any) => {
      const rateCost = parseFloat(mapping.rateCost || 0);
      const lumpsumCost = parseFloat(mapping.lumpsumCost || 0);
      return total + rateCost + lumpsumCost;
    }, 0) || 0;
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    setScrollTop(target.scrollTop);
  };

  const companyId = projectData?.projectCompanyMappings?.find(
    (mapping: any) => mapping.companyId
  )?.companyId;

  const findCompanytypesName = companyTypes?.find(
    (company: any) => company.id === companyId
  )?.name;


  return (
    <>
      <style>
        {`
          .custom-scrollbar::-webkit-scrollbar {
            width: 8px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #9D4141;
            border-radius: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #7a3030;
          }
        `}
      </style>
      {/* First Row - 2 Cards */}
      <div className="row mt-5">
        {/* Project Details Card */}
        <div className="col-md-6">
          <div
            className="card"
            style={{
              height: "500px",
              border: "none",
              backgroundColor: "white",
              borderRadius: "12px",
              boxShadow: "8px 8px 16px 0px rgba(0,0,0,0.04)"
            }}
          >
            <div
              className="card-body d-flex flex-column"
              style={{
                height: "100%",
                padding: "20px 20px 16px 20px",
                gap: "16px"
              }}
            >
              <div className="d-flex align-items-center" style={{ gap: "10px", flexShrink: 0 }}>
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    backgroundColor: "#e6eaf1",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden"
                  }}
                >
                  <img
                    src={projectOverviewIcons.projectOverviewIcon.default}
                    alt=""
                    // style={{ width: "24px", height: "24px" }}
                  />
                </div>
                <span
                  style={{
                    fontFamily: "Barlow",
                    fontSize: "19px",
                    fontWeight: "600",
                    color: "black",
                    letterSpacing: "0.19px"
                  }}
                >
                  Project Details
                </span>
              </div>

              <div className="d-flex" style={{ gap: "16px", width: "100%" }}>
                <div className="d-flex flex-column" style={{ gap: "14px", flex: 1 }}>
                  {/* Current Status Section */}
                  <div className="d-flex flex-column" style={{ gap: "8px" }}>
                    <div
                      className="d-flex align-items-center justify-content-between"
                      style={{
                        fontFamily: "Inter",
                        fontSize: "14px",
                        color: "black",
                      }}
                    >
                      <div style={{ fontWeight: "500" }}>Current Status</div>
                      <div
                        className="d-flex align-items-center justify-content-center"
                        style={{
                          backgroundColor: "#f9f4d7",
                          color: "#b1821f",
                          padding: "7px 12px",
                          borderRadius: "24px",
                          height: "32px",
                          gap: "10px",
                          fontFamily: "Inter",
                          fontSize: "14px",
                          fontWeight: "400",
                          display: "flex",
                          alignItems: "center"
                        }}
                      >
                        <div
                          style={{
                            width: "7px",
                            height: "7px",
                            backgroundColor: "#b1821f",
                            borderRadius: "7px"
                          }}
                        />
                        {projectData?.status?.name ?? "In Progress"}
                      </div>
                    </div>
                  </div>

                  {/* Project Information Section */}
                  <div className="d-flex flex-column" style={{ gap: "8px" }}>
                    <div
                      className="d-flex align-items-center justify-content-between"
                      style={{
                        fontFamily: "Inter",
                        fontSize: "14px",
                        color: "black",
                      }}
                    >
                      <div style={{ fontWeight: "500" }}>Project Name</div>
                      <div style={{ fontWeight: "400" }}>{projectData?.title ?? "-"}</div>
                    </div>

                    <div
                      className="d-flex align-items-center justify-content-between"
                      style={{
                        fontFamily: "Inter",
                        fontSize: "14px",
                        color: "black",
                      }}
                    >
                      <div style={{ fontWeight: "500" }}>Service</div>
                      <div style={{ fontWeight: "400" }}>{projectData?.service?.name ?? "-"}</div>
                    </div>

                    <div
                      className="d-flex align-items-center justify-content-between"
                      style={{
                        fontFamily: "Inter",
                        fontSize: "14px",
                        color: "black",
                      }}
                    >
                      <div style={{ fontWeight: "500" }}>Project Type</div>
                      <div style={{ fontWeight: "400" }}>{projectData?.category?.name ?? "-"}</div>
                    </div>

                    <div
                      className="d-flex align-items-center justify-content-between"
                      style={{
                        fontFamily: "Inter",
                        fontSize: "14px",
                        color: "black",
                      }}
                    >
                      <div style={{ fontWeight: "500" }}>Project Subtype</div>
                      <div style={{ fontWeight: "400" }}>{projectData?.subCategory?.name ?? "-"}</div>
                    </div>

                    <div
                      className="d-flex align-items-center justify-content-between"
                      style={{
                        fontFamily: "Inter",
                        fontSize: "14px",
                        color: "black",
                      }}
                    >
                      <div style={{ fontWeight: "500" }}>Start Date</div>
                      <div style={{ fontWeight: "400" }}>
                        {dayjs(projectData?.startDate).format("DD/MM/YYYY") ?? "-"}
                      </div>
                    </div>

                    <div
                      className="d-flex align-items-center justify-content-between"
                      style={{
                        fontFamily: "Inter",
                        fontSize: "14px",
                        color: "black",
                      }}
                    >
                      <div style={{ fontWeight: "500" }}>End Date</div>
                      <div style={{ fontWeight: "400" }}>
                        {projectData?.isProjectOpen === false
                          ? dayjs(projectData?.endDate).format("DD/MM/YYYY")
                          : "-"}
                      </div>
                    </div>

                    <div
                      className="d-flex align-items-center justify-content-between"
                      style={{
                        fontFamily: "Inter",
                        fontSize: "14px",
                        color: "black",
                      }}
                    >
                      <div style={{ fontWeight: "500" }}>Duration</div>
                      <div style={{ fontWeight: "400" }}>
                        {getDurationText(
                          projectData?.startDate,
                          projectData?.endDate
                        ) ?? "-"}
                      </div>
                    </div>

                    <div
                      className="d-flex align-items-center justify-content-between"
                      style={{
                        fontFamily: "Inter",
                        fontSize: "14px",
                        color: "black",
                      }}
                    >
                      <div style={{ fontWeight: "500" }}>PO Number</div>
                      <div style={{ fontWeight: "400" }}>{projectData?.poNumber ?? "-"}</div>
                    </div>

                    <div
                      className="d-flex align-items-center justify-content-between"
                      style={{
                        fontFamily: "Inter",
                        fontSize: "14px",
                        color: "black",
                      }}
                    >
                      <div style={{ fontWeight: "500" }}>PO Date</div>
                      <div style={{ fontWeight: "400" }}>
                        {projectData?.poDate
                          ? dayjs(projectData?.poDate).format("DD/MM/YYYY")
                          : "-"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Details Card */}
        <div className="col-md-6">
          <div
            className="card"
            style={{
              height: "500px",
              border: "none",
              backgroundColor: "white",
              borderRadius: "12px",
              boxShadow: "8px 8px 16px 0px rgba(0,0,0,0.04)"
            }}
          >
            <div
              className="card-body d-flex flex-column"
              style={{
                height: "100%",
                padding: "20px 20px 16px 20px",
                gap: "16px"
              }}
            >
              <div className="d-flex align-items-center" style={{ gap: "10px", flexShrink: 0 }}>
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    backgroundColor: "#e6eaf1",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden"
                  }}
                >
                  <img
                    src={projectOverviewIcons.additionalDetailsIcon.default}
                    alt=""
                    // style={{ width: "24px", height: "24px" }}
                  />
                </div>
                <span
                  style={{
                    fontFamily: "Barlow",
                    fontSize: "19px",
                    fontWeight: "600",
                    color: "black",
                    letterSpacing: "0.19px"
                  }}
                >
                  Additional Details
                </span>
              </div>

              {/* Address Information Section */}
              <div className="d-flex flex-column" style={{ gap: "8px", width: "100%" }}>
                {projectData?.addresses && projectData.addresses.length > 0 ? (
                  (() => {
                    const primaryAddress = projectData.addresses.find((addr: any) => addr.isPrimary) || projectData.addresses[0];
                    return (
                      <>
                        <div
                          className="d-flex align-items-center justify-content-between"
                          style={{
                            fontFamily: "Inter",
                            fontSize: "14px",
                            color: "black",
                          }}
                        >
                          <div style={{ fontWeight: "500" }}>Project Address</div>
                          <div style={{ fontWeight: "400" }}>{primaryAddress.fullAddress || "-"}</div>
                        </div>

                        <div
                          className="d-flex align-items-center justify-content-between"
                          style={{
                            fontFamily: "Inter",
                            fontSize: "14px",
                            color: "black",
                          }}
                        >
                          <div style={{ fontWeight: "500" }}>P. City</div>
                          <div style={{ fontWeight: "400" }}>{primaryAddress.city || "-"}</div>
                        </div>

                        <div
                          className="d-flex align-items-center justify-content-between"
                          style={{
                            fontFamily: "Inter",
                            fontSize: "14px",
                            color: "black",
                          }}
                        >
                          <div style={{ fontWeight: "500" }}>P. State</div>
                          <div style={{ fontWeight: "400" }}>{primaryAddress.state || "-"}</div>
                        </div>

                        <div
                          className="d-flex align-items-center justify-content-between"
                          style={{
                            fontFamily: "Inter",
                            fontSize: "14px",
                            color: "black",
                          }}
                        >
                          <div style={{ fontWeight: "500" }}>P. Country</div>
                          <div style={{ fontWeight: "400" }}>{primaryAddress.country || "-"}</div>
                        </div>

                        <div
                          className="d-flex align-items-center justify-content-between"
                          style={{
                            fontFamily: "Inter",
                            fontSize: "14px",
                            color: "black",
                          }}
                        >
                          <div style={{ fontWeight: "500" }}>Zip</div>
                          <div style={{ fontWeight: "400" }}>{primaryAddress.zipcode || "-"}</div>
                        </div>

                        {primaryAddress.latitude && primaryAddress.longitude && (
                          <div
                            className="d-flex align-items-center justify-content-between"
                            style={{
                              fontFamily: "Inter",
                              fontSize: "14px",
                              color: "black",
                            }}
                          >
                            <div style={{ fontWeight: "500" }}>Location</div>
                            <div className="d-flex align-items-center" style={{ gap: "4px" }}>
                              <img
                                src={projectOverviewIcons.mapIcon?.default}
                                alt=""
                                style={{ width: "20px", height: "20px" }}
                              />
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${primaryAddress.latitude},${primaryAddress.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  color: "#9d4141",
                                  textDecoration: "none",
                                  fontWeight: "400"
                                }}
                              >
                                View on map
                              </a>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()
                ) : (
                  <div
                    style={{
                      fontFamily: "Inter",
                      fontSize: "14px",
                      fontWeight: "400",
                      color: "#6c757d",
                    }}
                  >
                    No address available
                  </div>
                )}
              </div>

              {/* Separator Line */}
              <div
                style={{
                  width: "100%",
                  height: "1px",
                  backgroundColor: "#d9d9d9"
                }}
              />

              {/* Description Section */}
              <div
                style={{
                  fontFamily: "Inter",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "black"
                }}
              >
                Description
              </div>

              <div
                style={{
                  fontFamily: "Inter",
                  fontSize: "14px",
                  fontWeight: "400",
                  color: "black"
                }}
              >
                {projectData?.description || "Lorem ipsum gratisque fir del para..."}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Second Row - 2 Cards */}
      <div className="row mt-5">
        {/* Commercial Details Card */}
        <div className="col-md-6">
          <div
            className="card"
            style={{
              height: "500px",
              border: "none",
              backgroundColor: "white",
              borderRadius: "12px",
              boxShadow: "8px 8px 16px 0px rgba(0,0,0,0.04)"
            }}
          >
            <div
              className="card-body d-flex"
              style={{
                height: "100%",
                padding: "20px",
                gap: "12px"
              }}
            >
              <div className="flex-grow-1 d-flex flex-column" style={{ gap: "16px", height: "100%" }}>
                <div className="d-flex align-items-center justify-content-between" style={{ flexShrink: 0 }}>
                  <div className="d-flex align-items-center" style={{ gap: "10px" }}>
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        backgroundColor: "#e6eaf1",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden"
                      }}
                    >
                      <img
                        src={projectOverviewIcons.projectOverviewIcon.default}
                        alt=""
                        style={{ width: "44px", height: "44px", cursor: "pointer" }}
                      />
                    </div>
                    <span
                      style={{
                        fontFamily: "Barlow",
                        fontSize: "19px",
                        fontWeight: "600",
                        color: "black",
                        letterSpacing: "0.19px"
                      }}
                    >
                      Commercials
                    </span>
                  </div>
                  <div className="d-flex align-items-center" style={{ gap: "16px" }}>
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontFamily: "Inter",
                          fontSize: "14px",
                          fontWeight: "400",
                          color: "black"
                        }}
                      >
                        Total Cost:
                      </div>
                    </div>
                    <div
                      style={{
                        fontFamily: "Inter",
                        fontSize: "16px",
                        fontWeight: "600",
                        color: "black",
                      }}
                    >
                      {formatNumber(calculateTotalCost())}
                    </div>
                  </div>
                </div>

                <div
                  ref={scrollRef}
                  className="d-flex flex-column"
                  style={{
                    gap: "16px",
                    width: "100%",
                    flex: 1,
                    overflowY: "auto",
                    minHeight: 0,
                  }}
                  onScroll={handleScroll}
                >
                  {projectData?.projectCommercialMappings && projectData.projectCommercialMappings.length > 0 ? (
                    projectData.projectCommercialMappings.map((mapping: any, index: number) => (
                      <div key={mapping.id || index} className="d-flex flex-column" style={{ gap: "8px", width: "100%" }}>
                        <div
                          style={{
                            fontFamily: "Inter",
                            fontSize: "14px",
                            fontWeight: "500",
                            color: "#798db3",
                            textTransform: "uppercase",
                          }}
                        >
                          AREA {index + 1}
                        </div>

                        <div className="d-flex flex-column" style={{ gap: "8px", width: "100%" }}>
                          <div
                            className="d-flex align-items-center justify-content-between"
                            style={{
                              fontFamily: "Inter",
                              fontSize: "14px",
                              color: "black",
                            }}
                          >
                            <div style={{ fontWeight: "500" }}>Label</div>
                            <div style={{ fontWeight: "400" }}>{mapping.label || "-"}</div>
                          </div>

                          <div
                            className="d-flex align-items-center justify-content-between"
                            style={{
                              fontFamily: "Inter",
                              fontSize: "14px",
                              color: "black",
                            }}
                          >
                            <div style={{ fontWeight: "500" }}>Area (sqft)</div>
                            <div style={{ fontWeight: "400" }}>{mapping.area || "-"}</div>
                          </div>

                          {mapping.costType === "RATE" && (
                            <>
                              <div
                                className="d-flex align-items-center justify-content-between"
                                style={{
                                  fontFamily: "Inter",
                                  fontSize: "14px",
                                  color: "black",
                                }}
                              >
                                <div style={{ fontWeight: "500" }}>Rate</div>
                                <div style={{ fontWeight: "400" }}>{formatNumber(mapping.rate) || "-"}</div>
                              </div>

                              <div
                                className="d-flex align-items-center justify-content-between"
                                style={{
                                  fontFamily: "Inter",
                                  fontSize: "14px",
                                  color: "black",
                                }}
                              >
                                <div style={{ fontWeight: "500" }}>Cost</div>
                                <div style={{ fontWeight: "400" }}>{formatNumber(mapping.rateCost) || "-"}</div>
                              </div>
                            </>
                          )}

                          {mapping.costType === "LUMPSUM" && (
                            <>
                              <div
                                className="d-flex align-items-center justify-content-between"
                                style={{
                                  fontFamily: "Inter",
                                  fontSize: "14px",
                                  color: "black",
                                }}
                              >
                                <div style={{ fontWeight: "500" }}>Lumpsum</div>
                                <div style={{ fontWeight: "400" }}>{formatNumber(mapping.lumpsum) || "-"}</div>
                              </div>

                              <div
                                className="d-flex align-items-center justify-content-between"
                                style={{
                                  fontFamily: "Inter",
                                  fontSize: "14px",
                                  color: "black",
                                }}
                              >
                                <div style={{ fontWeight: "500" }}>Cost</div>
                                <div style={{ fontWeight: "400" }}>{formatNumber(mapping.lumpsumCost) || "-"}</div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div
                      style={{
                        fontFamily: "Inter",
                        fontSize: "14px",
                        fontWeight: "400",
                        color: "#6c757d",
                      }}
                    >
                      No commercial details available
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Bar Indicator */}
              <div
                style={{
                  width: "4px",
                  height: "100%",
                  backgroundColor: "#edeff2",
                  borderRadius: "323px",
                  position: "relative",
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    width: "4px",
                    height: "147px",
                    backgroundColor: "#9d4141",
                    top: `${50 + (scrollRef.current ? (scrollTop / (scrollRef.current.scrollHeight - scrollRef.current.clientHeight)) * 100 : 0)}px`,
                    left: "0.24px",
                    transition: "top 0.1s ease-out"
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Portal Card */}
        <div className="col-md-6">
          <div className="card" style={{ height: "500px" }}>
            <div className="card-body d-flex flex-column" style={{ height: "100%" }}>
              <div className="d-flex align-items-center gap-2 mb-4" style={{ flexShrink: 0 }}>
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <img
                    src={projectOverviewIcons.portalssIcon.default}
                    alt=""
                    style={{ width: "44px", height: "44px", cursor: "pointer" }}
                  />
                </div>
                <span
                  style={{
                    fontFamily: "Barlow",
                    fontSize: "19px",
                    fontWeight: "600",
                  }}
                >
                  Portal
                </span>
              </div>

              <div style={{
                flex: 1,
                overflowY: "auto",
                minHeight: 0,
                scrollbarWidth: "thin",
                scrollbarColor: "#9D4141 #f1f1f1"
              }}
              className="custom-scrollbar">
                <div
                  className="d-flex align-items-center justify-content-between"
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Visibility
                  <div
                    style={{
                      fontFamily: "Inter",
                      fontSize: "14px",
                      fontWeight: "400",
                    }}
                  >
                    Everyone
                  </div>
                </div>

                <div
                  className="d-flex align-items-center justify-content-between mt-4"
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Created by
                  <div
                    style={{
                      fontFamily: "Inter",
                      fontSize: "14px",
                      fontWeight: "400",
                    }}
                  >
                    {allEmployees?.list?.find(
                      (employee: any) =>
                        employee?.employeeId === projectData?.createdById
                    )?.employeeName ?? "-"}
                  </div>
                </div>

                <div
                  className="d-flex align-items-center justify-content-between mt-4"
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Created Date
                  <div
                    style={{
                      fontFamily: "Inter",
                      fontSize: "14px",
                      fontWeight: "400",
                    }}
                  >
                    {dayjs(projectData?.createdAt).format("DD/M/YYYY, h:mmA") ??
                      "-"}
                  </div>
                </div>

                <div
                  className="d-flex align-items-center justify-content-between mt-4"
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Last Edited by
                  <div
                    style={{
                      fontFamily: "Inter",
                      fontSize: "14px",
                      fontWeight: "400",
                    }}
                  >
                    {allEmployees?.list?.find(
                      (employee: any) =>
                        employee?.employeeId === projectData?.editedById
                    )?.employeeName ?? "-"}
                  </div>
                </div>

                <div
                  className="d-flex align-items-center justify-content-between mt-4"
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Last Edited
                  <div
                    style={{
                      fontFamily: "Inter",
                      fontSize: "14px",
                      fontWeight: "400",
                    }}
                  >
                    {dayjs(projectData?.updatedAt).format("DD/M/YYYY, h:mmA") ??
                      "-"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row mt-5">
        <div className="col-md-12">
          <div className="card h-100">
            <div className="card-body">
              {/* Header */}
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
                    Client and other companies
                  </span>
                </div>

                <button
                  className="btn btn-sm"
                  style={{
                    border: "1px solid #a83232",
                    color: "#a83232",
                    borderRadius: "8px",
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "500",
                    padding: "6px 14px",
                  }}
                  onClick={() => setShowCompany(true)}
                >
                  Add Companies
                </button>
              </div>

              {/* Table */}
              <div className="table-responsive">
                <table className="table align-middle">
                  <thead>
                    <tr
                      style={{
                        fontFamily: "Inter",
                        fontSize: "14px",
                        fontWeight: "500",
                        color: "#6c757d",
                      }}
                    >
                      <th>Relation</th>
                      <th>Company Type</th>
                      <th>Company</th>
                      <th>Contact</th>
                      <th>Contact Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectData?.projectCompanyMappings?.map(
                      (mapping: any, index: number) => {
                        const companyType =
                          companyTypes?.find(
                            (type: any) =>
                              type.id === mapping.company?.companyTypeId
                          )?.name ?? "-";

                        return (
                          <tr
                            key={index}
                            style={{
                              fontFamily: "Inter",
                              fontSize: "14px",
                              fontWeight: "400",
                            }}
                          >
                            <td>{mapping?.relation ?? "Other"}</td>
                            <td>{companyType}</td>
                            <td>
                              <Link
                                to={`/companies/${mapping.company?.id ?? ""}`}
                                style={{ color: "#b23b3b", fontWeight: 500 }}
                              >
                                {mapping.company?.companyName ?? "Unknown"}
                              </Link>
                            </td>
                            <td>
                              <Link
                                to={`/contacts/${
                                  mapping?.contactPersonId ?? ""
                                }`}
                                style={{ color: "#b23b3b" }}
                              >
                                {mapping?.contactPerson?.fullName} (
                                {mapping?.contactPerson?.roleInCompany})
                              </Link>
                            </td>
                            <td>
                              <div className="d-flex align-items-center gap-2">
                                <span
                                  style={{
                                    display: "inline-block",
                                    width: "10px",
                                    height: "10px",
                                    borderRadius: "50%",
                                    backgroundColor: mapping?.contactPerson
                                      ?.isContactActive
                                      ? "#5cb85c"
                                      : "#0d1b2a",
                                  }}
                                ></span>
                                {mapping?.contactPerson?.isContactActive
                                  ? "Active"
                                  : "Inactive"}
                              </div>
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="row mt-5">
        

        {/* Time Log Card */}
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-body">
              <div className="d-flex align-items-center gap-2 mb-4">
                <img
                  src={projectOverviewIcons.timeLogssIcon?.default}
                  alt=""
                  style={{ width: "44px", height: "44px", cursor: "pointer" }}
                />
                <div
                  style={{
                    fontFamily: "Barlow",
                    fontSize: "19px",
                    fontWeight: "600",
                  }}
                >
                  Time Log
                </div>
              </div>
              <div className="mt-3">
                {farmatedTimeSheetData && farmatedTimeSheetData.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-sm">
                      <thead>
                        <tr
                          style={{
                            fontFamily: "Inter",
                            fontSize: "14px",
                            fontWeight: "500",
                            color: "#6c757d",
                          }}
                        >
                          <th>Task Name</th>
                          <th>Total Hours</th>
                          <th>Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {farmatedTimeSheetData.slice(0, 4).map((item: any, index: any) => {
                          const taskName = item.taskName || "-";

                          return (
                            <tr
                              key={index}
                              style={{
                                fontFamily: "Inter",
                                fontSize: "14px",
                                fontWeight: "400",
                              }}
                            >
                              <td>
                                <OverlayTrigger
                                  placement="top"
                                  overlay={
                                    <Tooltip id={`tooltip-taskname-${index}`}>
                                      {taskName}
                                    </Tooltip>
                                  }
                                >
                                  <div
                                    style={{
                                      maxWidth: '200px',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    {taskName}
                                  </div>
                                </OverlayTrigger>
                              </td>
                              <td>{item.totalHours || "0"} hrs</td>
                              <td>{item.costFormatted || "-"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div
                    style={{
                      fontFamily: "Inter",
                      fontSize: "14px",
                      fontWeight: "400",
                      color: "#6c757d",
                    }}
                  >
                    No time sheets available
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Notes Card */}
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-body">
              <div className="d-flex align-items-center gap-2 mb-4">
                <img
                  src={projectOverviewIcons.notessIcon.default}
                  alt=""
                  style={{ width: "44px", height: "44px", cursor: "pointer" }}
                />
                <div
                  style={{
                    fontFamily: "Barlow",
                    fontSize: "19px",
                    fontWeight: "600",
                  }}
                >
                  Notes
                </div>
              </div>
              <div
                style={{
                  fontFamily: "Inter",
                  fontSize: "14px",
                  fontWeight: "400",
                }}
                className="mt-2"
              >
                {projectData?.notes}
              </div>
            </div>
          </div>
        </div>
      </div>

      <NewCompanyForm
        show={showCompany}
        onClose={() => setShowCompany(false)}
      />
    </>
  );
};

export default ProjectOverviewById;
