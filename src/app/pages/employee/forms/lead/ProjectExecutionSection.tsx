import React, { useEffect, useState } from "react";
import { Grid, Typography, Switch, FormControlLabel } from "@mui/material";
import { styled } from "@mui/material/styles";
import { useFormikContext } from "formik";
import DropDownInput from "@app/modules/common/inputs/DropdownInput";
import TextInput from "@app/modules/common/inputs/TextInput";
import DateInput from "@app/modules/common/inputs/DateInput";
// Adapted for labbai-backup2: execution statuses come from the projects service
// (received-lead = project architecture), not the backup-only leadProjectMeta service.
import { getAllProjectStatuses } from "@services/projects";

interface ProjectExecutionSectionProps {
  employees: any[];
  teams: any[];
  formikProps: any;
}

/**
 * Theme-consistent toggle — a rounded-RECTANGLE switch with a square thumb.
 * Off  = light burgundy tint + white square thumb on the left.
 * On   = solid brand burgundy (--wt-primary) + white square thumb on the right.
 * Geometry is symmetric (3px padding on every side) so the thumb is perfectly
 * aligned and flush in both states.
 */
const ThemedSwitch = styled(Switch)(() => ({
  width: 46,
  height: 26,
  padding: 0,
  display: "flex",
  "& .MuiSwitch-switchBase": {
    padding: 0,
    margin: 3,
    transitionDuration: "220ms",
    color: "#fff",
    "&.Mui-checked": {
      transform: "translateX(20px)",
      color: "#fff",
      "& + .MuiSwitch-track": {
        backgroundColor: "var(--wt-primary, #8B1A2F)",
        opacity: 1,
        border: "1px solid var(--wt-primary, #8B1A2F)",
      },
      "&:hover": {
        backgroundColor: "transparent",
      },
    },
    "&:hover": {
      backgroundColor: "transparent",
    },
    "&.Mui-focusVisible .MuiSwitch-thumb": {
      boxShadow: "0 0 0 3px rgba(139, 26, 47, 0.28)",
    },
  },
  "& .MuiSwitch-thumb": {
    boxSizing: "border-box",
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: "#fff",
    boxShadow: "0 1px 3px rgba(0,0,0,0.28)",
  },
  "& .MuiSwitch-track": {
    borderRadius: 8,
    // Light burgundy tint for the OFF state (distinct from the very-faint
    // --wt-primary-light token, which is too subtle to read here).
    backgroundColor: "rgba(139, 26, 47, 0.16)",
    border: "1px solid rgba(139, 26, 47, 0.22)",
    opacity: 1,
    transition: "background-color 220ms, border-color 220ms",
  },
}));

export const ProjectExecutionSection: React.FC<ProjectExecutionSectionProps> = ({
  employees,
  teams,
  formikProps,
}) => {
  const { values, setFieldValue } = useFormikContext<any>();
  const [projectStatuses, setProjectStatuses] = useState<any[]>([]);

  useEffect(() => {
    getAllProjectStatuses()
      .then((res: any) => setProjectStatuses(res?.projectStatuses || res?.data || []))
      .catch(() => {});
  }, []);

  const statusOptions = projectStatuses.map((s: any) => ({
    value: s.id,
    label: s.name,
    color: s.color,
  }));

  // Employees in this app expose `employeeId` + `employeeName` (same shape the
  // working "Assigned to" dropdown uses). Fall back to nested user / name fields.
  const employeeOptions = (employees || []).map((e: any) => ({
    value: e.employeeId || e.id,
    label:
      e.employeeName ||
      `${e.users?.firstName || ""} ${e.users?.lastName || ""}`.trim() ||
      e.name ||
      "Unknown",
  }));

  const teamOptions = (teams || []).map((t: any) => ({
    value: t.id,
    label: t.name || t.teamName || "Unnamed Team",
  }));

  const accessOptions = [
    { value: "PRIVATE", label: "Private" },
    { value: "PUBLIC", label: "Public" },
  ];

  const meta = values.projectMeta || {};

  return (
    <div>
      {/* ── Execution Info ─────────────────────────────────────────────── */}
      <div className="wt-section-card">
        <div className="wt-section-heading">
          Execution Info
        </div>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <DropDownInput
              formikField="projectStatusId"
              inputLabel="Project Status"
              options={statusOptions}
              isRequired={false}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <DropDownInput
              formikField="projectMeta.projectManagerId"
              inputLabel="Project Manager"
              options={employeeOptions}
              isRequired={false}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <DropDownInput
              formikField="projectMeta.teamId"
              inputLabel="Execution Team"
              options={teamOptions}
              isRequired={false}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <DropDownInput
              formikField="projectMeta.projectAccess"
              inputLabel="Project Access"
              options={accessOptions}
              isRequired={false}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            {/* Match the sibling fields: a form-label header + an input-height row
                so the toggles align with the dropdowns instead of floating high. */}
            <label className="form-label">Visibility</label>
            <div
              className="d-flex gap-4 align-items-center"
              style={{ minHeight: 42 }}
            >
              {[
                { key: "projectMeta.isLive", label: "Is Live", checked: !!meta.isLive },
              ].map((t) => (
                <FormControlLabel
                  key={t.key}
                  control={
                    <ThemedSwitch
                      checked={t.checked}
                      onChange={(e) => setFieldValue(t.key, e.target.checked)}
                    />
                  }
                  sx={{ ml: 0, mr: 0, gap: 1.25 }}
                  label={
                    <Typography
                      sx={{
                        fontSize: "13.5px",
                        fontWeight: t.checked ? 600 : 500,
                        color: t.checked ? "var(--wt-primary, #8B1A2F)" : "#475569",
                        transition: "color 150ms, font-weight 150ms",
                        userSelect: "none",
                      }}
                    >
                      {t.label}
                    </Typography>
                  }
                />
              ))}
            </div>
          </Grid>
        </Grid>
      </div>

      {/* ── Timeline ───────────────────────────────────────────────────── */}
      <div className="wt-section-card" style={{ marginTop: "1.5rem" }}>
        <div className="wt-section-heading">
          Timeline
        </div>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <DateInput
              formikField="startDate"
              inputLabel="Project Start Date"
              formikProps={formikProps}
              placeHolder="Select start date"
              isRequired={false}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <DateInput
              formikField="endDate"
              inputLabel="Expected Completion"
              formikProps={formikProps}
              placeHolder="Select end date"
              isRequired={false}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <DateInput
              formikField="receivedDate"
              inputLabel="Received / PO Date"
              formikProps={formikProps}
              placeHolder="Select received date"
              isRequired={false}
            />
          </Grid>
        </Grid>
      </div>

      {/* ── Purchase Order (PO) Details ───────────────────────────────── */}
      <div className="wt-section-card" style={{ marginTop: "1.5rem" }}>
        <div className="wt-section-heading">
          Purchase Order (PO) Details
        </div>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <DropDownInput
              isRequired={false}
              formikField="poStatus"
              inputLabel="PO Status"
              options={[
                { value: "Pending", label: "Pending" },
                { value: "Approved", label: "Approved" },
                { value: "Rejected", label: "Rejected" },
              ]}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextInput formikField="poNumber" label="PO Number" isRequired={false} />
          </Grid>
          <Grid item xs={12} md={4}>
            <DateInput
              formikField="poDate"
              inputLabel="PO Date"
              formikProps={formikProps}
              placeHolder="Select PO Date"
              isRequired={false}
            />
          </Grid>
        </Grid>
      </div>

    </div>
  );
};
