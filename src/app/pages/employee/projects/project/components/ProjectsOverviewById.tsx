import { useState, useEffect, useRef, useMemo } from "react";
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
import { getProjectProjectPoints, type ProjectPointValue } from "@services/projectPoints";
// Audit (change history)
import { VersionHistory } from "@modules/audit/VersionHistory";
import { AppIcon } from '@app/modules/common/components/ui/AppIcon';
import { getTimeTokens } from '@utils/timeFormat';
import { DataTable, type ColumnDef } from '@/ds/patterns/data-table';
import { Button } from '@/ds/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ds/ui/tooltip';

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
  // Dynamic Project Points (replaces the hardcoded Other Point 1/2/3 display).
  const [projectPoints, setProjectPoints] = useState<ProjectPointValue[]>([]);
  useEffect(() => {
    let active = true;
    if (!projectId) { setProjectPoints([]); return; }
    getProjectProjectPoints(projectId)
      .then((res) => { if (active) setProjectPoints(res?.points ?? []); })
      .catch((e) => { console.error("Error loading project points:", e); if (active) setProjectPoints([]); });
    return () => { active = false; };
  }, [projectId]);
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
    return projectData?.projectCommercialMappings?.reduce(
      (total: number, mapping: any) => {
        const rateCost = parseFloat(mapping.rateCost || 0);
        const lumpsumCost = parseFloat(mapping.lumpsumCost || 0);

        if (rateCost > 0) {
          return total + rateCost;
        } else if (lumpsumCost > 0) {
          return total + lumpsumCost;
        }

        return total;
      },
      0
    ) || 0;
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

  // ── Two read-only kit DataTables. Rows are flattened to real values so sort/search
  //    work on text rather than JSX; cells keep the same links and status presentation.
  const companyRows = useMemo(
    () => (projectData?.projectCompanyMappings || []).map((mapping: any) => ({
      relation: mapping?.relation ?? "Other",
      companyType:
        companyTypes?.find((type: any) => type.id === mapping.company?.companyTypeId)?.name ?? "-",
      companyName: mapping.company?.companyName ?? "Unknown",
      companyId: mapping.company?.id ?? "",
      // Same text the cell printed before: an unnamed contact reads " ()".
      contact: `${mapping?.contactPerson?.fullName || ""} (${mapping?.contactPerson?.roleInCompany || ""})`,
      contactPersonId: mapping?.contactPersonId ?? "",
      contactStatus: mapping?.contactPerson?.isContactActive ? "Active" : "Inactive",
    })),
    [projectData?.projectCompanyMappings, companyTypes]
  );

  const companyColumns = useMemo<ColumnDef<(typeof companyRows)[number]>[]>(
    () => [
      { accessorKey: "relation", header: "Relation" },
      { accessorKey: "companyType", header: "Company Type" },
      {
        accessorKey: "companyName",
        header: "Company",
        cell: ({ row }) => (
          <Link to={`/companies/${row.original.companyId}`} className="font-medium text-primary">
            {row.original.companyName}
          </Link>
        ),
      },
      {
        accessorKey: "contact",
        header: "Contact",
        cell: ({ row }) => (
          <Link to={`/contacts/${row.original.contactPersonId}`} className="text-primary">
            {row.original.contact}
          </Link>
        ),
      },
      {
        accessorKey: "contactStatus",
        header: "Contact Status",
        cell: ({ cell }) => {
          const value = String(cell.getValue() ?? "");
          const active = value === "Active";
          return (
            <div className="flex items-center gap-2">
              <span
                className={`inline-block size-2.5 rounded-full ${active ? "bg-success" : "bg-muted-foreground"}`}
                aria-hidden
              />
              {value}
            </div>
          );
        },
      },
    ],
    []
  );

  const timeLogColumns = useMemo<ColumnDef<{ taskName: string; totalHours: unknown; costFormatted: unknown }>[]>(
    () => [
      {
        accessorKey: "taskName",
        header: "Task Name",
        cell: ({ cell }) => {
          const value = String(cell.getValue() ?? "");
          return (
            <Tooltip>
              <TooltipTrigger
                render={
                  <div className="max-w-[200px] cursor-default truncate" />
                }
              >
                {value}
              </TooltipTrigger>
              <TooltipContent>{value}</TooltipContent>
            </Tooltip>
          );
        },
      },
      {
        accessorKey: "totalHours",
        header: "Total Hours",
        cell: ({ cell }) => `${cell.getValue() || "0"} hrs`,
      },
      {
        accessorKey: "costFormatted",
        header: "Cost",
        cell: ({ cell }) => cell.getValue() || "-",
      },
    ],
    []
  );

  // Still capped at the first four entries — this is a preview panel inside a card.
  const timeLogRows = useMemo(
    () => farmatedTimeSheetData.slice(0, 4).map((item: any) => ({
      taskName: item.taskName || "-",
      totalHours: item.totalHours,
      costFormatted: item.costFormatted,
    })),
    [timeSheets]
  );

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
            background: #1E3A8A;
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
                                href={`https://www.google.com/maps/dir/?api=1&destination=${primaryAddress.latitude},${primaryAddress.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  color: "#1E3A8A",
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
                    backgroundColor: "#1E3A8A",
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
                scrollbarColor: "#1E3A8A #f1f1f1"
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
                    {dayjs(projectData?.createdAt).format(`DD/M/YYYY, ${getTimeTokens().TIME}`) ??
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
                    {dayjs(projectData?.updatedAt).format(`DD/M/YYYY, ${getTimeTokens().TIME}`) ??
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

                <Button variant="ghost" size="sm" type="submit"
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
                </Button>
              </div>

              {/* Table */}
              <DataTable
                caption="Project Client Companies"
                stateKey="ProjectClientCompanies"
                data={companyRows}
                columns={companyColumns}
                getRowId={(r, i) => String(r.companyId || i)}
              />
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
                  <DataTable
                    caption="Project Time Log Preview"
                    stateKey="ProjectTimeLogPreview"
                    data={timeLogRows}
                    columns={timeLogColumns}
                    getRowId={(r, i) => `${r.taskName}-${i}`}
                    tools={false}
                    initialPageSize={4}
                  />
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

      {/* Project Details 1 Card - after address details */}
      <div className="row mt-5">
        <div className="col-md-6">
          <div
            className="card"
            style={{
              border: "none",
              backgroundColor: "white",
              borderRadius: "12px",
              boxShadow: "8px 8px 16px 0px rgba(0,0,0,0.04)"
            }}
          >
            <div
              className="card-body d-flex flex-column"
              style={{
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
                  <AppIcon name="bi-building" className="fs-1" color="#1E1E1E" />
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
                  Project Details 1
                </span>
              </div>

              <div className="d-flex flex-column" style={{ gap: "8px", width: "100%" }}>
                {/* Plot Area */}
                <div className="d-flex align-items-center justify-content-between" style={{ fontFamily: "Inter", fontSize: "14px", color: "black" }}>
                  <div style={{ fontWeight: "500" }}>Plot Area</div>
                  <div style={{ fontWeight: "400" }}>
                    {projectData?.plotArea
                      ? `${projectData.plotArea}${projectData.plotAreaUnit ? ' ' + projectData.plotAreaUnit : ''}`
                      : '-'}
                  </div>
                </div>
                {/* Built-Up Area */}
                <div className="d-flex align-items-center justify-content-between" style={{ fontFamily: "Inter", fontSize: "14px", color: "black" }}>
                  <div style={{ fontWeight: "500" }}>Built-Up Area</div>
                  <div style={{ fontWeight: "400" }}>
                    {projectData?.builtUpArea
                      ? `${projectData.builtUpArea}${projectData.builtUpAreaUnit ? ' ' + projectData.builtUpAreaUnit : ''}`
                      : '-'}
                  </div>
                </div>
                {/* Building Detail */}
                <div className="d-flex align-items-center justify-content-between" style={{ fontFamily: "Inter", fontSize: "14px", color: "black" }}>
                  <div style={{ fontWeight: "500" }}>Building Details</div>
                  <div style={{ fontWeight: "400" }}>{projectData?.buildingDetail || '-'}</div>
                </div>
                {/* Project Points — dynamic; heading is the label, description the value */}
                {projectPoints
                  .filter((p) => p.heading || p.description)
                  .map((p, idx) => (
                    <div key={p.id || idx} className="d-flex align-items-center justify-content-between" style={{ fontFamily: "Inter", fontSize: "14px", color: "black" }}>
                      <div style={{ fontWeight: "500" }}>{p.heading || `Point ${idx + 1}`}</div>
                      <div style={{ fontWeight: "400" }}>{p.description || '-'}</div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Revision History Section */}
      {projectId && (
        <div className="mt-6" style={{ marginTop: "2rem" }}>
          <h5 style={{ marginBottom: "1rem", fontWeight: "600", fontSize: "16px" }}>
            Revision History & Audit Trail
          </h5>
          {/* Lead-as-master: a project IS a Received lead — its audit history lives
              under the LEAD entity (the PROJECT audit entity type was retired). */}
          <VersionHistory type="LEAD" id={projectId} isAdmin={false} />
        </div>
      )}

      <NewCompanyForm
        show={showCompany}
        onClose={() => setShowCompany(false)}
      />
    </>
  );
};

export default ProjectOverviewById;
