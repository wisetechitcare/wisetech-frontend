import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { getAllTimeSheetWithCostByProjectId } from "@services/tasks";
import MyTimeSheetPorject from "@pages/employee/timesheet/mytimesheet/component/MyTimeSheetPorject";
import { projectOverviewIcons } from "@metronic/assets/sidepanelicons";

const ProjectTimeSheets = ({id}: {id?: string}) => {
  console.log("id=====================>", id);
  
  const [timeSheets, setTimeSheets] = useState<any>([]);
  const [billableFilter, setBillableFilter] = useState<null | string>(null); 
  // null = All, true = Billable, false = Non-Billable

  const { projectId } = useParams<{ projectId: string }>();
  console.log("projectId=====================>", projectId);

  useEffect(() => {
    const fetchTimeSheets = async () => {
      const response = await getAllTimeSheetWithCostByProjectId((projectId! || id!), billableFilter!);
      setTimeSheets(response);
    };
    fetchTimeSheets();
  }, [projectId, id]);

  return (
    <div>
      {/* Toggle Buttons */}
   

      {/* Three cards in one row */}
      <div className="d-flex flex-row gap-3 mb-4">
        
        {/* Total Logs */}
        <div className="card shadow-sm flex-fill p-6 rounded-3">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-2">
              <img
                src={projectOverviewIcons?.timeSheetIcon?.default}
                alt="Logs"
                style={{ width: "40px", height: "40px" }}
              />
              <span className="fw-semibold" style={{fontFamily:'Inter', fontWeight:'600', fontSize:'14px'}}>Total Logs</span>
            </div>
            <span className="fw-bold" style={{fontFamily:'Inter', fontWeight:'600', fontSize:'14px'}}>
              {timeSheets?.summary?.totalEntries ?? 0}
            </span>
          </div>
        </div>

        {/* Total Log Time */}
        <div className="card shadow-sm flex-fill p-6 rounded-3">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-2">
              <img
                src={projectOverviewIcons?.timeLogssIcon?.default}
                alt="Time"
                style={{ width: "40px", height: "40px" }}
              />
              <span className="fw-semibold" style={{fontFamily:'Inter', fontWeight:'600', fontSize:'14px'}}>Total Log Time</span>
            </div>
            <span className="fw-bold" style={{fontFamily:'Inter', fontWeight:'600', fontSize:'14px', color:'#1D5DE1'}}>
              {timeSheets?.summary?.totalHours ?? "00:00:00"}
            </span>
          </div>
        </div>

        {/* Total Cost */}
        <div className="card shadow-sm flex-fill p-6 rounded-3">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-2">
              <img
                src={projectOverviewIcons?.timeLogssIcon?.default}
                alt="Cost"
                style={{ width: "40px", height: "40px" }}
              />
              <span className="fw-semibold" style={{fontFamily:'Inter', fontWeight:'600', fontSize:'14px'}}>Total Cost</span>
            </div>
            <span className="fw-bold" style={{fontFamily:'Inter', fontWeight:'600', fontSize:'14px', color:'#1D5DE1'}}>
              {timeSheets?.summary?.totalCostFormatted ?? "₹0"}
            </span>
          </div>
        </div>

      </div>


      {/* Timesheet Table with Toggle */}
      <div className="card">
        <div className="card-body">
          {/* Toggle Buttons inside the table card */}
          { id ? (
          <div className="mb-4">
            <ul className="nav nav-tabs nav-line-tabs nav-line-tabs-2x fs-4 fw-bold mb-0">
              <li className="nav-item">
                <button
                  className={`nav-link text-active-primary ${
                    billableFilter === null ? "active" : ""
                  }`}
                  onClick={() => setBillableFilter(null)}
                  style={{
                    border: "1px solid #7A2124",
                    color: "black",
                    borderRadius: "20px",
                    fontFamily: "Barlow",
                    fontWeight: "500",
                    fontSize: "14px",
                    padding: "8px 20px",
                    marginRight: "0px",
                  }}
                >
                  All
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link text-active-primary ${
                    billableFilter === "true" ? "active" : ""
                  }`}
                  onClick={() => setBillableFilter("true")}
                  style={{
                    border: "1px solid #7A2124",
                    color: "black",
                    borderRadius: "20px",
                    fontFamily: "Barlow",
                    fontWeight: "500",
                    fontSize: "14px",
                    padding: "8px 20px",
                    marginRight: "0px",
                  }}
                >
                  Billable
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link text-active-primary ${
                    billableFilter === "false" ? "active" : ""
                  }`}
                  onClick={() => setBillableFilter("false")}
                  style={{
                    border: "1px solid #7A2124",
                    color: "black",
                    borderRadius: "20px",
                    fontFamily: "Barlow",
                    fontWeight: "500",
                    fontSize: "14px",
                    padding: "8px 20px",
                    marginRight: "0px",
                  }}
                >
                  Non Billable
                </button>
              </li>
            </ul>
          </div>
          ) : <></>}
          
          {/* Timesheet Table */}
          <MyTimeSheetPorject projectId={projectId!} billable={billableFilter} />
        </div>
      </div>
    </div>
  );
};

export default ProjectTimeSheets;
