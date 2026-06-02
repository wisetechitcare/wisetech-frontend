import React, { useEffect, useState } from "react";
import { Grid, Typography, Switch, FormControlLabel, Chip } from "@mui/material";
import {
  Engineering,
  PlayCircleOutline,
  AttachMoney,
  Tune,
} from "@mui/icons-material";
import { useFormikContext } from "formik";
import DropDownInput from "@app/modules/common/inputs/DropdownInput";
import TextInput from "@app/modules/common/inputs/TextInput";
import DateInput from "@app/modules/common/inputs/DateInput";
import { getAllLeadProjectStatuses } from "@services/leadProjectMeta";

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
    getAllLeadProjectStatuses()
      .then((res: any) => setProjectStatuses(res?.data || []))
      .catch(() => {});
  }, []);

  const statusOptions = projectStatuses.map((s: any) => ({
    value: s.id,
    label: s.name,
    color: s.color,
  }));

  const employeeOptions = (employees || []).map((e: any) => ({
    value: e.id || e.employeeId,
    label: `${e.firstName || ""} ${e.lastName || ""}`.trim() || e.name || "Unknown",
  }));

  const teamOptions = (teams || []).map((t: any) => ({
    value: t.id,
    label: t.name,
  }));

  const accessOptions = [
    { value: "PRIVATE", label: "Private" },
    { value: "PUBLIC", label: "Public" },
  ];

  const meta = values.projectMeta || {};

  return (
    <div
      style={{
        borderTop: "3px solid #1976d2",
        marginTop: "32px",
        paddingTop: "24px",
        animation: "fadeSlideIn 0.35s ease",
      }}
    >
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div className="d-flex align-items-center gap-3 mb-6">
        <Chip
          label="PROJECT MODE"
          color="primary"
          size="small"
          icon={<PlayCircleOutline />}
          sx={{ fontWeight: 700, letterSpacing: "0.5px" }}
        />
        <Typography variant="h6" sx={{ fontWeight: 700, color: "#1976d2", fontFamily: "Barlow, sans-serif" }}>
          Project Execution Details
        </Typography>
      </div>

      {/* ── Execution Info ─────────────────────────────────────────────── */}
      <div className="card shadow-sm border p-5 bg-white mb-5">
        <div className="d-flex align-items-center gap-2 mb-4">
          <Engineering fontSize="small" color="primary" />
          <Typography variant="subtitle1" sx={{ fontWeight: 700, fontFamily: "Barlow, sans-serif" }}>
            Execution Info
          </Typography>
        </div>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <DropDownInput
              formikField="projectMeta.projectStatusId"
              inputLabel="Execution Status"
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
      <div className="card shadow-sm border p-5 bg-white mb-5">
        <div className="d-flex align-items-center gap-2 mb-4">
          <Tune fontSize="small" color="primary" />
          <Typography variant="subtitle1" sx={{ fontWeight: 700, fontFamily: "Barlow, sans-serif" }}>
            Timeline
          </Typography>
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

      {/* ── Contract Financials ────────────────────────────────────────── */}
      <div className="card shadow-sm border p-5 bg-white mb-5">
        <div className="d-flex align-items-center gap-2 mb-4">
          <AttachMoney fontSize="small" color="primary" />
          <Typography variant="subtitle1" sx={{ fontWeight: 700, fontFamily: "Barlow, sans-serif" }}>
            Contract Financials
          </Typography>
        </div>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <TextInput
              formikField="projectMeta.contractRate"
              label="Contract Rate (₹)"
              type="number"
              isRequired={false}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextInput
              formikField="projectMeta.finalCost"
              label="Final Cost (₹)"
              type="number"
              isRequired={false}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextInput
              formikField="additionalDetails.poNumber"
              label="PO Number"
              isRequired={false}
            />
          </Grid>
        </Grid>
      </div>

      {/* ── Location QC ───────────────────────────────────────────────── */}
      <div className="card shadow-sm border p-5 bg-white mb-5">
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <FormControlLabel
              control={
                <Switch
                  checked={!!meta.isLocationIncorrect}
                  onChange={(e) => setFieldValue("projectMeta.isLocationIncorrect", e.target.checked)}
                  color="warning"
                />
              }
              label={<Typography sx={{ fontSize: "14px", fontWeight: 500 }}>Location Incorrect</Typography>}
            />
          </Grid>
          {meta.isLocationIncorrect && (
            <Grid item xs={12} md={9}>
              <TextInput
                formikField="projectMeta.locationRemark"
                label="Location Remark"
                isRequired={false}
              />
            </Grid>
          )}
        </Grid>
      </div>
    </div>
  );
};
