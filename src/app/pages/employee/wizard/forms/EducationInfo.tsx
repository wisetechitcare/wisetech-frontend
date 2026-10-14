import { DOCUMENT_ACCEPT, DOCUMENT_HINT, validateDocumentFile } from "@utils/fileValidation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import {
  ActionIconButton,
  WtButton,
  WtDateField,
  WtField,
  WtFieldFormik,
} from "@app/modules/common/components/ui";
import { createQualificationMaster } from "@services/employee";
import { uploadUserAsset } from "@services/uploader";
import ObFileUpload from "../components/ObFileUpload";
import ObUploadStatus from "../components/ObUploadStatus";
import { getEducationDisplayTitle, getQualificationConfig, resetEducationFieldsForQualification } from "../../../../../utils/educationUtils";

const ADD_NEW_QUALIFICATION = "__ADD_NEW__";
const ADD_NEW_STREAM = "__ADD_NEW_STREAM__";
const DEFAULT_HSC_STREAM_OPTIONS = [
  { value: "Science", label: "Science" },
  { value: "Commerce", label: "Commerce" },
  { value: "Arts", label: "Arts" },
];

function EducationalInfo({
  formikProps,
  index,
  userId,
  canRemove,
  onRemove,
  qualificationOptions = [],
  onQualificationCreated,
  setEducationFile,
}: any) {
  const element = `educationalInfo[${index}]`;
  const education = formikProps.values.educationalInfo?.[index] || {};
  const [showInfo, setShowInfo] = useState(false);
  const [showNewQualification, setShowNewQualification] = useState(false);
  const [showNewStream, setShowNewStream] = useState(false);
  const [newQualificationName, setNewQualificationName] = useState("");
  const [newStreamName, setNewStreamName] = useState("");
  const [qualificationError, setQualificationError] = useState("");
  const [streamError, setStreamError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [isSavingQualification, setIsSavingQualification] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const qualificationPopoverRef = useRef<HTMLDivElement | null>(null);
  const streamPopoverRef = useRef<HTMLDivElement | null>(null);

  const qualificationName = String(education.qualificationName || education.degree || "");
  const qualificationConfig = getQualificationConfig(qualificationName);
  const usesPassingYear = qualificationConfig.usesPassingYear;
  const selectedQualification = useMemo(() => {
    if (education.qualificationMasterId) {
      return qualificationOptions.find((option: any) => option.value === education.qualificationMasterId) || null;
    }
    if (qualificationName) {
      return qualificationOptions.find((option: any) => option.name === qualificationName || option.label === qualificationName) || {
        value: education.qualificationMasterId || qualificationName,
        label: qualificationName,
        name: qualificationName,
      };
    }
    return null;
  }, [education.qualificationMasterId, qualificationName, qualificationOptions]);

  const hscStreamOptions = useMemo(() => {
    const options = [...DEFAULT_HSC_STREAM_OPTIONS];
    const streamName = String(education.stream || education.customStream || "");
    if (streamName && !options.some((option) => option.value.toLowerCase() === streamName.toLowerCase())) {
      options.push({ value: streamName, label: streamName });
    }
    return [...options, { value: ADD_NEW_STREAM, label: "+ Add New" }];
  }, [education.stream, education.customStream]);

  const selectedStream = useMemo(() => {
    const streamValue = education.stream || education.customStream || "";
    if (!streamValue) return null;
    return hscStreamOptions.find((option) => option.value === streamValue) || { value: streamValue, label: streamValue };
  }, [education.stream, education.customStream, hscStreamOptions]);

  const title = getEducationDisplayTitle(education) || `Education ${index + 1}`;

  const getFileNameFromUrl = (url: string) => {
    if (!url) return "";
    try {
      const urlParts = url.split("/");
      return decodeURIComponent(urlParts[urlParts.length - 1]);
    } catch (error) {
      return "Academic document";
    }
  };

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (showNewQualification && qualificationPopoverRef.current && !qualificationPopoverRef.current.contains(target)) {
        setShowNewQualification(false);
      }
      if (showNewStream && streamPopoverRef.current && !streamPopoverRef.current.contains(target)) {
        setShowNewStream(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [showNewQualification, showNewStream]);

  const applyQualificationOption = (option: any) => {
    if (!option || option.value === ADD_NEW_QUALIFICATION) {
      setShowNewQualification(true);
      setQualificationError("");
      formikProps.setFieldValue(`${element}.qualificationMasterId`, "");
      formikProps.setFieldValue(`${element}.qualificationName`, "");
      return;
    }

    setShowNewQualification(false);
    const nextName = option?.name || option?.label || "";
    formikProps.setFieldValue(`${element}.qualificationMasterId`, option?.isDefault ? "" : option?.value || "");

    const resetRow = resetEducationFieldsForQualification(education, nextName);
    formikProps.setFieldValue(`${element}.qualificationName`, resetRow.qualificationName);
    formikProps.setFieldValue(`${element}.degree`, resetRow.degree);
    formikProps.setFieldValue(`${element}.specialization`, resetRow.specialization);
    formikProps.setFieldValue(`${element}.stream`, resetRow.stream);
    formikProps.setFieldValue(`${element}.customStream`, resetRow.customStream);
    formikProps.setFieldValue(`${element}.fromDate`, resetRow.fromDate);
    formikProps.setFieldValue(`${element}.toDate`, resetRow.toDate);
    formikProps.setFieldValue(`${element}.passingYear`, resetRow.passingYear);
  };

  const handleQualificationValue = (value: string) => {
    const option = qualificationOptions.find((o: any) => o.value === value);
    applyQualificationOption(option ?? { value, label: value, name: value });
  };

  const handleStreamValue = (value: string) => {
    if (value === ADD_NEW_STREAM) {
      setShowNewStream(true);
      setStreamError("");
      return;
    }
    setShowNewStream(false);
    formikProps.setFieldValue(`${element}.stream`, value || "");
    formikProps.setFieldValue(`${element}.customStream`, "");
  };

  const qualificationSelectOptions = useMemo(
    () =>
      qualificationOptions
        .filter((o: any) => o.value !== ADD_NEW_QUALIFICATION)
        .map((o: any) => ({ value: String(o.value), label: o.label || o.name || String(o.value) })),
    [qualificationOptions],
  );

  const streamSelectOptions = useMemo(
    () =>
      hscStreamOptions
        .filter((o) => o.value !== ADD_NEW_STREAM)
        .map((o) => ({ value: o.value, label: o.label })),
    [hscStreamOptions],
  );

  const saveNewQualification = async () => {
    const normalizedName = newQualificationName.trim().replace(/\s+/g, " ");
    setQualificationError("");

    if (!normalizedName) {
      setQualificationError("Qualification name is required");
      return;
    }

    const duplicate = qualificationOptions.some(
      (option: any) => option.value !== ADD_NEW_QUALIFICATION && option.label.toLowerCase() === normalizedName.toLowerCase(),
    );
    if (duplicate) {
      setQualificationError("Qualification already exists");
      return;
    }

    try {
      setIsSavingQualification(true);
      const response = await createQualificationMaster({ name: normalizedName });
      const qualification = response?.data?.qualification;
      await onQualificationCreated?.();
      formikProps.setFieldValue(`${element}.qualificationMasterId`, qualification?.id || "");
      formikProps.setFieldValue(`${element}.qualificationName`, qualification?.name || normalizedName);
      formikProps.setFieldValue(`${element}.degree`, qualification?.name || normalizedName);
      setNewQualificationName("");
      setShowNewQualification(false);
    } catch (error: any) {
      setQualificationError(error?.response?.data?.message || "Unable to save qualification");
    } finally {
      setIsSavingQualification(false);
    }
  };

  const saveNewStream = () => {
    const normalizedName = newStreamName.trim().replace(/\s+/g, " ");
    setStreamError("");

    if (!normalizedName) {
      setStreamError("Stream name is required");
      return;
    }

    const duplicate = hscStreamOptions.some(
      (option: any) => option.value !== ADD_NEW_STREAM && option.label.toLowerCase() === normalizedName.toLowerCase(),
    );
    if (duplicate) {
      setStreamError("Stream already exists");
      return;
    }

    formikProps.setFieldValue(`${element}.stream`, normalizedName);
    formikProps.setFieldValue(`${element}.customStream`, normalizedName);
    setNewStreamName("");
    setShowNewStream(false);
  };

  const setPercentageFromCgpa = (value: string) => {
    if (value === "") {
      formikProps.setFieldValue(`${element}.percentage`, "", false);
      return;
    }
    const cgpa = Number(value);
    if (!Number.isFinite(cgpa)) return;
    formikProps.setFieldValue(`${element}.percentage`, Math.min(cgpa * 9.5, 100).toFixed(2), false);
  };

  const setCgpaFromPercentage = (value: string) => {
    if (value === "") {
      formikProps.setFieldValue(`${element}.cgpa`, "", false);
      return;
    }
    const percentage = Number(value);
    if (!Number.isFinite(percentage)) return;
    formikProps.setFieldValue(`${element}.cgpa`, Math.min(percentage / 9.5, 10).toFixed(2), false);
  };

  // Delegates to the app-wide policy so this control cannot drift from the limit its
  // own hint advertises. It previously enforced 5MB and matched on `file.type`, which
  // is empty on Windows for some picks — a valid PDF could be rejected as "not allowed".
  const validateAcademicFile = (file: File) => validateDocumentFile(file) ?? "";

  const handleAcademicFile = async (file: File | null) => {
    if (!file) {
      formikProps.setFieldValue(`${element}.filePath`, "");
      formikProps.setFieldValue(`${element}.fileName`, "");
      setEducationFile?.(index, null);
      setUploadError("");
      return;
    }

    const validationError = validateAcademicFile(file);
    if (validationError) {
      setUploadError(validationError);
      return;
    }

    setUploadError("");
    formikProps.setFieldValue(`${element}.fileName`, file.name, false);

    if (!userId) {
      setEducationFile?.(index, file);
      return;
    }

    const employeeName = `${formikProps.values.firstName}-${formikProps.values.lastName}` || "employee";
    const fileExtension = file.name.split(".").pop();
    const customFileName = `${employeeName.toLowerCase().replace(/\s+/g, "")}-education-${index + 1}.${fileExtension}`;
    const form = new FormData();
    form.append("file", new File([file], customFileName, { type: file.type }));

    try {
      setIsUploading(true);
      const {
        data: { path },
      } = await uploadUserAsset(form, userId, customFileName, "education-docs");
      formikProps.setFieldValue(`${element}.filePath`, path, true);
      formikProps.setFieldValue(`${element}.fileName`, file.name, false);
    } catch (error) {
      setUploadError("Failed to upload file. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Stack spacing={2}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography
          sx={{
            fontSize: 12.5,
            fontWeight: 600,
            color: "text.secondary",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {title}
        </Typography>
        {canRemove ? (
          <ActionIconButton
            title={`Remove education ${index + 1}`}
            iconName="trash"
            tone="danger"
            size="sm"
            onClick={() => onRemove?.()}
          />
        ) : null}
      </Box>

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" },
        }}
      >
        <WtFieldFormik name={`${element}.instituteName`} label="Institute Name" fullWidth />
        <Box className="education-popover-anchor" sx={{ position: "relative", minWidth: 0 }}>
          <WtField
            label="Qualification"
            fullWidth
            clearable
            searchable={qualificationSelectOptions.length >= 8}
            placeholder="Select Qualification"
            options={qualificationSelectOptions}
            value={String(education.qualificationMasterId || selectedQualification?.value || "")}
            onChange={handleQualificationValue}
            addOption={{ onAdd: () => { setShowNewQualification(true); setQualificationError(""); }, label: "Add New" }}
          />
          {showNewQualification && (
            <Box
              ref={qualificationPopoverRef}
              className="education-inline-popover"
              sx={{
                position: "absolute",
                zIndex: 20,
                top: "100%",
                left: 0,
                right: 0,
                mt: 0.5,
                p: 1.5,
                bgcolor: "background.paper",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                boxShadow: 3,
              }}
            >
              <WtField
                label="New Qualification Name"
                value={newQualificationName}
                onChange={setNewQualificationName}
                error={qualificationError || undefined}
                fullWidth
                autoFocus
              />
              <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 1.5 }}>
                <WtButton type="button" ghost size="small" onClick={() => setShowNewQualification(false)}>
                  Cancel
                </WtButton>
                <WtButton type="button" size="small" disabled={isSavingQualification} onClick={saveNewQualification}>
                  {isSavingQualification ? "Saving…" : "Save"}
                </WtButton>
              </Stack>
            </Box>
          )}
        </Box>

        {qualificationConfig.usesStream ? (
          <Box className="education-popover-anchor" sx={{ position: "relative", minWidth: 0 }}>
            <WtField
              label="Stream"
              fullWidth
              clearable
              placeholder="Select Stream"
              options={streamSelectOptions}
              value={String(education.stream || education.customStream || "")}
              onChange={handleStreamValue}
              addOption={{ onAdd: () => { setShowNewStream(true); setStreamError(""); }, label: "Add New" }}
            />
            {showNewStream && (
              <Box
                ref={streamPopoverRef}
                className="education-inline-popover"
                sx={{
                  position: "absolute",
                  zIndex: 20,
                  top: "100%",
                  left: 0,
                  right: 0,
                  mt: 0.5,
                  p: 1.5,
                  bgcolor: "background.paper",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  boxShadow: 3,
                }}
              >
                <WtField
                  label="New Stream Name"
                  value={newStreamName}
                  onChange={setNewStreamName}
                  error={streamError || undefined}
                  fullWidth
                  autoFocus
                />
                <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 1.5 }}>
                  <WtButton type="button" ghost size="small" onClick={() => setShowNewStream(false)}>
                    Cancel
                  </WtButton>
                  <WtButton type="button" size="small" onClick={saveNewStream}>
                    Save
                  </WtButton>
                </Stack>
              </Box>
            )}
          </Box>
        ) : qualificationConfig.usesSpecialization ? (
          <WtFieldFormik name={`${element}.specialization`} label="Degree/Course" fullWidth />
        ) : null}
      </Box>

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" },
        }}
      >
        {usesPassingYear ? (
          <WtFieldFormik name={`${element}.passingYear`} label="Passing Year" inputMode="numeric" fullWidth />
        ) : (
          <>
            <WtDateField
              label="Date Started"
              value={education.fromDate || null}
              onChange={(v) => formikProps.setFieldValue(`${element}.fromDate`, v ?? "")}
            />
            <WtDateField
              label="Date Completed"
              value={education.toDate || null}
              onChange={(v) => formikProps.setFieldValue(`${element}.toDate`, v ?? "")}
            />
          </>
        )}
        <WtField
          label="Percentage"
          value={education.percentage ?? ""}
          onChange={(v) => setCgpaFromPercentage(String(v))}
          inputMode="decimal"
          fullWidth
        />
        <WtField
          label="CGPA"
          value={education.cgpa ?? ""}
          onChange={(v) => setPercentageFromCgpa(String(v))}
          inputMode="decimal"
          fullWidth
        />
      </Box>

      <Box sx={{ maxWidth: { md: "50%" }, minWidth: 0 }}>
        <Typography sx={{ fontSize: 12.5, fontWeight: 700, mb: 1, color: "text.secondary" }}>
          Upload Academic Document
        </Typography>
        <ObFileUpload
          accept={DOCUMENT_ACCEPT}
          hint={DOCUMENT_HINT}
          disabled={isUploading}
          existingFileName={education.fileName || getFileNameFromUrl(education.filePath)}
          existingFileUrl={education.filePath || undefined}
          onChange={handleAcademicFile}
        />
        <ObUploadStatus
          state={
            isUploading
              ? "uploading"
              : education.filePath
                ? "saved"
                : education.fileName
                  ? "pending"
                  : "idle"
          }
          error={uploadError || undefined}
        />
      </Box>
    </Stack>
  );
}

export default EducationalInfo;
