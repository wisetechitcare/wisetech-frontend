import CommonCard from "@app/modules/common/components/CommonCard";
import { resourseAndView } from "@models/company";
import { AppDispatch, RootState } from "@redux/store";
import {
  fetchAllStarEmployeeByStartAndEndDate,
  getAllKPIModules,
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

interface OverviewData {
  icon: string;
  label: string;
  score: number;
}

function LeaderBoardCore({
  startDate,
  endDate,
  fromAdmin = false,
  resourseAndView,
  overviewData,
}: {
  startDate?: Dayjs;
  endDate?: Dayjs;
  fromAdmin?: boolean;
  resourseAndView?: resourseAndView[];
  overviewData?: OverviewData[];
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

  const [showAllStarEmployeesByAFactor, setShowAllStarEmployeesByAFactor] = useState(false)
  const [starEmployeeDataByAFactor, setStarEmployeeDataByAFactor] = useState<any>([])
  const [starEmployeeDataFactorName, setStarEmployeeDataFactorName] = useState('')
  const [showAllOverAllEmployeeByScore, setShowAllOverAllEmployeeByScore] = useState(false)
  const [allEmployeesByScore, setAllEmployeesByScore] = useState<any>([])
  const [topEmployeeByModule, setTopEmployeeByModule] = useState<any>([])
  const [maxTotalScore, setMaxTotalScore] = useState<number>(0);
  const allemployees = useSelector((state: RootState) => state.allEmployees?.list);

  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    dispatch(loadAllEmployeesIfNeeded());
  }, [dispatch]);

  async function fetchAllTheStarEmployeesByStartAndEndDate() {
    // const startDate = formatTime(day.startOf('day'), 'YYYY-MM-DD');
    // const endDate = formatTime(day.endOf('day'), 'YYYY-MM-DD');

    const { data } = await fetchAllStarEmployeeByStartAndEndDate(startDate?.format('YYYY-MM-DD'), endDate?.format('YYYY-MM-DD'));

    // Extract maxTotal from API response
    setMaxTotalScore(data?.maxTotal || 0);

    const {
      data: { modules },
    } = await getAllKPIModules();

    const employeeTrackMap = new Map();
    const modulesSet = new Set();
    const employeeTrackByModuleMap = new Map();
    const employeeTrackByFactorMap = new Map();
    for (let i = 0; i < modules.length; i++) {
      const module = modules[i];
      modulesSet.add(module.id);
    }
    const finalData = data?.result;

    for (let j = 0; j < modules?.length; j++) {
      //   const currdata = finalData[j];
      //   const allStarEmployee = currdata?.starEmployees;
      const module = modules[j];
      const moduleId = module?.id;
      const moduleName = module?.name;

      const employeeTrackByModule = finalData?.filter(
        (employee: any) => employee?.moduleId === moduleId
      );
      if (employeeTrackByModuleMap.has(moduleName)) {
        const existingEmployeeTrackByModule =
          employeeTrackByModuleMap.get(moduleName);
        existingEmployeeTrackByModule.push(...employeeTrackByModule);
        employeeTrackByModuleMap.set(moduleName, existingEmployeeTrackByModule);
      } else {
        employeeTrackByModuleMap.set(moduleName, employeeTrackByModule);
      }
    }
    const dataFinal = [...employeeTrackByModuleMap.values()];
    setTopEmployeeByFactor([...employeeTrackByModuleMap.entries()]);

    for (let i = 0; i < finalData.length; i++) {
      const currdata = finalData[i];
      const allStarEmployee = currdata?.starEmployees;

      for (let j = 0; j < allStarEmployee?.length; j++) {
        const employee = allStarEmployee[j];
        const employeeDetails = employee?.employee;
        const employeeId = employee?.employeeId;
        const employeeName =
          employeeDetails?.firstName + " " + employeeDetails?.lastName;
        const employeeScore = Number(employee?.score);
        const employeeAvatar = employeeDetails?.avatar;
        const employeeModule = employee?.module;

        if (employeeTrackByModuleMap.has(employeeModule?.name)) {
        }

        if (employeeTrackMap.has(employeeId)) {
          const existingEmployee = employeeTrackMap.get(employeeId);
          existingEmployee.score += employeeScore;
          employeeTrackMap.set(employeeId, existingEmployee);
        } else {
          employeeTrackMap.set(employeeId, {
            name: employeeName,
            score: employeeScore,
            avatar: getEmployeeAvatar(employeeAvatar, employeeDetails?.gender),
            employeeId: employeeId,
          });
        }
      }
    }

    const sortedEmployeeTrackMap = [...employeeTrackMap.values()].sort(
      (a, b) => Number(b.score) - Number(a.score)
    );

    setAllEmployeesByScore(sortedEmployeeTrackMap)

    setstarEmployee1(
      sortedEmployeeTrackMap[0] || {
        name: "-NA-",
        score: 0,
        avatar: getEmployeeAvatar("", 0),
        employeeId: "",
      }
    );
    setstarEmployee2(
      sortedEmployeeTrackMap[1] || {
        name: "-NA-",
        score: 0,
        avatar: getEmployeeAvatar("", 0),
        employeeId: "",
      }
    );
    setstarEmployee3(
      sortedEmployeeTrackMap[2] || {
        name: "-NA-",
        score: 0,
        avatar: getEmployeeAvatar("", 0),
        employeeId: "",
      }
    );
    setstarEmployee4(
      sortedEmployeeTrackMap[3] || {
        name: "-NA-",
        score: 0,
        avatar: getEmployeeAvatar("", 0),
        employeeId: "",
      }
    );
    setstarEmployee5(
      sortedEmployeeTrackMap[4] || {
        name: "-NA-",
        score: 0,
        avatar: getEmployeeAvatar("", 0),
        employeeId: "",
      }
    );

  }

  useEffect(() => {
    fetchAllTheStarEmployeesByStartAndEndDate();
  }, [startDate, endDate]);

  useEffect(() => {
    if (!topEmployeeByFactor?.length) {
      return;
    }

    const topEmployeeByFactorData = [];

    let mapEmployeeByModuleAndScore = new Map()
    for (let i = 0; i < topEmployeeByFactor?.length; i++) {
      let employeeTrackWithScore = new Map()
      const factorName = topEmployeeByFactor[i][0];
      const factorData = topEmployeeByFactor[i][1];

      for (let j = 0; j < factorData?.length; j++) {
        const starEmployees = factorData[j]?.starEmployees;

        for (let k = 0; k < starEmployees?.length; k++) {

          const employeeData = starEmployees[k];

          const employeeId = employeeData?.employeeId;
          const employeeScore = employeeData?.score;
          const employeeModule = employeeData?.module;

          if (employeeTrackWithScore.has(employeeId)) {

            const existingEmployee = employeeTrackWithScore.get(employeeId);
            existingEmployee.score = Number(existingEmployee.score) + Number(employeeScore);

            employeeTrackWithScore.set(employeeId, existingEmployee);
          } else {


            employeeTrackWithScore.set(employeeId, {
              employeeId: employeeId,
              score: Number(employeeScore),
              employeeData: employeeData
            });
          }
        }
        const employeesTotalScore = [...employeeTrackWithScore.values()].sort((a, b) => Number(b.score) - Number(a.score));

      }
      const employeesForModule = [...employeeTrackWithScore.values()].sort((a, b) => Number(b.score) - Number(a.score));


      topEmployeeByFactorData.push({
        moduleName: factorName,
        employees: employeesForModule
      })
    }
    setTopEmployeeByModule(topEmployeeByFactorData)

  }, [topEmployeeByFactor])

  const headerStyle: React.CSSProperties = {
    color: "#70829A",
    fontWeight: 500,
    fontFamily: "Inter, sans-serif",
  };

  const factorsStyle: React.CSSProperties = {
    color: "#000000",
    fontWeight: 500,
  };

  const getRandomColor = () => {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  };

  const getOrdinal = (num: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = num % 100;
    return num + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const formatScore = (score: any) => {
    if (score === "-NA-" || score === null || score === undefined) return "-NA-";
    return Number(score).toFixed(2);
  };

  const getEmployeeAvatar = (avatar: string | undefined, gender: number | undefined) => {
    const avatarUrl = getAvatar(avatar || "", gender as 0 | 1 | 2);
    return (avatarUrl && avatarUrl.trim() !== '') ? avatarUrl : maleIcons.maleIcon?.default;
  };
  return (
    <>
      <Row className="mt-7">
        <CommonCard>
          <div className="d-flex flex-row align-items-center justify-content-between">
            <h3 style={{ fontSize: "18px", fontWeight: "bold" }}>
              Top 5 Overall
              {maxTotalScore > 0 && (
                <span style={{ fontWeight: "normal", fontSize: "14px", color: "#70829A", marginLeft: "8px" }}>
                  (out of {maxTotalScore})
                </span>
              )}
            </h3>
            <button className="btn btn-primary" onClick={() => setShowAllOverAllEmployeeByScore(true)}>View All</button>
          </div>
          <div className="overflow-scroll no-scrollbar my-5">
            <div>
              <div className="d-flex flex-row align-items-center justify-content-between gap-10 py-5">
                <div className="d-flex flex-row align-items-center gap-2 px-3 py-2 rounded-1" 
                // style={{ background: "#EDF2F9" }}
                >
                  <div className="position-relative">
                    <img
                      src={starEmployee1.avatar}
                      alt="Avatar"
                      className="rounded-circle"
                      style={{ width: "56px", height: "56px" }}
                    />
                    <span className="position-absolute top-100 start-100 translate-middle badge rounded-pill">
                      <SVG
                        src={miscellaneousIcons.StarEmployeeRank1}
                        className="menu-svg-icon"
                        style={{ marginTop: "-20px", marginLeft: "-20px" }}
                      />
                    </span>
                  </div>

                  <div className="d-flex flex-column ms-2">
                    <span style={{ fontSize: "15px", color: "black" }}>
                      {starEmployee1.name}
                    </span>
                    <span
                      style={{
                        fontSize: "14px",
                        color: "black",
                        fontWeight: "bold",
                      }}
                    >
                      {formatScore(starEmployee1.score)}
                      {maxTotalScore > 0 && (
                        <span style={{ color: "#70829A", fontWeight: "normal" }}> / {maxTotalScore}</span>
                      )}
                    </span>
                  </div>
                </div>
                <div className="d-flex flex-row align-items-center gap-2 px-3 py-2 rounded-1"
                // style={{ background: "#EDF2F9" }}
                >
                  <div className="position-relative">
                    <img
                      src={starEmployee2.avatar}
                      alt="Avatar"
                      className="rounded-circle"
                      style={{ width: "56px", height: "56px" }}
                    />
                    <span className="position-absolute top-100 start-100 translate-middle badge rounded-pill">
                      <SVG
                        src={miscellaneousIcons.StarEmployeeRank2}
                        className="menu-svg-icon"
                        style={{ marginTop: "-20px", marginLeft: "-20px" }}
                      />
                    </span>
                  </div>
                  <div className="d-flex flex-column ms-2">
                    <span style={{ fontSize: "15px", color: "black" }}>
                      {starEmployee2.name}
                    </span>
                    <span
                      style={{
                        fontSize: "14px",
                        color: "black",
                        fontWeight: "bold",
                      }}
                    >
                      {formatScore(starEmployee2.score)}
                      {maxTotalScore > 0 && (
                        <span style={{ color: "#70829A", fontWeight: "normal" }}> / {maxTotalScore}</span>
                      )}
                    </span>
                  </div>
                </div>
                <div className="d-flex flex-row align-items-center gap-2 px-3 py-2 rounded-1"
                // style={{ background: "#EDF2F9" }}
                >
                  <div className="position-relative">
                    <img
                      src={starEmployee3.avatar}
                      alt="Avatar"
                      className="rounded-circle"
                      style={{ width: "56px", height: "56px" }}
                    />
                    <span className="position-absolute top-100 start-100 translate-middle badge rounded-pill">
                      <SVG
                        src={miscellaneousIcons.StarEmployeeRank3}
                        className="menu-svg-icon"
                        style={{ marginTop: "-20px", marginLeft: "-20px" }}
                      />
                    </span>
                  </div>
                  <div className="d-flex flex-column ms-2">
                    <span style={{ fontSize: "15px", color: "black" }}>
                      {starEmployee3.name}
                    </span>
                    <span
                      style={{
                        fontSize: "14px",
                        color: "black",
                        fontWeight: "bold",
                      }}
                    >
                      {formatScore(starEmployee3.score)}
                      {maxTotalScore > 0 && (
                        <span style={{ color: "#70829A", fontWeight: "normal" }}> / {maxTotalScore}</span>
                      )}
                    </span>
                  </div>
                </div>
                <div className="d-flex flex-row align-items-center gap-2 px-3 py-2 rounded-1"
                //  style={{ background: "#EDF2F9" }}
                 >
                  <div className="position-relative">
                    <img
                      src={starEmployee4.avatar}
                      alt="Avatar"
                      className="rounded-circle"
                      style={{ width: "56px", height: "56px" }}
                    />
                    <span className="position-absolute top-100 start-100 translate-middle badge rounded-pill">
                      <SVG
                        src={miscellaneousIcons.StarEmployeeRank4}
                        className="menu-svg-icon"
                        style={{ marginTop: "-20px", marginLeft: "-20px" }}
                      />
                    </span>
                  </div>
                  <div className="d-flex flex-column ms-2">
                    <span style={{ fontSize: "15px", color: "black" }}>
                      {starEmployee4.name}
                    </span>
                    <span
                      style={{
                        fontSize: "14px",
                        color: "black",
                        fontWeight: "bold",
                      }}
                    >
                      {formatScore(starEmployee4.score)}
                      {maxTotalScore > 0 && (
                        <span style={{ color: "#70829A", fontWeight: "normal" }}> / {maxTotalScore}</span>
                      )}
                    </span>
                  </div>
                </div>
                <div className="d-flex flex-row align-items-center gap-2 px-3 py-2 rounded-1"
                // style={{ background: "#EDF2F9" }}
                >
                  <div className="position-relative">
                    <img
                      src={starEmployee5.avatar}
                      alt="Avatar"
                      className="rounded-circle"
                      style={{ width: "56px", height: "56px" }}
                    />
                    <span className="position-absolute top-100 start-100 translate-middle badge rounded-pill">
                      <SVG
                        src={miscellaneousIcons.StarEmployeeRank5}
                        className="menu-svg-icon"
                        style={{ marginTop: "-20px", marginLeft: "-20px" }}
                      />
                    </span>
                  </div>
                  <div className="d-flex flex-column ms-2">
                    <span style={{ fontSize: "15px", color: "black" }}>
                      {starEmployee5.name}
                    </span>
                    <span
                      style={{
                        fontSize: "14px",
                        color: "black",
                        fontWeight: "bold",
                      }}
                    >
                      {formatScore(starEmployee5.score)}
                      {maxTotalScore > 0 && (
                        <span style={{ color: "#70829A", fontWeight: "normal" }}> / {maxTotalScore}</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CommonCard>
      </Row>
      <Modal show={showAllOverAllEmployeeByScore} onHide={() => setShowAllOverAllEmployeeByScore(false)}>
        <Modal.Body style={{ padding: "40px" }}>
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex flex-column">
              <div style={{ fontSize: "17px", fontWeight: "bold" }}>All Employees Ranking Overall</div>
            </div>
            <div className="d-flex flex-column">
              <div style={{ color: "#70829A", fontWeight: "16px" }}>Max Possible</div>
              <div className="my-2">{maxTotalScore > 0 ? maxTotalScore : formatScore(starEmployee1?.score || 0)}</div>
            </div>
          </div>
          <Table responsive style={{ marginTop: "20px", borderCollapse: "separate", borderSpacing: "0 10px" }}>
            <thead>
              <tr style={{ color: "#70829A", fontWeight: "16px" }}>
                <th>Rank</th>
                <th>Employee</th>
                <th>Employee Score</th>
              </tr>
            </thead>
            <tbody>
              {allEmployeesByScore?.map((employee: any, index: number) => {
                const bagColor = Number(employee?.score) > 0 ? "#EBFAE6" : "#FAE8E6";
                return (
                  <tr key={index} style={{ backgroundColor: "transparent" }}>
                    <td
                      // className="rounded-start"
                      style={{
                        borderTopLeftRadius: "10px",
                        borderBottomLeftRadius: "10px",
                        backgroundColor: bagColor,
                        fontSize: "14px",
                        fontWeight: "normal",
                        textAlign: "center",
                        padding: "12px 8px",
                        margin: "auto",
                        height: "100%"
                      }}
                    // className="d-flex align-items-center justify-content-center"
                    >
                      <span className="my-5" style={{ marginTop: "20px" }}>{index + 1}.</span>
                    </td>
                    <td style={{ backgroundColor: bagColor, padding: "12px 8px" }}>
                      <div className="d-flex flex-row align-items-center gap-2">
                        <div className="position-relative">
                          <img
                            src={employee?.avatar}
                            alt="Avatar"
                            className="rounded-circle"
                            style={{ width: "40px", height: "40px" }}
                          />
                          {index <= 2 && <span className="position-absolute top-100 start-100 translate-middle badge rounded-pill">
                            <SVG
                              src={index == 0 ? miscellaneousIcons.StarEmployeeRank1 : index == 1 ? miscellaneousIcons.StarEmployeeRank2 : miscellaneousIcons.StarEmployeeRank3}
                              className="menu-svg-icon"
                              style={{ marginTop: "-20px", marginLeft: "-20px" }}
                            />
                          </span>}
                        </div>

                        <div className="d-flex flex-column ms-2" style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                          <span style={{ fontSize: "15px", color: "black" }}>
                            {employee?.name}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td
                      style={{
                        borderTopRightRadius: "10px",
                        borderBottomRightRadius: "10px",
                        backgroundColor: bagColor,
                        fontSize: "14px",
                        fontWeight: "normal",
                        color: "black",
                        textAlign: "center",
                        padding: "12px 8px"
                      }}
                    >
                      {formatScore(employee?.score)}
                      {maxTotalScore > 0 && (
                        <span style={{ color: "#70829A" }}> / {maxTotalScore}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Modal.Body>
      </Modal>
      <Row>
        <CommonCard>
          <h3>Top Employees By Factors</h3>
          <Row className="gy-3 gx-2">
            {topEmployeeByModule?.length > 0 && overviewData?.map((item, index) => {
              const moduleName = item?.label.toLowerCase().trim();
              const topEmployee = topEmployeeByModule?.find((module: any) => module?.moduleName.toLowerCase().trim() === moduleName);
              const employee = topEmployee?.employees?.[0]?.employeeData;
              const scoreToShow = topEmployee?.employees?.[0]?.score;

              return (
                <Col
                  key={index}
                  xs={12}
                  sm={6}
                  md={4}
                // lg={3}  s
                >
                  <div
                    className="d-flex align-items-center justify-content-between"
                    style={{
                      backgroundColor: "#ffffff",
                      borderRadius: "8px",
                      border: "1.5px solid #D4DBE4",
                      padding: "12px",
                      height: "100%", // optional for equal height
                    }}
                  >
                    <div className="d-flex align-items-center gap-2" style={{ padding: "6px 8px" }}>
                      <img src={item.icon} alt={item.label} style={{ width: "20px", height: "20px" }} />
                      <span>{item.label}</span>
                    </div>
                    <div className="d-flex flex-row align-items-center gap-2">
                      <div className="position-relative">
                        <img
                          src={getEmployeeAvatar(employee?.employee?.avatar, employee?.employee?.gender || 0)}
                          alt="Avatar"
                          className="rounded-circle"
                          style={{ width: "40px", height: "40px" }}
                        />
                      </div>
                      <div className="d-flex flex-column ms-2">
                        <span style={{ fontSize: "12px", color: "black" }}>
                          {employee?.employee.firstName && employee?.employee.lastName
                            ? employee?.employee.firstName + " " + employee?.employee.lastName
                            : "-NA-"}
                        </span>
                        <span style={{ fontSize: "14px", color: "black" }}>
                          {Number(scoreToShow) > 0 ? `+${formatScore(scoreToShow)}` : Number(scoreToShow) < 0 ? `${formatScore(scoreToShow)}` : formatScore(0)}
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
      <Row className="">
         {/* <Accordion defaultActiveKey="0" className="mt-3">
            {topEmployeeByFactor?.map((item: any, index: number) => {

              const employeeData = item[1];
              // const moduleId =

              const moduleName = item[0];
              return (
                <Accordion.Item eventKey={index.toString()} key={moduleName}>
                  <Accordion.Header>
                    <strong>{moduleName}</strong>
                  </Accordion.Header>
                  <Accordion.Body>
                    <div className="table-responsive">
                      <Table responsive>
                    <thead>
                      <tr>
                        <th style={headerStyle}>Factors</th>
                        <th style={headerStyle}>1st</th>
                        <th style={headerStyle}>Score</th>
                        <th style={headerStyle}>2nd</th>
                        <th style={headerStyle}>Score</th>
                        <th style={headerStyle}>3rd</th>
                        <th style={headerStyle}>Score</th>
                        <th style={headerStyle}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employeeData.map((employee: any, index: number) => {
                        const employeeDetails = employee?.employee;
                        const employeeId = employee?.employeeId;
                        const employeeName =
                          employeeDetails?.firstName +
                          " " +
                          employeeDetails?.lastName;                          
                        const employeeScore = Number(employee?.score);
                        const employeeAvatar = employeeDetails?.avatar;                        
                        let firstEmployeeName = employee?.starEmployees[0]?.employee?.firstName && employee?.starEmployees[0]?.employee?.firstName!=undefined ? (`${employee?.starEmployees[0]?.employee?.firstName}`.slice(0, 1).toUpperCase() + `${employee?.starEmployees[0]?.employee?.firstName}`.slice(1)):"";
                        firstEmployeeName+=" "
                        firstEmployeeName += employee?.starEmployees[0]?.employee?.lastName && employee?.starEmployees[0]?.employee?.lastName!=undefined ? (`${employee?.starEmployees[0]?.employee?.lastName}`.slice(0, 1).toUpperCase() + `${employee?.starEmployees[0]?.employee?.lastName}`.slice(1)):"";                        
                        firstEmployeeName = !firstEmployeeName.trim() ? "-NA-" : firstEmployeeName;
                        const firstEmployeeScore = employee?.starEmployees[0]?.score || "-NA-";
                        let secondEmployeeName = (employee?.starEmployees[1]?.employee?.firstName && employee?.starEmployees[1]?.employee?.firstName!=undefined) ? `${employee?.starEmployees[1]?.employee?.firstName}`.slice(0, 1).toUpperCase() + `${employee?.starEmployees[1]?.employee?.firstName}`.slice(1):"";
                        secondEmployeeName+=" "
                        secondEmployeeName += (employee?.starEmployees[1]?.employee?.lastName && employee?.starEmployees[1]?.employee?.lastName!=undefined) ? `${employee?.starEmployees[1]?.employee?.lastName}`.slice(0, 1).toUpperCase() + `${employee?.starEmployees[1]?.employee?.lastName}`.slice(1):"";
                        secondEmployeeName = !secondEmployeeName.trim() ? "-NA-" : secondEmployeeName;
                        const secondEmployeeScore = employee?.starEmployees[1]?.score || "-NA-";
                        let thirdEmployeeName = (employee?.starEmployees[2]?.employee?.firstName && employee?.starEmployees[2]?.employee?.firstName!=undefined) ? `${employee?.starEmployees[2]?.employee?.firstName}`.slice(0, 1).toUpperCase() + `${employee?.starEmployees[2]?.employee?.firstName}`.slice(1):"";
                        thirdEmployeeName+=" "
                        thirdEmployeeName += (employee?.starEmployees[2]?.employee?.lastName && employee?.starEmployees[2]?.employee?.lastName!=undefined) ? `${employee?.starEmployees[2]?.employee?.lastName}`.slice(0, 1).toUpperCase() + `${employee?.starEmployees[2]?.employee?.lastName}`.slice(1):"";
                        thirdEmployeeName = !thirdEmployeeName.trim() ? "-NA-" : thirdEmployeeName;
                        const thirdEmployeeScore = employee?.starEmployees[2]?.score || "-NA-";

                        return (
                          <tr key={index}>
                            <td style={factorsStyle}>{employee.factorName}</td>
                            <td style={factorsStyle}>{firstEmployeeName}</td>
                            <td style={factorsStyle}>{firstEmployeeScore == "-NA-" ? <span>{firstEmployeeScore}</span> : Number(firstEmployeeScore) > 0 ? <span style={{ color: "#42A121" }}>+{firstEmployeeScore}</span> : <span style={{ color: "#B32828" }}>{firstEmployeeScore}</span>}</td>
                            <td style={factorsStyle}>{secondEmployeeName}</td>
                            <td style={factorsStyle}>{secondEmployeeScore == "-NA-" ? <span>{secondEmployeeScore}</span> : Number(secondEmployeeScore) > 0 ? <span style={{ color: "#42A121" }}>+{secondEmployeeScore}</span> : <span style={{ color: "#B32828" }}>{secondEmployeeScore}</span>}</td>
                            <td style={factorsStyle}>{thirdEmployeeName}</td>
                            <td style={factorsStyle}>{thirdEmployeeScore == "-NA-" ? <span>{thirdEmployeeScore}</span> : Number(thirdEmployeeScore) > 0 ? <span style={{ color: "#42A121" }}>+{thirdEmployeeScore}</span> : <span style={{ color: "#B32828" }}>{thirdEmployeeScore}</span>}</td>
                            <td style={{ ...factorsStyle, color: "#9D4141", cursor: "pointer" }} onClick={() => {
                              setShowAllStarEmployeesByAFactor(true)
                            // Get all star employee IDs
                            const starEmployeeIds = (employee?.starEmployees || []).map((se: any) => se.employeeId);
                            

                            // Find all employees not in starEmployees
                            const missingEmployees = (allemployees || []).filter(
                              (emp) => !starEmployeeIds.includes(emp.employeeId)
                            );

                            // Convert missing employees to starEmployee-like objects
                            const missingAsStarEmployees = missingEmployees.map((emp) => ({
                              employeeId: emp.employeeId,
                              value: "0",
                              score: "0",
                              module: null,
                              factor: null,
                              employee: {
                                id: emp.employeeId,
                                avatar: emp.avatar,
                                firstName: emp.employeeName?.split(" ")[0] || "",
                                lastName: emp.employeeName?.split(" ").slice(1).join(" ") || "",
                                gender: emp.gender,
                              },
                            }));

                            // Merge both arrays
                            const allStarEmployees = [
                              ...(employee?.starEmployees || []),
                              ...missingAsStarEmployees,
                            ];

                            // Sort based on factor type
                            const factorType = employee?.starEmployees?.[0]?.factor?.type;
                            const sortedEmployees = allStarEmployees.sort((a, b) => {
                              const scoreA = Number(a.score);
                              const scoreB = Number(b.score);

                              // For negative factors: ascending order (most negative first)
                              // For positive factors: descending order (highest first)
                              return factorType === "NEGATIVE"
                                ? scoreA - scoreB  // Ascending: -60, -50, -10
                                : scoreB - scoreA; // Descending: 100, 80, 60
                            });

                            setStarEmployeeDataByAFactor(sortedEmployees);
                            setStarEmployeeDataFactorName(employee?.factorName);

                            }}>View All</td>
                          </tr>
                        );
                      })}
                    </tbody>
                      </Table>
                    </div>
                  </Accordion.Body>
                </Accordion.Item>
              );
            })}
          </Accordion> */}
        <CommonCard>
          <h3>Star Employeess</h3>
          {/* <Accordion defaultActiveKey="0" className="mt-3">
            {topEmployeeByFactor?.map((item: any, index: number) => {

              const employeeData = item[1];
              // const moduleId =

              const moduleName = item[0];
              return (
                <Accordion.Item eventKey={index.toString()} key={moduleName}>
                  <Accordion.Header>
                    <strong>{moduleName}</strong>
                  </Accordion.Header>
                  <Accordion.Body>
                    <div className="table-responsive">
                      <Table responsive>
                    <thead>
                      <tr>
                        <th style={headerStyle}>Factors</th>
                        <th style={headerStyle}>1st</th>
                        <th style={headerStyle}>Score</th>
                        <th style={headerStyle}>2nd</th>
                        <th style={headerStyle}>Score</th>
                        <th style={headerStyle}>3rd</th>
                        <th style={headerStyle}>Score</th>
                        <th style={headerStyle}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employeeData.map((employee: any, index: number) => {
                        const employeeDetails = employee?.employee;
                        const employeeId = employee?.employeeId;
                        const employeeName =
                          employeeDetails?.firstName +
                          " " +
                          employeeDetails?.lastName;                          
                        const employeeScore = Number(employee?.score);
                        const employeeAvatar = employeeDetails?.avatar;                        
                        let firstEmployeeName = employee?.starEmployees[0]?.employee?.firstName && employee?.starEmployees[0]?.employee?.firstName!=undefined ? (`${employee?.starEmployees[0]?.employee?.firstName}`.slice(0, 1).toUpperCase() + `${employee?.starEmployees[0]?.employee?.firstName}`.slice(1)):"";
                        firstEmployeeName+=" "
                        firstEmployeeName += employee?.starEmployees[0]?.employee?.lastName && employee?.starEmployees[0]?.employee?.lastName!=undefined ? (`${employee?.starEmployees[0]?.employee?.lastName}`.slice(0, 1).toUpperCase() + `${employee?.starEmployees[0]?.employee?.lastName}`.slice(1)):"";                        
                        firstEmployeeName = !firstEmployeeName.trim() ? "-NA-" : firstEmployeeName;
                        const firstEmployeeScore = employee?.starEmployees[0]?.score || "-NA-";
                        let secondEmployeeName = (employee?.starEmployees[1]?.employee?.firstName && employee?.starEmployees[1]?.employee?.firstName!=undefined) ? `${employee?.starEmployees[1]?.employee?.firstName}`.slice(0, 1).toUpperCase() + `${employee?.starEmployees[1]?.employee?.firstName}`.slice(1):"";
                        secondEmployeeName+=" "
                        secondEmployeeName += (employee?.starEmployees[1]?.employee?.lastName && employee?.starEmployees[1]?.employee?.lastName!=undefined) ? `${employee?.starEmployees[1]?.employee?.lastName}`.slice(0, 1).toUpperCase() + `${employee?.starEmployees[1]?.employee?.lastName}`.slice(1):"";
                        secondEmployeeName = !secondEmployeeName.trim() ? "-NA-" : secondEmployeeName;
                        const secondEmployeeScore = employee?.starEmployees[1]?.score || "-NA-";
                        let thirdEmployeeName = (employee?.starEmployees[2]?.employee?.firstName && employee?.starEmployees[2]?.employee?.firstName!=undefined) ? `${employee?.starEmployees[2]?.employee?.firstName}`.slice(0, 1).toUpperCase() + `${employee?.starEmployees[2]?.employee?.firstName}`.slice(1):"";
                        thirdEmployeeName+=" "
                        thirdEmployeeName += (employee?.starEmployees[2]?.employee?.lastName && employee?.starEmployees[2]?.employee?.lastName!=undefined) ? `${employee?.starEmployees[2]?.employee?.lastName}`.slice(0, 1).toUpperCase() + `${employee?.starEmployees[2]?.employee?.lastName}`.slice(1):"";
                        thirdEmployeeName = !thirdEmployeeName.trim() ? "-NA-" : thirdEmployeeName;
                        const thirdEmployeeScore = employee?.starEmployees[2]?.score || "-NA-";

                        return (
                          <tr key={index}>
                            <td style={factorsStyle}>{employee.factorName}</td>
                            <td style={factorsStyle}>{firstEmployeeName}</td>
                            <td style={factorsStyle}>{firstEmployeeScore == "-NA-" ? <span>{firstEmployeeScore}</span> : Number(firstEmployeeScore) > 0 ? <span style={{ color: "#42A121" }}>+{firstEmployeeScore}</span> : <span style={{ color: "#B32828" }}>{firstEmployeeScore}</span>}</td>
                            <td style={factorsStyle}>{secondEmployeeName}</td>
                            <td style={factorsStyle}>{secondEmployeeScore == "-NA-" ? <span>{secondEmployeeScore}</span> : Number(secondEmployeeScore) > 0 ? <span style={{ color: "#42A121" }}>+{secondEmployeeScore}</span> : <span style={{ color: "#B32828" }}>{secondEmployeeScore}</span>}</td>
                            <td style={factorsStyle}>{thirdEmployeeName}</td>
                            <td style={factorsStyle}>{thirdEmployeeScore == "-NA-" ? <span>{thirdEmployeeScore}</span> : Number(thirdEmployeeScore) > 0 ? <span style={{ color: "#42A121" }}>+{thirdEmployeeScore}</span> : <span style={{ color: "#B32828" }}>{thirdEmployeeScore}</span>}</td>
                            <td style={{ ...factorsStyle, color: "#9D4141", cursor: "pointer" }} onClick={() => {
                              setShowAllStarEmployeesByAFactor(true)
                            // Get all star employee IDs
                            const starEmployeeIds = (employee?.starEmployees || []).map((se: any) => se.employeeId);
                            

                            // Find all employees not in starEmployees
                            const missingEmployees = (allemployees || []).filter(
                              (emp) => !starEmployeeIds.includes(emp.employeeId)
                            );

                            // Convert missing employees to starEmployee-like objects
                            const missingAsStarEmployees = missingEmployees.map((emp) => ({
                              employeeId: emp.employeeId,
                              value: "0",
                              score: "0",
                              module: null,
                              factor: null,
                              employee: {
                                id: emp.employeeId,
                                avatar: emp.avatar,
                                firstName: emp.employeeName?.split(" ")[0] || "",
                                lastName: emp.employeeName?.split(" ").slice(1).join(" ") || "",
                                gender: emp.gender,
                              },
                            }));

                            // Merge both arrays
                            const allStarEmployees = [
                              ...(employee?.starEmployees || []),
                              ...missingAsStarEmployees,
                            ];

                            // Sort based on factor type
                            const factorType = employee?.starEmployees?.[0]?.factor?.type;
                            const sortedEmployees = allStarEmployees.sort((a, b) => {
                              const scoreA = Number(a.score);
                              const scoreB = Number(b.score);

                              // For negative factors: ascending order (most negative first)
                              // For positive factors: descending order (highest first)
                              return factorType === "NEGATIVE"
                                ? scoreA - scoreB  // Ascending: -60, -50, -10
                                : scoreB - scoreA; // Descending: 100, 80, 60
                            });

                            setStarEmployeeDataByAFactor(sortedEmployees);
                            setStarEmployeeDataFactorName(employee?.factorName);

                            }}>View All</td>
                          </tr>
                        );
                      })}
                    </tbody>
                      </Table>
                    </div>
                  </Accordion.Body>
                </Accordion.Item>
              );
            })}
          </Accordion> */}


          {/* <Accordion defaultActiveKey="0" className="mt-3"> */}
          {topEmployeeByFactor?.map((item: any, index: number) => {

            const employeeData = item[1];
            // const moduleId =

            const moduleName = item[0];
            return (
              <>
                <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: 40, height: 40, background: "red", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#E4E7EB" }}>
                    {
                      moduleName === "Attendance" ? (
                        <div>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <g clipPath="url(#clip0_15710_47268)">
                              <path
                                d="M19.5 3.75H4.5C4.08579 3.75 3.75 4.08579 3.75 4.5V19.5C3.75 19.9142 4.08579 20.25 4.5 20.25H19.5C19.9142 20.25 20.25 19.9142 20.25 19.5V4.5C20.25 4.08579 19.9142 3.75 19.5 3.75Z"
                                stroke="#6C6F74"
                                style={{
                                  stroke: "color(display-p3 0.4216 0.4370 0.4567)",
                                  strokeOpacity: 1,
                                }}
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M16.5 2.25V5.25"
                                stroke="#6C6F74"
                                style={{
                                  stroke: "color(display-p3 0.4216 0.4370 0.4567)",
                                  strokeOpacity: 1,
                                }}
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M7.5 2.25V5.25"
                                stroke="#6C6F74"
                                style={{
                                  stroke: "color(display-p3 0.4216 0.4370 0.4567)",
                                  strokeOpacity: 1,
                                }}
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M3.75 8.25H20.25"
                                stroke="#6C6F74"
                                style={{
                                  stroke: "color(display-p3 0.4216 0.4370 0.4567)",
                                  strokeOpacity: 1,
                                }}
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M8.625 14.25L10.875 16.5L15.375 12"
                                stroke="#6C6F74"
                                style={{
                                  stroke: "color(display-p3 0.4216 0.4370 0.4567)",
                                  strokeOpacity: 1,
                                }}
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </g>

                            <defs>
                              <clipPath id="clip0_15710_47268">
                                <rect
                                  width="24"
                                  height="24"
                                  fill="white"
                                  style={{ fill: "white", fillOpacity: 1 }}
                                />
                              </clipPath>
                            </defs>
                          </svg>
                        </div>
                      ) : (
                        <div>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <g clipPath="url(#clip0_15710_47285)">
                              <path
                                d="M11.9992 5.25L14.9992 4.5C14.9992 4.5 17.4817 8.37656 18.6461 12.7228C18.7497 13.1039 18.777 13.5016 18.7265 13.8933C18.676 14.2849 18.5487 14.6627 18.3518 15.005C18.155 15.3474 17.8925 15.6475 17.5794 15.8881C17.2663 16.1288 16.9088 16.3052 16.5274 16.4074C16.1459 16.5096 15.7481 16.5355 15.3566 16.4835C14.9652 16.4316 14.5878 16.3029 14.2462 16.1048C13.9046 15.9067 13.6055 15.6432 13.366 15.3292C13.1265 15.0153 12.9513 14.6571 12.8505 14.2753C11.6861 9.92906 11.9992 5.25 11.9992 5.25Z"
                                stroke="#6C6F74"
                                style={{
                                  stroke: "color(display-p3 0.4216 0.4370 0.4567)",
                                  strokeOpacity: 1,
                                }}
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />

                              <path
                                d="M16.5254 16.3965L17.8716 21.4187"
                                stroke="#6C6F74"
                                style={{
                                  stroke: "color(display-p3 0.4216 0.4370 0.4567)",
                                  strokeOpacity: 1,
                                }}
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />

                              <path
                                d="M20.25 20.7812L15.75 21.9869"
                                stroke="#6C6F74"
                                style={{
                                  stroke: "color(display-p3 0.4216 0.4370 0.4567)",
                                  strokeOpacity: 1,
                                }}
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />

                              <path
                                d="M11.9999 3L8.99993 2.25C8.99993 2.25 6.51743 6.12656 5.35305 10.4728C5.24949 10.8539 5.22218 11.2516 5.27268 11.6433C5.32319 12.0349 5.45051 12.4127 5.64736 12.755C5.8442 13.0974 6.10669 13.3975 6.41977 13.6381C6.73285 13.8788 7.09036 14.0552 7.47179 14.1574C7.85323 14.2596 8.25108 14.2855 8.64253 14.2335C9.03399 14.1816 9.41134 14.0529 9.75294 13.8548C10.0945 13.6567 10.3937 13.3932 10.6332 13.0792C10.8727 12.7653 11.0479 12.4071 11.1487 12.0253C12.2146 7.66875 11.9999 3 11.9999 3Z"
                                stroke="#6C6F74"
                                style={{
                                  stroke: "color(display-p3 0.4216 0.4370 0.4567)",
                                  strokeOpacity: 1,
                                }}
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />

                              <path
                                d="M7.47516 14.1465L6.12891 19.1687"
                                stroke="#6C6F74"
                                style={{
                                  stroke: "color(display-p3 0.4216 0.4370 0.4567)",
                                  strokeOpacity: 1,
                                }}
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />

                              <path
                                d="M3.75 18.5312L8.25 19.7369"
                                stroke="#6C6F74"
                                style={{
                                  stroke: "color(display-p3 0.4216 0.4370 0.4567)",
                                  strokeOpacity: 1,
                                }}
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />

                              <path
                                d="M12.0469 9.17625L16.8703 7.96875"
                                stroke="#6C6F74"
                                style={{
                                  stroke: "color(display-p3 0.4216 0.4370 0.4567)",
                                  strokeOpacity: 1,
                                }}
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />

                              <path
                                d="M11.8987 7.09992L7.05273 5.88867"
                                stroke="#6C6F74"
                                style={{
                                  stroke: "color(display-p3 0.4216 0.4370 0.4567)",
                                  strokeOpacity: 1,
                                }}
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />

                              <path
                                d="M18 3.75L19.5 3"
                                stroke="#6C6F74"
                                style={{
                                  stroke: "color(display-p3 0.4216 0.4370 0.4567)",
                                  strokeOpacity: 1,
                                }}
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />

                              <path
                                d="M19.5 6.75H21"
                                stroke="#6C6F74"
                                style={{
                                  stroke: "color(display-p3 0.4216 0.4370 0.4567)",
                                  strokeOpacity: 1,
                                }}
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />

                              <path
                                d="M5.25 3L3.75 2.25"
                                stroke="#6C6F74"
                                style={{
                                  stroke: "color(display-p3 0.4216 0.4370 0.4567)",
                                  strokeOpacity: 1,
                                }}
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />

                              <path
                                d="M3.75 6H2.25"
                                stroke="#6C6F74"
                                style={{
                                  stroke: "color(display-p3 0.4216 0.4370 0.4567)",
                                  strokeOpacity: 1,
                                }}
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </g>

                            <defs>
                              <clipPath id="clip0_15710_47285">
                                <rect
                                  width="24"
                                  height="24"
                                  fill="white"
                                  style={{ fill: "white", fillOpacity: 1 }}
                                />
                              </clipPath>
                            </defs>
                          </svg>

                        </div>
                      )
                    }


                  </div>
                  <h4 style={{
                    color: "#000",
                    fontFamily: "Barlow",
                    fontSize: "19px",
                    fontStyle: "normal",
                    fontWeight: 600,
                    lineHeight: "normal",
                    letterSpacing: "0.19px",
                    margin: "20px 0"
                  }}>{moduleName}</h4>
                </div>

                <div className="">

                  {/* <div>
                      <tr>
                        <th style={headerStyle}>Factors</th>
                        <th style={headerStyle}>1st</th>
                        <th style={headerStyle}>Score</th>
                        <th style={headerStyle}>2nd</th>
                        <th style={headerStyle}>Score</th>
                        <th style={headerStyle}>3rd</th>
                        <th style={headerStyle}>Score</th>
                        <th style={headerStyle}>Action</th>
                      </tr>
                    </div> */}
                  <div>
                    {employeeData.map((employee: any, index: number) => {
                      // Get all star employee IDs
                      const starEmployeeIds = (employee?.starEmployees || []).map((se: any) => se.employeeId);

                      // Find all employees not in starEmployees
                      const missingEmployees = (allemployees || []).filter(
                        (emp) => !starEmployeeIds.includes(emp.employeeId)
                      );

                      // Convert missing employees to starEmployee-like objects
                      const missingAsStarEmployees = missingEmployees.map((emp) => ({
                        employeeId: emp.employeeId,
                        value: "0",
                        score: "0",
                        module: null,
                        factor: employee?.starEmployees?.[0]?.factor || null,
                        employee: {
                          id: emp.employeeId,
                          avatar: emp.avatar,
                          firstName: emp.employeeName?.split(" ")[0] || "",
                          lastName: emp.employeeName?.split(" ").slice(1).join(" ") || "",
                          gender: emp.gender,
                        },
                      }));

                      // Merge both arrays
                      const allStarEmployees = [
                        ...(employee?.starEmployees || []),
                        ...missingAsStarEmployees,
                      ];

                      // Sort allStarEmployees based on factor type
                      const sortedStarEmployees = [...allStarEmployees].sort((a, b) => {
                        const scoreA = Number(a.score);
                        const scoreB = Number(b.score);

                        // For negative factors: ascending order (most negative first)
                        // For positive factors: descending order (highest first)
                        return employee?.starEmployees?.[0]?.factor?.type === "NEGATIVE"
                          ? scoreA - scoreB  // Ascending: -60, -50, -10
                          : scoreB - scoreA; // Descending: 100, 80, 60
                      });

                      const employeeDetails = employee?.employee;
                      const employeeId = employee?.employeeId;
                      const employeeName =
                        employeeDetails?.firstName +
                        " " +
                        employeeDetails?.lastName;
                      const employeeScore = Number(employee?.score);
                      const employeeAvatar = employeeDetails?.avatar;
                      let firstEmployeeName = sortedStarEmployees[0]?.employee?.firstName && sortedStarEmployees[0]?.employee?.firstName != undefined ? (`${sortedStarEmployees[0]?.employee?.firstName}`.slice(0, 1).toUpperCase() + `${sortedStarEmployees[0]?.employee?.firstName}`.slice(1)) : "";
                      firstEmployeeName += " "
                      firstEmployeeName += sortedStarEmployees[0]?.employee?.lastName && sortedStarEmployees[0]?.employee?.lastName != undefined ? (`${sortedStarEmployees[0]?.employee?.lastName}`.slice(0, 1).toUpperCase() + `${sortedStarEmployees[0]?.employee?.lastName}`.slice(1)) : "";
                      firstEmployeeName = !firstEmployeeName.trim() ? "-NA-" : firstEmployeeName;
                      const firstEmployeeScore = sortedStarEmployees[0]?.score || "-NA-";
                      let secondEmployeeName = (sortedStarEmployees[1]?.employee?.firstName && sortedStarEmployees[1]?.employee?.firstName != undefined) ? `${sortedStarEmployees[1]?.employee?.firstName}`.slice(0, 1).toUpperCase() + `${sortedStarEmployees[1]?.employee?.firstName}`.slice(1) : "";
                      secondEmployeeName += " "
                      secondEmployeeName += (sortedStarEmployees[1]?.employee?.lastName && sortedStarEmployees[1]?.employee?.lastName != undefined) ? `${sortedStarEmployees[1]?.employee?.lastName}`.slice(0, 1).toUpperCase() + `${sortedStarEmployees[1]?.employee?.lastName}`.slice(1) : "";
                      secondEmployeeName = !secondEmployeeName.trim() ? "-NA-" : secondEmployeeName;
                      const secondEmployeeScore = sortedStarEmployees[1]?.score || "-NA-";
                      let thirdEmployeeName = (sortedStarEmployees[2]?.employee?.firstName && sortedStarEmployees[2]?.employee?.firstName != undefined) ? `${sortedStarEmployees[2]?.employee?.firstName}`.slice(0, 1).toUpperCase() + `${sortedStarEmployees[2]?.employee?.firstName}`.slice(1) : "";
                      thirdEmployeeName += " "
                      thirdEmployeeName += (sortedStarEmployees[2]?.employee?.lastName && sortedStarEmployees[2]?.employee?.lastName != undefined) ? `${sortedStarEmployees[2]?.employee?.lastName}`.slice(0, 1).toUpperCase() + `${sortedStarEmployees[2]?.employee?.lastName}`.slice(1) : "";
                      thirdEmployeeName = !thirdEmployeeName.trim() ? "-NA-" : thirdEmployeeName;
                      const thirdEmployeeScore = sortedStarEmployees[2]?.score || "-NA-";

                      return (
                        <div key={index} style={{ marginBottom: "20px" }}>
                          {/* Factor Card */}
                          <div style={{
                            // background: employee?.factor?.type === "NEGATIVE" ? "#fbecec" : "#eaf3de",
                               background: employee?.starEmployees?.[0]?.factor?.type === "NEGATIVE" ? "#fbecec" : "#eaf3de",
                            padding: "20px 28px",
                            borderRadius: "12px",
                            boxShadow: "8px 8px 16px 0px rgba(0,0,0,0.04)"
                          }}>
                            {/* Factor Name and Description */}
                            <div style={{ marginBottom: "16px" }}>
                              <div style={{
                                color: "#000",
                                fontFamily: "Barlow",
                                fontSize: "16px",
                                fontStyle: "normal",
                                fontWeight: 600,
                                lineHeight: "normal",
                                letterSpacing: "0.16px",
                              }}>
                                {employee.factorName}
                              </div>
                              {/* <div style={{
                                color: "#999999",
                                fontFamily: "Inter",
                                fontSize: "12px",
                                fontWeight: 400,
                                lineHeight: "1.24",
                                letterSpacing: "-0.228px",
                                marginTop: "8px"
                              }}>
                                Lorem Ipsum
                              </div> */}
                            </div>

                            {/* Employee Cards Row */}
                            <div style={{
                              display: "flex",
                              flexDirection: "row",
                              gap: "16px",
                              alignItems: "center",
                              overflowX: "auto",
                              overflowY: "hidden",
                              minHeight: "80px",
                            }} className="no-scrollbar">
                              {/* 1st Place */}
                              <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: "150px", flexShrink: 0 }}>
                                <div className="position-relative" style={{ flexShrink: 0 }}>
                                  <img
                                    src={getEmployeeAvatar(sortedStarEmployees[0]?.employee?.avatar || "", sortedStarEmployees[0]?.employee?.gender || 0)}
                                    alt="Avatar"
                                    className="rounded-circle"
                                    style={{ width: "56px", height: "56px" }}
                                  />
                                  <div style={{
                                    position: "absolute",
                                    bottom: "-4.5px",
                                    left: "32px",
                                    background: "#2bb07b",
                                    borderRadius: "32px",
                                    width: "28px",
                                    height: "28px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                  }}>
                                    <span style={{
                                      fontFamily: "Inter",
                                      fontSize: "13px",
                                      fontWeight: 600,
                                      color: "white",
                                      whiteSpace: "nowrap"
                                    }}>1<span style={{ fontSize: "10px" }}>st</span></span>
                                  </div>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                  <div style={{
                                    color: "#000",
                                    fontFamily: "Inter",
                                    fontSize: "15px",
                                    fontWeight: 400,
                                    lineHeight: "1.24",
                                    letterSpacing: "-0.285px",
                                    whiteSpace: "nowrap"
                                  }}>{firstEmployeeName} </div>
                                  <div style={{
                                    color: "#000",
                                    fontFamily: "Inter",
                                    fontSize: "14px",
                                    fontWeight: 500,
                                    whiteSpace: "nowrap"
                                  }}>
                                    {formatScore(firstEmployeeScore)}
                                    {maxTotalScore > 0 && (
                                      <span style={{ color: "#70829A", fontWeight: "normal" }}> / {maxTotalScore}</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* 2nd Place */}
                              <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: "150px", flexShrink: 0 }}>
                                <div className="position-relative" style={{ flexShrink: 0 }}>
                                  <img
                                    src={getEmployeeAvatar(sortedStarEmployees[1]?.employee?.avatar || "", sortedStarEmployees[1]?.employee?.gender || 0)}
                                    alt="Avatar"
                                    className="rounded-circle"
                                    style={{ width: "56px", height: "56px" }}
                                  />
                                  <div style={{
                                    position: "absolute",
                                    bottom: "-4px",
                                    left: "31.6px",
                                    background: "#b58320",
                                    borderRadius: "32px",
                                    width: "28px",
                                    height: "28px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                  }}>
                                    <span style={{
                                      fontFamily: "Inter",
                                      fontSize: "13px",
                                      fontWeight: 600,
                                      color: "white",
                                      whiteSpace: "nowrap"
                                    }}>2<span style={{ fontSize: "10px" }}>nd</span></span>
                                  </div>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                  <div style={{
                                    color: "#000",
                                    fontFamily: "Inter",
                                    fontSize: "15px",
                                    fontWeight: 400,
                                    lineHeight: "1.24",
                                    letterSpacing: "-0.285px",
                                    whiteSpace: "nowrap"
                                  }}>{secondEmployeeName}</div>
                                  <div style={{
                                    color: "#000",
                                    fontFamily: "Inter",
                                    fontSize: "14px",
                                    fontWeight: 500,
                                    whiteSpace: "nowrap"
                                  }}>
                                    {formatScore(secondEmployeeScore)}
                                    {maxTotalScore > 0 && (
                                      <span style={{ color: "#70829A", fontWeight: "normal" }}> / {maxTotalScore}</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* 3rd Place */}
                              <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: "150px", flexShrink: 0 }}>
                                <div className="position-relative" style={{ flexShrink: 0 }}>
                                  <img
                                    src={getEmployeeAvatar(sortedStarEmployees[2]?.employee?.avatar || "", sortedStarEmployees[2]?.employee?.gender || 0)}
                                    alt="Avatar"
                                    className="rounded-circle"
                                    style={{ width: "56px", height: "56px" }}
                                  />
                                  <div style={{
                                    position: "absolute",
                                    bottom: "-4px",
                                    left: "32.2px",
                                    background: "#7959db",
                                    borderRadius: "32px",
                                    width: "28px",
                                    height: "28px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                  }}>
                                    <span style={{
                                      fontFamily: "Inter",
                                      fontSize: "13px",
                                      fontWeight: 600,
                                      color: "white",
                                      whiteSpace: "nowrap"
                                    }}>3<span style={{ fontSize: "10px" }}>rd</span></span>
                                  </div>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                  <div style={{
                                    color: "#000",
                                    fontFamily: "Inter",
                                    fontSize: "15px",
                                    fontWeight: 400,
                                    lineHeight: "1.24",
                                    letterSpacing: "-0.285px",
                                    whiteSpace: "nowrap"
                                  }}>{thirdEmployeeName}</div>
                                  <div style={{
                                    color: "#000",
                                    fontFamily: "Inter",
                                    fontSize: "14px",
                                    fontWeight: 500,
                                    whiteSpace: "nowrap"
                                  }}>
                                    {formatScore(thirdEmployeeScore)}
                                    {maxTotalScore > 0 && (
                                      <span style={{ color: "#70829A", fontWeight: "normal" }}> / {maxTotalScore}</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* 4th Place */}
                              <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: "150px", flexShrink: 0 }}>
                                <div className="position-relative" style={{ flexShrink: 0 }}>
                                  <img
                                    src={getEmployeeAvatar(sortedStarEmployees[3]?.employee?.avatar || "", sortedStarEmployees[3]?.employee?.gender || 0)}
                                    alt="Avatar"
                                    className="rounded-circle"
                                    style={{ width: "56px", height: "56px" }}
                                  />
                                  <div style={{
                                    position: "absolute",
                                    bottom: "-4px",
                                    left: "31.8px",
                                    background: "#717171",
                                    borderRadius: "32px",
                                    width: "28px",
                                    height: "28px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                  }}>
                                    <span style={{
                                      fontFamily: "Inter",
                                      fontSize: "13px",
                                      fontWeight: 600,
                                      color: "white",
                                      whiteSpace: "nowrap"
                                    }}>4<span style={{ fontSize: "10px" }}>th</span></span>
                                  </div>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                  <div style={{
                                    color: "#000",
                                    fontFamily: "Inter",
                                    fontSize: "15px",
                                    fontWeight: 400,
                                    lineHeight: "1.24",
                                    letterSpacing: "-0.285px",
                                    whiteSpace: "nowrap"
                                  }}>
                                    {sortedStarEmployees[3]?.employee?.firstName && sortedStarEmployees[3]?.employee?.lastName
                                      ? `${sortedStarEmployees[3].employee.firstName} ${sortedStarEmployees[3].employee.lastName}`
                                      : "-NA-"}
                                  </div>
                                  <div style={{
                                    color: "#000",
                                    fontFamily: "Inter",
                                    fontSize: "14px",
                                    fontWeight: 500,
                                    whiteSpace: "nowrap"
                                  }}>
                                    {formatScore(sortedStarEmployees[3]?.score)}
                                    {maxTotalScore > 0 && (
                                      <span style={{ color: "#70829A", fontWeight: "normal" }}> / {maxTotalScore}</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* 5th Place */}
                              <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: "150px", flexShrink: 0 }}>
                                <div className="position-relative" style={{ flexShrink: 0 }}>
                                  <img
                                    src={getEmployeeAvatar(sortedStarEmployees[4]?.employee?.avatar || "", sortedStarEmployees[4]?.employee?.gender || 0)}
                                    alt="Avatar"
                                    className="rounded-circle"
                                    style={{ width: "56px", height: "56px" }}
                                  />
                                  <div style={{
                                    position: "absolute",
                                    bottom: "-4px",
                                    left: "32.4px",
                                    background: "#717171",
                                    borderRadius: "32px",
                                    width: "28px",
                                    height: "28px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                  }}>
                                    <span style={{
                                      fontFamily: "Inter",
                                      fontSize: "13px",
                                      fontWeight: 600,
                                      color: "white",
                                      whiteSpace: "nowrap"
                                    }}>5<span style={{ fontSize: "10px" }}>th</span></span>
                                  </div>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                  <div style={{
                                    color: "#000",
                                    fontFamily: "Inter",
                                    fontSize: "15px",
                                    fontWeight: 400,
                                    lineHeight: "1.24",
                                    letterSpacing: "-0.285px",
                                    whiteSpace: "nowrap"
                                  }}>
                                    {sortedStarEmployees[4]?.employee?.firstName && sortedStarEmployees[4]?.employee?.lastName
                                      ? `${sortedStarEmployees[4].employee.firstName} ${sortedStarEmployees[4].employee.lastName}`
                                      : "-NA-"}
                                  </div>
                                  <div style={{
                                    color: "#000",
                                    fontFamily: "Inter",
                                    fontSize: "14px",
                                    fontWeight: 500,
                                    whiteSpace: "nowrap"
                                  }}>
                                    {formatScore(sortedStarEmployees[4]?.score)}
                                    {maxTotalScore > 0 && (
                                      <span style={{ color: "#70829A", fontWeight: "normal" }}> / {maxTotalScore}</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* View All Button */}
                              <button
                                className="btn btn-link"
                                style={{
                                  color: "#9D4141",
                                  cursor: "pointer",
                                  textDecoration: "none",
                                  fontSize: "14px",
                                  fontWeight: 500,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  padding: "4px 8px",
                                  flexShrink: 0
                                }}
                                onClick={() => {
                                  setShowAllStarEmployeesByAFactor(true);
                                  // Get all star employee IDs
                                  const starEmployeeIds = (employee?.starEmployees || []).map((se: any) => se.employeeId);

                                  // Find all employees not in starEmployees
                                  const missingEmployees = (allemployees || []).filter(
                                    (emp) => !starEmployeeIds.includes(emp.employeeId)
                                  );

                                  // Convert missing employees to starEmployee-like objects
                                  const missingAsStarEmployees = missingEmployees.map((emp) => ({
                                    employeeId: emp.employeeId,
                                    value: "0",
                                    score: "0",
                                    module: null,
                                    factor: null,
                                    employee: {
                                      id: emp.employeeId,
                                      avatar: emp.avatar,
                                      firstName: emp.employeeName?.split(" ")[0] || "",
                                      lastName: emp.employeeName?.split(" ").slice(1).join(" ") || "",
                                      gender: emp.gender,
                                    },
                                  }));

                                  // Merge both arrays
                                  const allStarEmployees = [
                                    ...(employee?.starEmployees || []),
                                    ...missingAsStarEmployees,
                                  ];

                                  // Sort based on factor type
                                  const factorType = employee?.starEmployees?.[0]?.factor?.type;
                                  const sortedEmployees = allStarEmployees.sort((a, b) => {
                                    const scoreA = Number(a.score);
                                    const scoreB = Number(b.score);

                                    // For negative factors: ascending order (most negative first)
                                    // For positive factors: descending order (highest first)
                                    return factorType === "NEGATIVE"
                                      ? scoreA - scoreB  // Ascending: -60, -50, -10
                                      : scoreB - scoreA; // Descending: 100, 80, 60
                                  });

                                  setStarEmployeeDataByAFactor(sortedEmployees);
                                  setStarEmployeeDataFactorName(employee?.factorName);
                                }}
                              >
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M8 4V12M4 8H12" stroke="#9D4141" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                View All
                              </button>
                            </div>
                          </div>
                        </div>


                      );
                    })}
                  </div>
                </div>

              </>
            );
          })}
        </CommonCard>
      </Row>
      <Modal show={showAllStarEmployeesByAFactor} onHide={() => setShowAllStarEmployeesByAFactor(false)}>
        <Modal.Body style={{ padding: "40px" }}>
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex flex-column">
              <div style={{ fontSize: "20px", fontWeight: "bold" }}>Star Employees</div>
              <div style={{ fontSize: "16px", fontWeight: "bold" }} className="my-2">{starEmployeeDataFactorName}</div>
            </div>
            <div className="d-flex flex-column">
              {/* <div style={{ color: "#70829A", fontWeight: "16px" }}>Max Value</div> */}
              {/* <div className="my-2">{formatScore(starEmployeeDataByAFactor?.[0]?.score)}</div> */}
            </div>
          </div>
          <Table responsive style={{ marginTop: "20px", borderCollapse: "separate", borderSpacing: "0 10px" }}>
            <thead>
              <tr style={{ color: "#70829A", fontWeight: "16px" }}>
                <th>Rank</th>
                <th>Employee</th>
                <th>Employee Score</th>
              </tr>
            </thead>

            <tbody>
              {starEmployeeDataByAFactor?.map((employee: any, index: number) => {
                // const bagColor = index == 0 || index == 1 || index == 2 ? "#EBFAE6" : "#FAE8E6";
                const bagColor = Number(employee?.score) > 0 ? "#EBFAE6" : "#FAE8E6";

                return (
                  <tr key={index} style={{ backgroundColor: "transparent" }}>
                    <td
                      // className="rounded-start"
                      style={{
                        borderTopLeftRadius: "10px",
                        borderBottomLeftRadius: "10px",
                        backgroundColor: bagColor,
                        fontSize: "14px",
                        fontWeight: "normal",
                        textAlign: "center",
                        padding: "12px 8px",
                        margin: "auto",
                        height: "100%"
                      }}
                    // className="d-flex align-items-center justify-content-center"
                    >
                      <span className="my-5" style={{ marginTop: "20px" }}>{index + 1}.</span>
                    </td>
                    <td style={{ backgroundColor: bagColor, padding: "12px 8px" }}>
                      <div className="d-flex flex-row align-items-center gap-2">
                        <div className="position-relative">
                          <img
                            src={getEmployeeAvatar(employee?.employee?.avatar || "", employee?.employee?.gender || 0)}
                            alt="Avatar"
                            className="rounded-circle"
                            style={{ width: "40px", height: "40px" }}
                          />
                          {index <= 2 && <span className="position-absolute top-100 start-100 translate-middle badge rounded-pill">
                            <SVG
                              src={index == 0 ? miscellaneousIcons.StarEmployeeRank1 : index == 1 ? miscellaneousIcons.StarEmployeeRank2 : miscellaneousIcons.StarEmployeeRank3}
                              className="menu-svg-icon"
                              style={{ marginTop: "-20px", marginLeft: "-20px" }}
                            />
                          </span>}
                        </div>

                        <div className="d-flex flex-column ms-2" style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                          <span style={{ fontSize: "15px", color: "black" }}>
                            {employee?.employee.firstName + " " + employee?.employee.lastName}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td
                      style={{
                        borderTopRightRadius: "10px",
                        borderBottomRightRadius: "10px",
                        backgroundColor: bagColor,
                        fontSize: "14px",
                        fontWeight: "normal",
                        color: "black",
                        textAlign: "center",
                        padding: "12px 8px"
                      }}
                    >
                      {formatScore(employee?.score)}
                      {maxTotalScore > 0 && (
                        <span style={{ color: "#70829A", fontWeight: "normal" }}> / {maxTotalScore}</span>
                      )}
                    </td>
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

export default LeaderBoardCore