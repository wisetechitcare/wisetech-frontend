import { useEffect, useState } from "react";
import { Modal, Button, Container, OverlayTrigger, Tooltip as RBTooltip } from "react-bootstrap";
import { KTIcon } from "@metronic/helpers";
import { kpiAttendanceIcons } from "@metronic/assets/sidepanelicons";
import { getAllKpiFactors, updateKpiFactors, getAllKpiModules } from "@services/employee";
import { successConfirmation, errorConfirmation } from "@utils/modal";
import { KPI_Module_Name, permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";
import TextInput from "@app/modules/common/inputs/TextInput";
import RadioInput from "@app/modules/common/inputs/RadioInput";
import { Formik, Form as FormikForm, useFormikContext } from "formik";
import * as Yup from "yup";
import { hasPermission } from "@utils/authAbac";
import { useSelector } from "react-redux";

// 1. Validation schema
const validationSchema = Yup.object({
  type: Yup.string().required("Type is required"),
  point: Yup.number().required("Weightage point is required"),
});

// 2. Tooltip descriptions keyed by factor name
const tooltipDescriptions = {
  // Attendance factors
  "Working Days":
    "Days when employee completed both check-in and check-out.\n\n" +
    "📊 Calculation:\n" +
    "• Created: At checkout\n" +
    "• Value: 1 day\n" +
    "• Score: Value × Weightage",

  "Total Working Hour":
    "Total hours worked between check-in and check-out.\n\n" +
    "📊 Calculation:\n" +
    "• Created: At checkout\n" +
    "• Hours = Round(Checkout - Checkin)\n" +
    "• Score: Hours × Weightage",

  "Over Time":
    "Extra hours worked beyond expected working hours.\n\n" +
    "📊 Calculation:\n" +
    "• Created: At checkout (if overtime exists)\n" +
    "• Expected Hours: From day-wise shift (or app settings as fallback)\n" +
    "• Extra Minutes = Actual Minutes - Expected Minutes\n" +
    "• Extra Hours = Extra Minutes ÷ 60 (only if positive)\n" +
    "• Score: Extra Hours × Weightage\n" +
    "• Example: 8.5 hrs worked - 8 hrs expected = 0.5 hrs overtime",

  "On Time Attendance Days":
    "Days when employee checked in on time (within grace period).\n\n" +
    "📊 Calculation:\n" +
    "• Created: At check-in (if on time)\n" +
    "• Expected Time: From day-wise shift (or app settings as fallback)\n" +
    "• Grace Time: Global setting (same for all days)\n" +
    "• Condition: Check-in ≤ (Expected Time + Grace)\n" +
    "• Value: 1 day\n" +
    "• Score: Value × Weightage",

  "Late Attendance Days":
    "Days when employee checked in after grace period.\n\n" +
    "📊 Calculation:\n" +
    "• Created: At check-in (if late)\n" +
    "• Expected Time: From day-wise shift (or app settings as fallback)\n" +
    "• Grace Time: Global setting\n" +
    "• Condition: Check-in > (Expected Time + Grace)\n" +
    "• Value: 1 day\n" +
    "• Score: Value × Weightage × (-1)",

  "Total Late Hours":
    "Total hours employee was late across all late check-ins.\n\n" +
    "📊 Calculation:\n" +
    "• Created: At check-in (if late)\n" +
    "• Expected Time: From day-wise shift (or app settings as fallback)\n" +
    "• Late Minutes = Actual - (Expected + Grace)\n" +
    "• Late Hours = Late Minutes ÷ 60\n" +
    "• Score: Late Hours × Weightage × (-1)\n" +
    "• Example: 15 min late = 0.25 hours",

  "Absent Days":
    "Days when employee was absent without approved leave.\n\n" +
    "📊 Calculation:\n" +
    "• Created: Next day at check-in\n" +
    "• Checks yesterday's attendance\n" +
    "• Condition: No check-in OR no checkout\n" +
    "• AND: Not a holiday/weekend\n" +
    "• AND: No approved leave\n" +
    "• Score: 1 × Weightage × (-1)",

  "Attendance Streak":
    "Consecutive working days with valid attendance.\n\n" +
    "📊 Calculation:\n" +
    "• Created: At checkout\n" +
    "• Walks backwards from yesterday\n" +
    "• Skips: Holidays, weekends, day-wise shift off days\n" +
    "• Counts consecutive days with valid check-in\n" +
    "• Breaks on: First day without attendance\n" +
    "• Value: Weightage (not day count)\n" +
    "• Score: Weightage × 1 (awarded per streak)",

  "Extra Days":
    "Bonus for working on holidays or configured off days.\n\n" +
    "📊 Calculation:\n" +
    "• Created: At checkout (if today is holiday)\n" +
    "• Checks: Public holidays table\n" +
    "• Value: Weightage\n" +
    "• Score: Weightage × 1\n" ,

  "Request Raised":
    "Number of attendance correction requests submitted.\n\n" +
    "📊 Calculation:\n" +
    "• Tracked when employee requests attendance edits\n" +
    "• Value: Number of requests\n" +
    "• Score: Requests × Weightage",

  // Leave factors
  "Total Paid Leaves Taken":
    "Number of paid leave days used.\n\n" +
    "📊 Calculation:\n" +
    "• Counted from approved leave requests\n" +
    "• Leave type: Paid (vacation, sick leave, etc.)\n" +
    "• Score: Days × Weightage",

  "Total Unpaid Leaves taken":
    "Number of unpaid leave days used.\n\n" +
    "📊 Calculation:\n" +
    "• Counted from approved leave requests\n" +
    "• Leave type: Unpaid (LOP)\n" +
    "• Score: Days × Weightage × (-1)",

  "Total Unpaid Leaves Taken":
    "Number of unpaid leave days used.\n\n" +
    "📊 Calculation:\n" +
    "• Counted from approved leave requests\n" +
    "• Leave type: Unpaid (LOP)\n" +
    "• Score: Days × Weightage × (-1)",

  // Legacy names (in case some factors still use these)
  "Early Check-Out": "Points deducted for leaving early.",
  "Early Check-in days": "Bonus for early arrivals.",
  "Working on Holidays": "Extra points for holiday work.",
  "Late Check-Out": "Bonus for staying late.",
  "Longest Attendance Streak Days": "Consistency streak bonus.",
  "Late Check-In": "Deductions for late arrival.",
  "Over Time Hours": "Points per overtime hour.",
  "Total Leaves Taken": "Count of leaves used.",
  "Unpaid Leaves Taken": "Count of unpaid absences.",
  "Least Leaves Taken": "Lowest leave usage count.",
};

// Auto sign change component based on type selection
const TypeChangeHandler = ({ originalPoint }: { originalPoint: number }) => {
  const { values, setFieldValue } = useFormikContext<any>();
  useEffect(() => {
    const absPoint = Math.abs(originalPoint);
    
    if (values.type === 'positive') {
      setFieldValue('point', absPoint);
    } else if (values.type === 'negative') {
      setFieldValue('point', -absPoint);
    }
  }, [values.type, originalPoint, setFieldValue]);
  
  return null;
};

const resourseAndView = [
  {
    resource: resourceNameMapWithCamelCase.kpi,
    viewOwn: true,
    viewOthers: true,
    editOwn: true,
    editOthers: true,
  }
];

export default function KpiSettings() {
  const [data, setData] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [moduleIds, setModuleIds] = useState({ attendance: "", leaves: "" });
  const [showData, setShowData] = useState(false);

  // Open edit modal
  const openEditModal = (item: any, category: any) => {
    setEditItem({ ...item, category });
    setShowModal(true);
  };

  const employeeId = useSelector((state: any) => state.employee.currentEmployee?.id);

  useEffect(()=>{
    if(!employeeId) return;

    const res = hasPermission(resourseAndView[0]?.resource, permissionConstToUseWithHasPermission
      .readOthers)
    setShowData(res)

  },[employeeId])

  // Fetch modules
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const resp = await getAllKpiModules();
        if (resp.hasError) {
          throw new Error(resp.message);
        }
        const mods = resp.data.modules || [];
        const att = mods.find((m: any) => m.name === KPI_Module_Name.Attendance);
        const lev = mods.find((m: any) => m.name === KPI_Module_Name.Leaves);
        if (att && lev) {
          setModuleIds({ attendance: att.id, leaves: lev.id });
        }
      } catch (e) {
        console.warn((e as Error).message || "Failed to fetch KPI modules");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Fetch factors when modules are ready
  useEffect(() => {
    if (!moduleIds.attendance || !moduleIds.leaves) return;
    (async () => {
      setLoading(true);
      try {
        const resp = await getAllKpiFactors();
        if (resp.hasError) {
          throw new Error(resp.message);
        }
        const raw = resp.data.factors || [];
        const mapF = (f: any) => ({
          id: f.id,
          name: f.name,
          point: f.weightage,
          scale: f.unit,
          type: f.type.toLowerCase(),
          moduleId: f.moduleId,
        });
        const attendanceFactors = raw.filter((f: any) => f.moduleId === moduleIds.attendance).map(mapF);
        const leaveFactors = raw.filter((f: any) => f.moduleId === moduleIds.leaves).map(mapF);
        
        setData([
          {
            category: "Attendance",
            icon: kpiAttendanceIcons.kpiIcon.default,
            factors: attendanceFactors,
          },
          {
            category: "Leaves",
            icon: kpiAttendanceIcons.kpiIcon.default,
            factors: leaveFactors,
          },
        ]);
      } catch (e) {
        console.warn((e as Error).message || "Failed to fetch KPI factors");
      } finally {
        setLoading(false);
      }
    })();
  }, [moduleIds]);



  if (loading) {
    return (
      <Container fluid className="my-4 d-flex justify-content-center" style={{ minHeight: 300 }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading…</span>
        </div>
      </Container>
    );
  }

  if(!showData) return <h2 className="text-center">Not Allowed To View</h2>
  
  return (
    <div>
      <h2 className="mb-5">Settings</h2>
      <div className="card p-lg-8 p-5 mb-5">
        <h4 style={{ fontFamily: "Barlow", fontWeight: 600, fontSize: 20 }} className="mb-4">
          Weightage
        </h4>

        {data.map((section, idx) => (
          <div key={idx} className="card mb-4">
            <div className="card-body p-4" style={{ border: "1px solid #ccc", borderRadius: 10 }}>
              <div className="d-flex align-items-center gap-2 mb-4">
                <img src={section.icon} alt={section.category} width={24} height={24} />
                <span className="fs-5" style={{ fontFamily: "Barlow", fontWeight: 600 }}>
                  {section.category}
                </span>
              </div>

              <div className="table-responsive">
                <table className="table align-middle">
                  <thead>
                    <tr className="text-muted fw-medium fs-7">
                      <th style={{ width: "40%" }}>Factors</th>
                      <th className="text-center" style={{ width: "20%" }}>
                        Weightage Point
                      </th>
                      <th className="text-center" style={{ width: "20%" }}>
                        Weightage Scale
                      </th>
                      <th className="text-center" style={{ width: "20%" }}>
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.factors.map((factor: any, i: number) => {
                      const res = hasPermission(resourseAndView[0]?.resource, permissionConstToUseWithHasPermission
                        .editOthers)
                      return(
                      <tr key={i}>
                        <td>
                          <div className="d-flex align-items-center">
                            <span>{factor.name}</span>
                            {factor.name in tooltipDescriptions && (
                            <OverlayTrigger
                              placement="top"
                              overlay={
                                <RBTooltip id={`tooltip-${section.category}-${factor.id}`}>
                                  {tooltipDescriptions[factor.name as keyof typeof tooltipDescriptions]}
                                </RBTooltip>
                              }
                            >
                              <i className="fa fa-question-circle text-muted fs-3 ms-2"></i>
                            </OverlayTrigger>
                            )}
                          </div>
                        </td>
                        <td className="text-center">
                          {factor.type.toLowerCase() === 'positive' ? "+" : "-"}
                          {factor.point} pts
                        </td>
                        <td className="text-center">Per {factor.scale}</td>
                        <td className="text-center">
                          {res ? <span
                            onClick={() => openEditModal(factor, section.category)}
                            className="cursor-pointer"
                          >
                            <i className="fa-solid fa-pen-to-square text-primary fs-5"></i>
                          </span> : <span className="cursor-pointer">
                           -NA-
                          </span>}
                        </td>
                      </tr>
                    )})}
                  </tbody>
                  <tfoot>
                    <tr style={{ backgroundColor: "#f8f9fa", borderRadius:'10px' }}>
                      <td style={{ fontWeight: 600 }}>Total Weightage</td>
                      <td className="text-center" style={{ fontWeight: 600 }}>
                        {(() => {
                          const total = section.factors.reduce((sum: number, factor: any) => {
                            const weight = Number(factor.point);
                            const signedWeight = factor.type?.toLowerCase() === 'negative' ? -Math.abs(weight) : Math.abs(weight);
                            return sum + signedWeight;
                          }, 0);
                          return `${total >= 0 ? '+' : ''}${total} pts`;
                        })()}
                      </td>
                      <td className="text-center">-</td>
                      <td className="text-center">-</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton style={{ borderBottom: "none" }}>
          <Modal.Title>Edit Weightage</Modal.Title>
        </Modal.Header>
        {editItem && (
          <Formik
            enableReinitialize
            initialValues={{
              type: editItem.type || "positive",
              point: editItem.point || 0,
            }}
            validationSchema={validationSchema}
            onSubmit={async (values) => {
              setSaving(true);
              try {
                const pointValue = values.type === 'positive' 
                  ? Math.abs(values.point) 
                  : -Math.abs(values.point);
                  
                const payload = {
                  id: editItem.id,
                  weightage: values.point,
                  type: values.type.toUpperCase(),
                };
                const resp = await updateKpiFactors(editItem.id, payload);
                if (resp.hasError) throw new Error(resp.message);
                // Update local data
                setData((prev) =>
                  prev.map((cat) =>
                    cat.category === editItem.category
                      ? {
                          ...cat,
                          factors: cat.factors.map((f: any) =>
                            f.id === editItem.id ? { ...f, point: pointValue, type: values.type } : f
                          ),
                        }
                      : cat
                  )
                );
                setShowModal(false);
                successConfirmation("KPI factor updated successfully");
              } catch (e) {
                errorConfirmation((e as Error).message || "Failed to update KPI factor");
              } finally {
                setSaving(false);
              }
            }}
          >
            {({ values, setFieldValue }) => (
              <FormikForm placeholder={""}>
                <Modal.Body>
                  <div
                    className="pb-4"
                    style={{ fontFamily: "Inter", fontWeight: 500, fontSize: 14 }}
                  >
                    {editItem.category} : {editItem.name}
                  </div>
                  <p className="text-muted fs-6">
                    Adjust the KPI weightage and type. This affects how performance is
                    scored.
                  </p>

                  {/* Add our component that handles sign changes */}
                  {/* <TypeChangeHandler originalPoint={editItem.point} /> */}

                  <RadioInput
                    isRequired
                    inputLabel="Type"
                    radioBtns={[
                      { label: "Positive", value: "positive" },
                      { label: "Negative", value: "negative" },
                    ]}
                    formikField="type"
                  />

                  <TextInput
                    formikField="point"
                    label="Weightage Point"
                    placeholder="e.g. 5"
                    isRequired={true}
                    inputTypeNumber
                    suffix={`pts per ${editItem.scale?.toLowerCase() || ""}`}
                  />
                </Modal.Body>

                <Modal.Footer>
                  <Button variant="primary" type="submit" disabled={saving}>
                    {saving ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                          aria-hidden="true"
                        />
                        Saving...
                      </>
                    ) : (
                      "Save"
                    )}
                  </Button>
                </Modal.Footer>
              </FormikForm>
            )}
          </Formik>
        )}
      </Modal>
    </div>
  );
}