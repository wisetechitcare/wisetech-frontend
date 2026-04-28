import CommonCard from "@app/modules/common/components/CommonCard";
import { resourseAndView } from "@models/company";
import { AppDispatch, RootState } from "@redux/store";
import {
  fetchAllStarEmployeeByStartAndEndDate,
  getAllKPIModules,
  getAllKpiFactors,
  fetchStarEmployeesByFactorId,
  fetchAllKpiScores,
} from "@services/employee";
import { getAvatar } from "@utils/avatar";
import { Dayjs } from "dayjs";
import { useEffect, useState } from "react";
import { Col, Container, Modal, Row, Table, Accordion } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { miscellaneousIcons } from "../../../../../_metronic/assets/miscellaneousicons";
import SVG from "react-inlinesvg";
import { loadAllEmployeesIfNeeded } from "@redux/slices/allEmployees";
import { maleIcons } from "@metronic/assets/sidepanelicons";
import { fetchLeaderboard } from "@utils/statistics";
import { Spinner } from "react-bootstrap";
import axios from "axios";
const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;

interface OverviewData {
  icon: string;
  label: string;
  score: number;
}
type StarEmployee = {
  employeeId: string;
  score: string;
  value: string;
  employee: {
    firstName: string;
    lastName: string;
    avatar: string;
    gender: number;
  };
};

