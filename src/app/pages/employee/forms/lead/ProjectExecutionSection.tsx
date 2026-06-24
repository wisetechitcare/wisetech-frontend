import React, { useEffect, useState } from "react";
import { Grid, Typography, Switch, FormControlLabel } from "@mui/material";
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
            <div className="mt-2 d-flex gap-4 align-items-center">
              <FormControlLabel
                control={
                  <Switch
                    checked={!!meta.isLive}
                    onChange={(e) => setFieldValue("projectMeta.isLive", e.target.checked)}
                    color="success"
                  />
                }
                label={<Typography sx={{ fontSize: "14px", fontWeight: 500 }}>Is Live</Typography>}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={meta.isProjectOpen !== false}
                    onChange={(e) => setFieldValue("projectMeta.isProjectOpen", e.target.checked)}
                    color="primary"
                  />
                }
                label={<Typography sx={{ fontSize: "14px", fontWeight: 500 }}>Project Open</Typography>}
              />
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
