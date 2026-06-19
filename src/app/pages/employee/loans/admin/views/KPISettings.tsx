import { useEffect, useState } from "react";
import { Modal, Button, Container, OverlayTrigger, Tooltip as RBTooltip, Form } from "react-bootstrap";
import { kpiAttendanceIcons } from "@metronic/assets/sidepanelicons";
import { getAllKpiFactors, updateKpiFactors, getAllKpiModules, createKpiFactor } from "@services/employee";
import { successConfirmation, errorConfirmation } from "@utils/modal";
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";
import TextInput from "@app/modules/common/inputs/TextInput";
import RadioInput from "@app/modules/common/inputs/RadioInput";
import { Formik, Form as FormikForm } from "formik";
import * as Yup from "yup";
import { hasPermission } from "@utils/authAbac";
import { useSelector, useDispatch } from "react-redux";
import { saveToggleChange } from "@redux/slices/attendanceStats";
import { sortKpiFactors } from "@utils/kpiSort";

const tooltipDescriptions: Record<string, string> = {
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
    "• Score: Weightage × 1",
  "Request Raised":
    "Number of attendance correction requests submitted.\n\n" +
    "📊 Calculation:\n" +
    "• Tracked when employee requests attendance edits\n" +
    "• Value: Number of requests\n" +
    "• Score: Requests × Weightage",
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

const editSchema = Yup.object({
  type: Yup.string().required("Type is required"),
  point: Yup.number().required("Weightage point is required"),
});

const addSchema = Yup.object({
  name: Yup.string().required("Factor name is required"),
  calculationFrom: Yup.string().required("Calculation from is required"),
  weightage: Yup.number().min(0.01, "Must be greater than 0").required("Weightage is required"),
  unit: Yup.string().required("Unit is required"),
  type: Yup.string().required("Type is required"),
});

const resourseAndViewConfig = [
  {
    resource: resourceNameMapWithCamelCase.kpi,
    viewOwn: true,
    viewOthers: true,
    editOwn: true,
    editOthers: true,
  },
];

const UNIT_OPTIONS = ["day", "hour", "task", "project", "request", "sale", "target", "review"];
// Standardized calculation sources: SYSTEM = auto-computed by the platform,
// ADMIN = manually entered or externally tracked by an admin.
const CALC_FROM_OPTIONS = ["SYSTEM", "ADMIN"];

export default function KpiSettings() {
  const [allFactors, setAllFactors] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [showData, setShowData] = useState(false);

  const [editModal, setEditModal] = useState<{ open: boolean; item: any; moduleName: string }>({
    open: false, item: null, moduleName: "",
  });
  const [addModal, setAddModal] = useState<{ open: boolean; moduleId: string; moduleName: string }>({
    open: false, moduleId: "", moduleName: "",
  });
  const [saving, setSaving] = useState(false);

  const employeeId = useSelector((state: any) => state.employee.currentEmployee?.id);
  const dispatch = useDispatch();
  const toggleChange = useSelector((state: any) => state.attendanceStats.toggleChange);

  // Bumping toggleChange is the app-wide "KPI config changed" signal: it
  // invalidates the leaderboard's cached factor definitions and rankings so the
  // change reflects instantly on the KPI report without a manual page reload.
  const signalKpiConfigChanged = () => dispatch(saveToggleChange(!toggleChange));

  const canEdit = hasPermission(
    resourseAndViewConfig[0].resource,
    permissionConstToUseWithHasPermission.editOthers
  );

  useEffect(() => {
    if (!employeeId) return;
    const res = hasPermission(
      resourseAndViewConfig[0].resource,
      permissionConstToUseWithHasPermission.readOthers
    );
    setShowData(res);
  }, [employeeId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [modResp, factorResp] = await Promise.all([
        getAllKpiModules(),
        getAllKpiFactors(true),
      ]);
      if (modResp.hasError) throw new Error(modResp.message);
      if (factorResp.hasError) throw new Error(factorResp.message);
      setModules(modResp.data.modules || []);
      setAllFactors(factorResp.data.factors || []);
    } catch (e) {
      console.warn((e as Error).message || "Failed to fetch KPI data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const sectionsData = modules.map((mod: any) => {
    const factors = sortKpiFactors(
      allFactors
        .filter((f: any) => f.moduleId === mod.id)
        .map((f: any) => ({
          id: f.id,
          name: f.name,
          point: Number(f.weightage),
          scale: f.unit,
          type: (f.type || "POSITIVE").toLowerCase(),
          moduleId: f.moduleId,
          isActive: f.isActive !== false,
          calculationFrom: f.calculationFrom,
        })),
      (f: any) => f.name
    );
    return { moduleId: mod.id, category: mod.name, factors };
  });

  const openEditModal = (item: any, moduleName: string) => {
    setEditModal({ open: true, item, moduleName });
  };

  const openAddModal = (moduleId: string, moduleName: string) => {
    setAddModal({ open: true, moduleId, moduleName });
  };

  const handleDeactivate = async (factorId: string, currentlyActive: boolean) => {
    setSaving(true);
    try {
      const resp = await updateKpiFactors(factorId, { isActive: !currentlyActive });
      if (resp.hasError) throw new Error(resp.message);
      setAllFactors((prev) =>
        prev.map((f) => (f.id === factorId ? { ...f, isActive: !currentlyActive } : f))
      );
      signalKpiConfigChanged();
      successConfirmation(currentlyActive ? "Factor deactivated" : "Factor reactivated");
    } catch (e) {
      errorConfirmation((e as Error).message || "Failed to update factor");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container fluid className="my-4 d-flex justify-content-center" style={{ minHeight: 300 }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading…</span>
        </div>
      </Container>
    );
  }

  if (!showData) return <h2 className="text-center">Not Allowed To View</h2>;

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-8">
        <div>
          <h2 className="fw-bolder text-dark mb-1">KPI Configuration</h2>
          <span className="text-muted fw-bold fs-7">Manage factor weightage and scoring rules</span>
        </div>
        <div 
          className="d-flex align-items-center bg-white border border-gray-300 rounded-pill px-5 py-2 shadow-sm transition-all hover-elevated"
          style={{ cursor: "pointer", transition: "all 0.2s ease" }}
          onClick={() => setShowInactive(!showInactive)}
        >
          <Form.Check
            type="switch"
            id="show-inactive-toggle"
            label={<span className="fw-bolder text-gray-800 fs-7 ms-2 user-select-none">Show Inactive Factors</span>}
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="form-check-custom form-check-solid form-check-success mb-0"
          />
        </div>
      </div>
      <style jsx>{`
        .hover-neutral:hover {
          background-color: #F9FAFB !important;
          box-shadow: inset 0 0 0 1px #EFF2F5;
        }
        .bg-light-neutral {
          background-color: #F9FAFB;
        }
        .hover-elevated:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.08) !important;
        }
        .border-dashed {
          border-style: dashed !important;
        }
      `}</style>

      <div className="card shadow-sm mb-5">
        <div className="card-header border-0 pt-6">
          <div className="card-title">
            <div className="d-flex align-items-center position-relative my-1">
              <h3 className="fw-bolder text-dark fs-3" style={{ fontFamily: "Barlow" }}>
                KPI Weightage Configuration
              </h3>
            </div>
          </div>
        </div>
        <div className="card-body py-4">

        {sectionsData.length === 0 && (
          <p className="text-muted">No KPI modules found.</p>
        )}

        {sectionsData.map((section, idx) => {
          const visibleFactors = showInactive
            ? section.factors
            : section.factors.filter((f: any) => f.isActive);

          const activeFactors = section.factors.filter((f: any) => f.isActive);

          return (
            <div key={idx} className="card shadow-none mb-8" style={{ border: "1px solid #EFF2F5", borderRadius: "12px" }}>
              <div className="card-body p-6">
                <div className="d-flex align-items-center justify-content-between mb-6">
                  <div className="d-flex align-items-center gap-3">
                    <div 
                      className="d-flex align-items-center justify-content-center bg-light rounded"
                      style={{ width: "40px", height: "40px", border: "1px solid #EFF2F5" }}
                    >
                      <img
                        src={kpiAttendanceIcons.kpiIcon.default}
                        alt={section.category}
                        width={24}
                        height={24}
                      />
                    </div>
                    <div>
                      <span className="d-block fs-5 fw-bolder text-dark" style={{ fontFamily: "Barlow" }}>
                        {section.category}
                      </span>
                      <span className="badge badge-light-primary fw-bold px-3 py-1 fs-8">
                        {activeFactors.length} active factors
                      </span>
                    </div>
                  </div>
                  {canEdit && (
                    <button
                      className="btn btn-sm btn-light-primary fw-bolder px-4 py-2"
                      onClick={() => openAddModal(section.moduleId, section.category)}
                    >
                      <i className="fa fa-plus me-2" />
                      Add Factor
                    </button>
                  )}
                </div>

                <div className="table-responsive">
                  <table className="table table-row-dashed table-row-gray-300 align-middle gs-0 gy-4">
                    <thead>
                      <tr className="fw-bolder text-muted bg-light">
                        <th className="ps-4 min-w-200px rounded-start">Factor Name</th>
                        <th className="text-center min-w-150px">Weightage</th>
                        <th className="text-center min-w-125px">Scale</th>
                        <th className="text-center min-w-100px">Type</th>
                        <th className="text-center min-w-125px pe-4 rounded-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleFactors.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center text-muted py-4">
                            No factors found.
                          </td>
                        </tr>
                      ) : (
                        visibleFactors.map((factor: any, i: number) => (
                          <tr
                            key={factor.id}
                            className="hover-neutral"
                            style={{ 
                              opacity: factor.isActive ? 1 : 0.6,
                              transition: "all 0.2s ease"
                            }}
                          >
                            <td className="ps-4">
                              <div className="d-flex align-items-center">
                                <div className="d-flex flex-column">
                                  <div className="d-flex align-items-center gap-2">
                                    <span className="text-dark fw-bolder text-hover-primary mb-1 fs-6">
                                      {factor.name}
                                    </span>
                                    {factor.name in tooltipDescriptions && (
                                      <OverlayTrigger
                                        placement="top"
                                        overlay={
                                          <RBTooltip id={`tooltip-${section.category}-${factor.id}`}>
                                            {tooltipDescriptions[factor.name]}
                                          </RBTooltip>
                                        }
                                      >
                                        <i className="fa fa-question-circle text-gray-400 fs-7" />
                                      </OverlayTrigger>
                                    )}
                                  </div>
                                  {!factor.isActive && (
                                    <span className="text-muted fw-bold fs-7 italic">
                                      Disabled
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="text-center">
                              <span className={`fw-bolder fs-6 ${factor.type === "positive" ? "text-success" : "text-danger"}`}>
                                {factor.type === "positive" ? "+" : "-"}
                                {Math.abs(Number(factor.point))}
                                <span className="text-muted fs-8 ms-1">pts</span>
                              </span>
                            </td>
                            <td className="text-center">
                              <span className="text-muted fw-bold d-block fs-7">
                                Per {factor.scale}
                              </span>
                            </td>
                            <td className="text-center">
                              <span
                                className={`badge fw-bolder fs-8 px-3 py-2 ${
                                  factor.type === "positive"
                                    ? "badge-light-success"
                                    : factor.type === "leave"
                                      ? "badge-light-warning"
                                      : "badge-light-danger"
                                }`}
                              >
                                {factor.type === "positive" ? "Positive" : factor.type === "leave" ? "Leave" : "Negative"}
                              </span>
                            </td>
                            <td className="text-center pe-4">
                              {canEdit ? (
                                <div className="d-flex align-items-center justify-content-center gap-2">
                                  <OverlayTrigger
                                    placement="top"
                                    overlay={<RBTooltip id={`edit-${factor.id}`}>Edit</RBTooltip>}
                                  >
                                    <button
                                      className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm"
                                      onClick={() => openEditModal(factor, section.category)}
                                      style={{ border: "1px solid #EFF2F5" }}
                                    >
                                      <i className="fa-solid fa-pen-to-square fs-6" />
                                    </button>
                                  </OverlayTrigger>
                                  <OverlayTrigger
                                    placement="top"
                                    overlay={
                                      <RBTooltip id={`deact-${factor.id}`}>
                                        {factor.isActive ? "Disable" : "Enable"}
                                      </RBTooltip>
                                    }
                                  >
                                    <button
                                      className={`btn btn-icon btn-sm btn-light-${factor.isActive ? "primary" : "secondary"}`}
                                      onClick={() => handleDeactivate(factor.id, factor.isActive)}
                                      style={{ border: "1px solid #EFF2F5" }}
                                    >
                                      <i
                                        className={`fa-solid ${factor.isActive ? "fa-toggle-on text-success" : "fa-toggle-off"} fs-4`}
                                      />
                                    </button>
                                  </OverlayTrigger>
                                </div>
                              ) : (
                                <span className="text-muted fs-7">-NA-</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-light-neutral border-top border-gray-300">
                        <td className="ps-4 fw-bolder text-gray-700">Total Contribution (Active Factors)</td>
                        <td className="text-center fw-bolder text-dark fs-6">
                          {(() => {
                            const total = activeFactors.reduce((sum: number, f: any) => {
                              const w = Math.abs(Number(f.point));
                              return sum + (f.type === "negative" || f.type === "leave" ? -w : w);
                            }, 0);
                            return (
                              <span className={total >= 0 ? "text-success" : "text-danger"}>
                                {total >= 0 ? "+" : ""}{total} pts
                              </span>
                            );
                          })()}
                        </td>
                        <td className="text-center text-muted fs-8 fw-bold">N/A</td>
                        <td className="text-center text-muted fs-8 fw-bold">N/A</td>
                        <td className="text-center text-muted fs-8 fw-bold pe-4">N/A</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          );
        })}
        </div>
      </div>

      {/* ── Edit Modal ── */}
      <Modal show={editModal.open} onHide={() => setEditModal({ open: false, item: null, moduleName: "" })} centered>
        <Modal.Header closeButton style={{ borderBottom: "none" }}>
          <Modal.Title>Edit Factor</Modal.Title>
        </Modal.Header>
        {editModal.item && (
          <Formik
            enableReinitialize
            initialValues={{
              type: editModal.item.type || "positive",
              point: Math.abs(editModal.item.point) || 0,
              isActive: editModal.item.isActive !== false,
            }}
            validationSchema={editSchema}
            onSubmit={async (values) => {
              setSaving(true);
              try {
                // weightage is ALWAYS stored as a positive number.
                // kpiservice.calculateNegativeScore() applies the minus sign
                // at calculation time based on factor.type — storing a negative
                // weightage here causes double-negation and makes NEGATIVE factor
                // scores show as positive on the leaderboard.
                const payload = {
                  weightage: Math.abs(values.point),
                  type: values.type.toUpperCase(),
                  isActive: values.isActive,
                };
                const resp = await updateKpiFactors(editModal.item.id, payload);
                if (resp.hasError) throw new Error(resp.message);
                setAllFactors((prev) =>
                  prev.map((f) =>
                    f.id === editModal.item.id
                      ? { ...f, weightage: Math.abs(values.point), type: values.type.toUpperCase(), isActive: values.isActive }
                      : f
                  )
                );
                setEditModal({ open: false, item: null, moduleName: "" });
                signalKpiConfigChanged();
                successConfirmation("KPI factor updated successfully");
              } catch (e) {
                errorConfirmation((e as Error).message || "Failed to update KPI factor");
              } finally {
                setSaving(false);
              }
            }}
          >
            {({ values, setFieldValue }) => (
              <FormikForm>
                <Modal.Body>
                  <div className="pb-3" style={{ fontFamily: "Inter", fontWeight: 500, fontSize: 14 }}>
                    {editModal.moduleName} : {editModal.item.name}
                  </div>
                  <p className="text-muted fs-6">
                    Adjust the KPI weightage and type. Historical scores are preserved and will not be recalculated.
                  </p>

                  <RadioInput
                    isRequired
                    inputLabel="Type"
                    radioBtns={[
                      { label: "Positive", value: "positive" },
                      { label: "Negative", value: "negative" },
                      { label: "Leave", value: "leave" },
                    ]}
                    formikField="type"
                  />

                  <TextInput
                    formikField="point"
                    label="Weightage Point"
                    placeholder="e.g. 5"
                    isRequired={true}
                    inputTypeNumber
                    suffix={`pts per ${editModal.item.scale?.toLowerCase() || ""}`}
                  />

                  <div className="d-flex align-items-center gap-3 mt-4">
                    <Form.Check
                      type="switch"
                      id="edit-isActive"
                      label={values.isActive ? "Active" : "Inactive"}
                      checked={values.isActive}
                      onChange={(e) => setFieldValue("isActive", e.target.checked)}
                    />
                    <small className="text-muted">
                      Deactivating removes this factor from future KPI calculations. Past scores are preserved.
                    </small>
                  </div>
                </Modal.Body>
                <Modal.Footer>
                  <Button
                    variant="secondary"
                    onClick={() => setEditModal({ open: false, item: null, moduleName: "" })}
                  >
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit" disabled={saving}>
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
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

      {/* ── Add Factor Modal ── */}
      <Modal
        show={addModal.open}
        onHide={() => setAddModal({ open: false, moduleId: "", moduleName: "" })}
        centered
      >
        <Modal.Header closeButton style={{ borderBottom: "none" }}>
          <Modal.Title>Add Factor — {addModal.moduleName}</Modal.Title>
        </Modal.Header>
        <Formik
          enableReinitialize
          initialValues={{
            name: "",
            calculationFrom: "",
            weightage: "" as any,
            unit: "",
            type: "positive",
          }}
          validationSchema={addSchema}
          onSubmit={async (values, { resetForm }) => {
            setSaving(true);
            try {
              const resp = await createKpiFactor({
                name: values.name,
                moduleId: addModal.moduleId,
                calculationFrom: values.calculationFrom,
                weightage: Number(values.weightage),
                unit: values.unit,
                type: values.type.toUpperCase(),
                isActive: true,
              });
              if (resp.hasError) throw new Error(resp.message);
              const newFactor = resp.data?.factors?.[0];
              if (newFactor) {
                setAllFactors((prev) => [...prev, newFactor]);
              }
              resetForm();
              setAddModal({ open: false, moduleId: "", moduleName: "" });
              signalKpiConfigChanged();
              successConfirmation("KPI factor added successfully");
            } catch (e) {
              errorConfirmation((e as Error).message || "Failed to add KPI factor");
            } finally {
              setSaving(false);
            }
          }}
        >
          {({ values, setFieldValue, errors, touched }) => (
            <FormikForm>
              <Modal.Body>
                <p className="text-muted fs-6 mb-4">
                  New factors will be used in future KPI calculations. Existing scores are not affected.
                </p>

                <TextInput
                  formikField="name"
                  label="Factor Name"
                  placeholder="e.g. On Time Attendance Days"
                  isRequired={true}
                />

                <div className="mb-4">
                  <label className="form-label fw-medium">
                    Calculation From <span className="text-danger">*</span>
                  </label>
                  <select
                    className={`form-select ${touched.calculationFrom && errors.calculationFrom ? "is-invalid" : ""}`}
                    value={values.calculationFrom}
                    onChange={(e) => setFieldValue("calculationFrom", e.target.value)}
                  >
                    <option value="">Select source…</option>
                    {CALC_FROM_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o.charAt(0).toUpperCase() + o.slice(1)}
                      </option>
                    ))}
                  </select>
                  {touched.calculationFrom && errors.calculationFrom && (
                    <div className="invalid-feedback">{errors.calculationFrom}</div>
                  )}
                </div>

                <div className="mb-4">
                  <label className="form-label fw-medium">
                    Unit <span className="text-danger">*</span>
                  </label>
                  <select
                    className={`form-select ${touched.unit && errors.unit ? "is-invalid" : ""}`}
                    value={values.unit}
                    onChange={(e) => setFieldValue("unit", e.target.value)}
                  >
                    <option value="">Select unit…</option>
                    {UNIT_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o.charAt(0).toUpperCase() + o.slice(1)}
                      </option>
                    ))}
                  </select>
                  {touched.unit && errors.unit && (
                    <div className="invalid-feedback">{errors.unit}</div>
                  )}
                </div>

                <TextInput
                  formikField="weightage"
                  label="Weightage Point"
                  placeholder="e.g. 5"
                  isRequired={true}
                  inputTypeNumber
                  suffix="pts"
                />

                <RadioInput
                  isRequired
                  inputLabel="Type"
                  radioBtns={[
                    { label: "Positive", value: "positive" },
                    { label: "Negative", value: "negative" },
                    { label: "Leave", value: "leave" },
                  ]}
                  formikField="type"
                />
              </Modal.Body>
              <Modal.Footer>
                <Button
                  variant="secondary"
                  onClick={() => setAddModal({ open: false, moduleId: "", moduleName: "" })}
                >
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                      Adding...
                    </>
                  ) : (
                    "Add Factor"
                  )}
                </Button>
              </Modal.Footer>
            </FormikForm>
          )}
        </Formik>
      </Modal>
    </div>
  );
}
