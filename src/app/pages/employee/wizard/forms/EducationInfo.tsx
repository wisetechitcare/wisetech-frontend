import React, { useEffect, useMemo, useRef, useState } from "react";
import DateInput from "@app/modules/common/inputs/DateInput";
import DropDownInput from "@app/modules/common/inputs/DropdownInput";
import TextInput from "@app/modules/common/inputs/TextInput";
import { createQualificationMaster } from "@services/employee";
import { uploadUserAsset } from "@services/uploader";
import ObFileUpload from "../components/ObFileUpload";
import { getEducationDisplayTitle, getQualificationConfig, resetEducationFieldsForQualification } from "../../../../../utils/educationUtils";

const ADD_NEW_QUALIFICATION = "__ADD_NEW__";
const ADD_NEW_STREAM = "__ADD_NEW_STREAM__";
const DEFAULT_HSC_STREAM_OPTIONS = [
  { value: "Science", label: "Science" },
  { value: "Commerce", label: "Commerce" },
  { value: "Arts", label: "Arts" },
];
const MAX_ACADEMIC_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_ACADEMIC_FILE_TYPES = ["application/pdf", "image/jpeg", "image/png"];

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

  const handleQualificationChange = (option: any) => {
    if (option?.value === ADD_NEW_QUALIFICATION) {
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

  const handleStreamChange = (option: any) => {
    if (option?.value === ADD_NEW_STREAM) {
      setShowNewStream(true);
      setStreamError("");
      return;
    }

    setShowNewStream(false);
    formikProps.setFieldValue(`${element}.stream`, option?.value || "");
    formikProps.setFieldValue(`${element}.customStream`, "");
  };

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

  const validateAcademicFile = (file: File) => {
    if (!ALLOWED_ACADEMIC_FILE_TYPES.includes(file.type)) {
      return "Only PDF, JPG, JPEG, and PNG files are allowed";
    }
    if (file.size > MAX_ACADEMIC_FILE_SIZE) {
      return "File size must be 5 MB or less";
    }
    if (file.size === 0) {
      return "The selected file appears to be empty or corrupted";
    }
    return "";
  };

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
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <p
          style={{
            fontFamily: "Inter",
            fontWeight: 600,
            fontSize: "14px",
            color: "#798DB3",
            textTransform: "uppercase",
            margin: 0,
          }}
        >
          {title}
        </p>
        {canRemove ? (
          <button
            type="button"
            className="btn btn-sm btn-icon btn-light-danger"
            aria-label={`Remove education ${index + 1}`}
            onClick={onRemove}
          >
            X
          </button>
        ) : (
          <div style={{ width: "20px", height: "20px" }} />
        )}
      </div>

      <div className="d-flex flex-column gap-4">
        <div className="row g-3">
          <div className="col-lg-4 col-md-6 col-sm-12">
            <TextInput isRequired={false} label="Institute Name" margin="mb-0" formikField={`${element}.instituteName`} />
          </div>
          <div className="col-lg-4 col-md-6 col-sm-12 education-popover-anchor">
            <DropDownInput
              isRequired={false}
              inputLabel="Qualification"
              formikField={`${element}.qualificationMasterId`}
              options={qualificationOptions}
              value={selectedQualification}
              onChange={handleQualificationChange}
              placeholder="Select Qualification"
            />
            {showNewQualification && (
              <div className="education-inline-popover" ref={qualificationPopoverRef}>
                <label className="form-label mb-2">New Qualification Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={newQualificationName}
                  onChange={(event: any) => setNewQualificationName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      saveNewQualification();
                    }
                  }}
                  autoFocus
                />
                {qualificationError && <div className="text-danger fs-7 mb-2">{qualificationError}</div>}
                <div className="d-flex justify-content-end gap-2 mt-3">
                  <button type="button" className="btn btn-sm btn-light" onClick={() => setShowNewQualification(false)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    disabled={isSavingQualification}
                    onClick={saveNewQualification}
                  >
                    {isSavingQualification ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {qualificationConfig.usesStream ? (
            <div className="col-lg-4 col-md-6 col-sm-12 education-popover-anchor">
              <DropDownInput
                isRequired={false}
                inputLabel="Stream"
                formikField={`${element}.stream`}
                options={hscStreamOptions}
                value={selectedStream}
                onChange={handleStreamChange}
                placeholder="Select Stream"
              />
              {showNewStream && (
                <div className="education-inline-popover" ref={streamPopoverRef}>
                  <label className="form-label mb-2">New Stream Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newStreamName}
                    onChange={(event: any) => setNewStreamName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        saveNewStream();
                      }
                    }}
                    autoFocus
                  />
                  {streamError && <div className="text-danger fs-7 mb-2">{streamError}</div>}
                  <div className="d-flex justify-content-end gap-2 mt-3">
                    <button type="button" className="btn btn-sm btn-light" onClick={() => setShowNewStream(false)}>
                      Cancel
                    </button>
                    <button type="button" className="btn btn-sm btn-primary" onClick={saveNewStream}>
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : qualificationConfig.usesSpecialization ? (
            <div className="col-lg-4 col-md-6 col-sm-12">
              <TextInput isRequired={false} label="Degree/Course" margin="mb-0" formikField={`${element}.specialization`} />
            </div>
          ) : null}
        </div>

        <div className="row g-3">
          {usesPassingYear ? (
            <div className="col-lg-4 col-md-6 col-sm-12">
              <TextInput
                isRequired={false}
                label="Passing Year"
                margin="mb-0"
                formikField={`${element}.passingYear`}
                inputValidation="numbers"
                type="text"
              />
            </div>
          ) : (
            <>
              <div className="col-lg-4 col-md-6 col-sm-12">
                <DateInput formikField={`${element}.fromDate`} isRequired={false} formikProps={formikProps} inputLabel="Date Started" placeHolder="Date Started" />
              </div>
              <div className="col-lg-4 col-md-6 col-sm-12">
                <DateInput formikField={`${element}.toDate`} isRequired={false} formikProps={formikProps} inputLabel="Date Completed" placeHolder="Date Completed" maxDate />
              </div>
            </>
          )}

          <div className="col-lg-4 col-md-6 col-sm-12">
            <TextInput
              isRequired={false}
              label="Percentage"
              margin="mb-0"
              formikField={`${element}.percentage`}
              inputValidation="decimal"
              onChange={(event: any) => setCgpaFromPercentage(event.target.value)}
            />
          </div>
          <div className="col-lg-4 col-md-6 col-sm-12">
            <TextInput
              isRequired={false}
              label="CGPA"
              margin="mb-0"
              formikField={`${element}.cgpa`}
              inputValidation="decimal"
              onChange={(event: any) => setPercentageFromCgpa(event.target.value)}
            />
          </div>
        </div>

        <div className="row g-3">
          <div className="col-lg-6 col-md-12 col-sm-12">
            <label className="mb-2 fw-bold">Upload Academic Document</label>

            {!userId && showInfo && (
              <div className="alert alert-info d-flex align-items-center p-3 mb-2" role="alert">
                <i className="bi bi-info-circle fs-5 me-2"></i>
                <small>The selected document will upload after the user details are saved.</small>
              </div>
            )}

            {(education.filePath || education.fileName) && (
              <div className="mb-3 p-3 bg-light rounded">
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                  <div>
                    <small className="text-muted">{education.filePath ? "Uploaded document" : "Selected document"}</small>
                    <div className="fw-bold text-primary text-break">
                      {education.fileName || getFileNameFromUrl(education.filePath)}
                    </div>
                    <small className={education.filePath ? "text-success" : "text-muted"}>
                      {education.filePath ? "Upload successful" : "Upload pending until final save"}
                    </small>
                  </div>
                  <div className="d-flex gap-2 flex-wrap">
                    {education.filePath && (
                      <a href={education.filePath} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-primary">
                        Preview
                      </a>
                    )}
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => {
                      formikProps.setFieldValue(`${element}.filePath`, "");
                      formikProps.setFieldValue(`${element}.fileName`, "");
                      setEducationFile?.(index, null);
                    }}>
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            )}

            <ObFileUpload
              accept=".pdf,.jpg,.jpeg,.png"
              hint="PDF, JPG or PNG — max 5MB"
              disabled={isUploading || !userId}
              existingFileName={education.fileName || getFileNameFromUrl(education.filePath)}
              onDisabledClick={() => setShowInfo(true)}
              onChange={handleAcademicFile}
            />
            {isUploading && <small className="text-primary">Uploading...</small>}
            {uploadError && <div className="text-danger fs-7 mt-1">{uploadError}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default EducationalInfo;