type KpiScore = {
  factorId: string;
  score: string | number;
  factor: { name: string; type?: "POSITIVE" | "NEGATIVE" };
  employee: {
    avatar: string;
    gender: number;
    users: { firstName: string; lastName: string };
  };
};
function LeaderBoardCore({
  startDate,
  endDate,
  fromAdmin = false,
  resourseAndView,
  overviewData,
  finalMaxTotalScore: propMaxTotalScore, // 👈 IMPORTANT
}: {
  startDate?: Dayjs;
  endDate?: Dayjs;
  fromAdmin?: boolean;
  resourseAndView?: resourseAndView[];
  overviewData?: OverviewData[];
  finalMaxTotalScore?: number;
}) {
  const toggleChange = useSelector(
    (state: RootState) => state.attendanceStats.toggleChange
  );
  const selectedEmployeeId = useSelector(
    (state: RootState) =>
      state.employee.selectedEmployee?.id || state.employee.currentEmployee.id
  );
  const [starEmployeeFactor, setStarEmployeeFactor] = useState('')
  const [starEmployee1, setstarEmployee1] = useState({
    name: "",
    score: 0,
    avatar: "",
    employeeId: "",
  });

  const normalizeEmployee = (emp: any = {}) => {
    const firstName =
      emp?.firstName ||
      emp?.employee?.firstName ||
      emp?.employeeName?.split(" ")[0] ||
      "";

    const lastName =
      emp?.lastName ||
      emp?.employee?.lastName ||
      emp?.employeeName?.split(" ").slice(1).join(" ") ||
      "";

    const avatar =
      emp?.avatar ||
      emp?.employee?.avatar ||
      "";

    const gender =
      emp?.gender ||
      emp?.employee?.gender ||
      0;

    return {
      name: `${firstName} ${lastName}`.trim() || "-NA-",
      avatar: getEmployeeAvatar(avatar, gender),
      score: Number(emp?.score || 0),
      employeeId: emp?.employeeId || "",
    };
  };

  const [starEmployee2, setstarEmployee2] = useState({
    name: "",
    score: 0,
    avatar: "",
    employeeId: "",
  });
  const [starEmployee3, setstarEmployee3] = useState({
    name: "",
    score: 0,
    avatar: "",
    employeeId: "",
  });
  const [starEmployee4, setstarEmployee4] = useState({
    name: "",
    score: 0,
    avatar: "",
    employeeId: "",
  });
  const [starEmployee5, setstarEmployee5] = useState({
    name: "",
    score: 0,
    avatar: "",
    employeeId: "",
  });

  const [topEmployeeByFactor, setTopEmployeeByFactor] = useState<any>([]);

  const mumbaiTz = "Asia/Kolkata";

  const [showAllStarEmployeesByAFactor, setShowAllStarEmployeesByAFactor] = useState(false);
  const [starEmployeeDataByAFactor, setStarEmployeeDataByAFactor] = useState<any[]>([]);
  const [starEmployeeDataFactorName, setStarEmployeeDataFactorName] = useState('');
  const [showAllOverAllEmployeeByScore, setShowAllOverAllEmployeeByScore] = useState(false);
  const [allEmployeesByScore, setAllEmployeesByScore] = useState<any[]>([]);
  const [topEmployeeByModule, setTopEmployeeByModule] = useState<
    { moduleName: string; topEmployee: StarEmployee }[]
  >([]);
  const finalMaxTotalScore = Number(propMaxTotalScore) || 0;
  const [topFive, setTopFive] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [allKPIFactors, setAllKPIFactors] = useState<any[]>([]);
  const [factorsWithEmployees, setFactorsWithEmployees] = useState<any[]>([]);
  const [starEmployees, setStarEmployees] = useState<any[]>([]);

  useEffect(() => {
    const loadFactors = async () => {
      try {
        const res = await getAllKpiFactors();
        setAllKPIFactors(res?.data?.factors || []);
        console.log("✅ FACTORS ARRAY:", res?.data?.factors);
      } catch (e) {
        console.error("Factor fetch error", e);
      }
    };

    loadFactors();
  }, []);

  const allemployees = useSelector((state: RootState) => state.allEmployees?.list);
  const dispatch = useDispatch<AppDispatch>();

  // ─── 1. FETCH TOP 5 OVERALL + FULL LIST (from leaderboard API) ──────────────
  useEffect(() => {
    if (!startDate || !endDate) return;

    let isMounted = true;

    const loadLeaderboard = async () => {
      try {
        setLoading(true);

        const formattedStart = startDate.format("YYYY-MM-DD");
        const formattedEnd = endDate.format("YYYY-MM-DD");

        const data = await fetchLeaderboard(formattedStart, formattedEnd);

        console.log("🔥 LEADERBOARD DATA:", data);

        if (!isMounted) return;

        const topFiveData = Array.isArray(data?.topFive) ? data.topFive : [];
        setTopFive(topFiveData);

        const fullListData = Array.isArray(data?.fullList) ? data.fullList : [];
        setAllEmployeesByScore(fullListData);

      } catch (error) {
        console.error("Leaderboard error:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadLeaderboard();

    return () => {
      isMounted = false;
    };

  }, [startDate, endDate]);

  // ─── Map top 5 to individual star employee states ─────────────────────────
  useEffect(() => {
    if (!topFive || topFive.length === 0) return;

    setstarEmployee1(normalizeEmployee(getSafe(topFive, 0)));
    setstarEmployee2(normalizeEmployee(getSafe(topFive, 1)));
    setstarEmployee3(normalizeEmployee(getSafe(topFive, 2)));
    setstarEmployee4(normalizeEmployee(getSafe(topFive, 3)));
    setstarEmployee5(normalizeEmployee(getSafe(topFive, 4)));
  }, [topFive]);

  useEffect(() => {
    dispatch(loadAllEmployeesIfNeeded());
  }, [dispatch]);

  // ─── 2. FETCH TOP EMPLOYEES BY FACTOR (Module-wise Summary) ──────────────────
  async function fetchTopEmployeesByFactor() {
    try {
      if (!startDate || !endDate) return;

      const response = await axios.get<{ data: { score: any[] } }>(
        `${API_BASE_URL}/api/employee/kpi/score/all`,
        {
          params: {
            startDate: startDate.format("YYYY-MM-DD"),
            endDate: endDate.format("YYYY-MM-DD"),
          },
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      console.log("📡 RAW RESPONSE:", response);

      const result = response.data?.data?.score || [];

      if (result.length === 0) {
        console.warn("⚠️ No module-wise data received");
      }

      console.log("✅ FINAL MODULE DATA:", result);
      setTopEmployeeByModule(result);

    } catch (error) {
      console.error("🔥 Top Employees By Factor fetch error:", error);
    }
  }

  const fetchStarEmployees = async () => {
    try {
      if (!startDate || !endDate) return;
      const res = await fetchAllKpiScores(
        startDate.format("YYYY-MM-DD"),
        endDate.format("YYYY-MM-DD")
      );

      console.log("⭐ RAW KPI SCORES:", res);

      const data = res?.data || [];

      if (!Array.isArray(data) || data.length === 0) {
        console.warn("⚠️ No KPI score data found");
        setStarEmployees([]);
        return;
      }

      processStarEmployees(data);

    } catch (err) {
      console.error("🔥 Star Employee Fetch Error:", err);
      setStarEmployees([]);
    }
  };

  const processStarEmployees = (data: any[]) => {
    const map = new Map();

    data.forEach((item: any) => {
      const factor = allKPIFactors.find(
        (f: any) => f.id === item.factor_id
      );

      if (!factor) return;

      const factorName = factor.name;
      const factorType = factor.type;

      if (!map.has(factorName)) {
        map.set(factorName, {
          factorName,
          type: factorType,
          employees: []
        });
      }

      map.get(factorName).employees.push(item);
    });

    const final = Array.from(map.values()).map((group: any) => {
      const sorted = group.employees.sort((a: any, b: any) =>
        group.type === "NEGATIVE"
          ? a.score - b.score
          : b.score - a.score
      );

      return {
        factorName: group.factorName,
        topEmployees: sorted.slice(0, 5),   // for card
        allEmployees: sorted                // for modal
      };
    });

    console.log("⭐ FINAL STAR DATA:", final);
    setStarEmployees(final);
  };

  // ─── CALL FETCH DATA ON DATE CHANGE
  useEffect(() => {
    if (!startDate || !endDate || allKPIFactors.length === 0) return;

    fetchTopEmployeesByFactor();
    fetchStarEmployees();
  }, [startDate, endDate, allKPIFactors]);

  const headerStyle: React.CSSProperties = {
    color: "#70829A",
    fontWeight: 500,
    fontFamily: "Inter, sans-serif",
  };

  const factorsStyle: React.CSSProperties = {
    color: "#000000",
    fontWeight: 500,
  };

  const formatScore = (score: any) => {
    if (
      score === "-NA-" ||
      score === null ||
      score === undefined ||
      isNaN(Number(score))
    ) {
      return "-NA-";
    }

    return Number(score).toFixed(2);
  };

  const getEmployeeAvatar = (avatar: string | undefined, gender: number | undefined) => {
    const avatarUrl = getAvatar(avatar || "", gender as 0 | 1 | 2);
    return (avatarUrl && avatarUrl.trim() !== '') ? avatarUrl : maleIcons.maleIcon?.default;
  };
  
  const getSafe = (arr: any[], index: number) => {
    return Array.isArray(arr) && arr[index] ? arr[index] : {};
  };

  const getOrdinal = (num: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = num % 100;
    return num + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  return (
    <>
    {loading ? (
      <Container
        fluid
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "300px" }}
      >
        <Spinner animation="border" variant="primary" />
      </Container>
    ) : (
      <>
      {/* 1. TOP 5 OVERALL SECTION */}
      <Row className="mt-7">
        <CommonCard>
          <div className="d-flex flex-row align-items-center justify-content-between">
            <h3 style={{ fontSize: "18px", fontWeight: "bold" }}>
              Top 5 Overall
              {finalMaxTotalScore > 0 && (
                <span style={{ fontWeight: "normal", fontSize: "14px", color: "#70829A", marginLeft: "8px" }}>
                  (out of {finalMaxTotalScore})
                </span>
              )}
            </h3>
            <button className="btn btn-primary" onClick={() => setShowAllOverAllEmployeeByScore(true)}>View All</button>
          </div>
          <div className="overflow-scroll no-scrollbar my-5">
            <div className="d-flex flex-row align-items-center justify-content-between gap-10 py-5">
                {[starEmployee1, starEmployee2, starEmployee3, starEmployee4, starEmployee5].map((emp, i) => (
                  <div key={i} className="d-flex flex-row align-items-center gap-2 px-3 py-2 rounded-1">
                    <div className="position-relative">
                      <img
                        src={emp.avatar}
                        alt="Avatar"
                        className="rounded-circle"
                        style={{ width: "56px", height: "56px" }}
                      />
                      <span className="position-absolute top-100 start-100 translate-middle badge rounded-pill">
                        <SVG
                          src={miscellaneousIcons[`StarEmployeeRank${i+1}` as keyof typeof miscellaneousIcons] || miscellaneousIcons.StarEmployeeRank1}
                          className="menu-svg-icon"
                          style={{ marginTop: "-20px", marginLeft: "-20px" }}
                        />
                      </span>
                    </div>
                    <div className="d-flex flex-column ms-2">
                      <span style={{ fontSize: "15px", color: "black" }}>{emp.name}</span>
                      <span style={{ fontSize: "14px", color: "black", fontWeight: "bold" }}>
                        {formatScore(emp.score)}
                        {finalMaxTotalScore > 0 && <span style={{ color: "#70829A", fontWeight: "normal" }}> / {finalMaxTotalScore}</span>}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </CommonCard>
      </Row>

      {/* 2. TOP EMPLOYEES BY FACTORS (MODULE-WISE SUMMARY) */}
      <Row className="mt-7">
        <CommonCard>
          <h3 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "20px" }}>Top Employees By Factors</h3>
          <Row className="gy-3 gx-2">
            {overviewData?.map((item, index) => {
              const getTopEmployeeForFactor = (label: string) => {
                const factor = topEmployeeByModule?.find(
                  (f: any) => f?.moduleName?.toLowerCase()?.trim() === label?.toLowerCase()?.trim()
                );
                return factor?.topEmployee || null;
              };
              const employeeData = getTopEmployeeForFactor(item.label);
              const emp = normalizeEmployee(employeeData);

              return (
                <Col key={index} xs={12} sm={6} md={4}>
                  <div className="d-flex align-items-center justify-content-between" style={{ backgroundColor: "#ffffff", borderRadius: "8px", border: "1.5px solid #D4DBE4", padding: "12px", height: "100%" }}>
                    <div className="d-flex align-items-center gap-2" style={{ padding: "6px 8px" }}>
                      <img src={item.icon} alt={item.label} style={{ width: "20px", height: "20px" }} />
                      <span>{item.label}</span>
                    </div>
                    <div className="d-flex flex-row align-items-center gap-2">
                      <img src={emp.avatar} alt="Avatar" className="rounded-circle" style={{ width: "40px", height: "40px" }} />
                      <div className="d-flex flex-column ms-2">
                        <span style={{ fontSize: "12px", color: "black" }}>{emp.name}</span>
                        <span style={{ fontSize: "14px", color: "black" }}>
                          {formatScore(emp.score)}
                          {finalMaxTotalScore > 0 && <span style={{ color: "#70829A" }}> / {finalMaxTotalScore}</span>}
                        </span>
                      </div>
                    </div>
                  </div>
                </Col>
              );
            })}
          </Row>
        </CommonCard>
      </Row>

      {/* 3. STAR EMPLOYEES SECTION (FACTOR-WISE DETAILED) */}
      <Row className="mt-7">
        <CommonCard>
          <h3 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "20px" }}>Star Employees</h3>
          {(!Array.isArray(starEmployees) || starEmployees.length === 0) ? (
            <div style={{ padding: "20px", color: "#70829A" }}>
              No Star Employees Found
            </div>
          ) : starEmployees.map((group: any, index: number) => {
            const factorType = group.topEmployees?.[0]?.factor?.type || "POSITIVE";
            const emp1 = normalizeEmployee(group.topEmployees?.[0] || {});
            const emp2 = normalizeEmployee(group.topEmployees?.[1] || {});
            const emp3 = normalizeEmployee(group.topEmployees?.[2] || {});
            const emp4 = normalizeEmployee(group.topEmployees?.[3] || {});
            const emp5 = normalizeEmployee(group.topEmployees?.[4] || {});

            const top5 = [emp1, emp2, emp3, emp4, emp5];

            return (
              <div key={index} style={{ marginBottom: "20px" }}>
                <div style={{
                  background: factorType === "NEGATIVE" ? "#fbecec" : "#eaf3de",
                  padding: "20px 28px",
                  borderRadius: "12px",
                  boxShadow: "8px 8px 16px 0px rgba(0,0,0,0.04)"
                }}>
                  <div style={{ marginBottom: "16px" }}>
                    <div style={{ color: "#000", fontFamily: "Barlow", fontSize: "18px", fontWeight: 600 }}>{group.factorName}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "row", gap: "16px", alignItems: "center", overflowX: "auto" }} className="no-scrollbar">
                    {top5.map((emp, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: "150px" }}>
                        <div className="position-relative">
                          <img src={emp.avatar} className="rounded-circle" style={{ width: "56px", height: "56px" }} />
                          <div style={{ position: "absolute", bottom: "-4.5px", left: "32px", background: i === 0 ? "#2bb07b" : i === 1 ? "#b58320" : i === 2 ? "#7959db" : "#717171", borderRadius: "32px", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ fontSize: "13px", fontWeight: 600, color: "white" }}>{getOrdinal(i+1)}</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontSize: "15px", color: "#000" }}>{emp.name}</span>
                          <span style={{ fontSize: "14px", fontWeight: 500 }}>{formatScore(emp.score)}</span>
                        </div>
                      </div>
                    ))}
                    <button className="btn btn-link" style={{ color: "#9D4141", fontWeight: 600, fontSize: "14px", textDecoration: "none" }} onClick={() => {
                      setStarEmployeeDataByAFactor(group.allEmployees);
                      setStarEmployeeDataFactorName(group.factorName);
                      setShowAllStarEmployeesByAFactor(true);
                    }}>View All</button>
                  </div>
                </div>
              </div>
            );
          })}
        </CommonCard>
      </Row>
      </>
    )}

      {/* MODALS */}
      <Modal show={showAllOverAllEmployeeByScore} onHide={() => setShowAllOverAllEmployeeByScore(false)}>
        <Modal.Body style={{ padding: "40px" }}>
          <div className="d-flex justify-content-between align-items-center">
            <div style={{ fontSize: "17px", fontWeight: "bold" }}>All Employees Ranking Overall</div>
            <div className="d-flex flex-column">
              <div style={{ color: "#70829A", fontSize: "12px" }}>Max Possible</div>
              <div style={{ fontWeight: "bold" }}>{finalMaxTotalScore > 0 ? finalMaxTotalScore : formatScore(starEmployee1?.score || 0)}</div>
            </div>
          </div>
          <Table responsive style={{ marginTop: "20px" }}>
            <thead>
              <tr style={{ color: "#70829A" }}>
                <th>Rank</th>
                <th>Employee</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {allEmployeesByScore?.map((employee: any, index: number) => {
                const emp = normalizeEmployee(employee);
                const bagColor = emp.score > 0 ? "#EBFAE6" : "#FAE8E6";
                return (
                  <tr key={index} style={{ backgroundColor: bagColor }}>
                    <td style={{ padding: "12px" }}>{index + 1}.</td>
                    <td style={{ padding: "12px" }}>
                      <div className="d-flex align-items-center gap-2">
                        <img src={emp.avatar} className="rounded-circle" style={{ width: "32px", height: "32px" }} />
                        <span>{emp.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: "12px" }}>{formatScore(emp.score)}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Modal.Body>
      </Modal>

      <Modal show={showAllStarEmployeesByAFactor} onHide={() => setShowAllStarEmployeesByAFactor(false)}>
        <Modal.Body style={{ padding: "40px" }}>
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex flex-column">
              <div style={{ fontSize: "20px", fontWeight: "bold" }}>Star Employees</div>
              <div className="text-muted">{starEmployeeDataFactorName}</div>
            </div>
          </div>
          <Table responsive style={{ marginTop: "20px" }}>
            <thead>
              <tr style={{ color: "#70829A" }}>
                <th>Rank</th>
                <th>Employee</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {starEmployeeDataByAFactor?.map((employee: any, index: number) => {
                const emp = normalizeEmployee(employee);
                const bagColor = emp.score > 0 ? "#EBFAE6" : "#FAE8E6";
                return (
                  <tr key={index} style={{ backgroundColor: bagColor }}>
                    <td style={{ padding: "12px" }}>{index + 1}.</td>
                    <td style={{ padding: "12px" }}>
                      <div className="d-flex align-items-center gap-2">
                        <img src={emp.avatar} className="rounded-circle" style={{ width: "32px", height: "32px" }} />
                        <span>{emp.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: "12px" }}>{formatScore(emp.score)}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Modal.Body>
      </Modal>
    </>
  );
};

export default LeaderBoardCore;
