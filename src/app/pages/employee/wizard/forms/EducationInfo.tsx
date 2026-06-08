import React, { useState } from "react";
import DateInput from "app/modules/common/inputs/DateInput";
import TextInput from "app/modules/common/inputs/TextInput";
import { uploadUserAsset } from "@services/uploader";

function EducationalInfo({ formikProps, index, userId }: any) {
  const element = `educationalInfo[${index}]`;
  const [showInfo, setShowInfo] = useState(false);

  // Helper function to extract filename from AWS URL
  const getFileNameFromUrl = (url: string) => {
    if (!url) return "";
    try {
      // Extract filename from URL path
      const urlParts = url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      return decodeURIComponent(fileName);
    } catch (error) {
      return "Unknown file";
    }
  };
  
  const uploadFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const {
      target: { files },
    } = event;
    if (files && files.length > 0) {
      const file = files[0];
      
      // Create custom filename: employeename-educationalinfo
      const employeeName = `${formikProps.values.firstName}-${formikProps.values.lastName}` || 'employee';
      const fileExtension = file.name.split('.').pop();
      const customFileName = `${employeeName.toLowerCase().replace(/\s+/g, '')}-educationalinfo.${fileExtension}`;
      
      const form = new FormData();
      // Create a new file with custom name
      const renamedFile = new File([file], customFileName, { type: file.type });
      form.append("file", renamedFile);
      
      try {
        const {
          data: { path },
        } = await uploadUserAsset(form, userId, customFileName, 'education-docs');
        formikProps.setFieldValue(`${element}.filePath`, path, true);
        console.log("File uploaded successfully!");
      } catch (error) {
        console.error("Failed to upload file. Please try again.");
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
  {/* Education header with delete icon */}
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '8px',
    }}
  >
    <p
      style={{
        fontFamily: 'Inter',
        fontWeight: 500,
        fontSize: '14px',
        color: '#798DB3',
        textTransform: 'uppercase',
        margin: 0,
      }}
    >
      Education {index + 1}
    </p>
    {/* Delete icon placeholder */}
    <div style={{ width: '20px', height: '20px', cursor: 'pointer' }}>
      {/* Add delete icon here if needed */}
    </div>
  </div>

  <div className="d-flex flex-column gap-4">
    {/* Row 1: Institute, Degree, Specialization */}
    <div className="row g-3">
      <div className="col-lg-4 col-md-6 col-sm-12">
        <TextInput
          isRequired={false}
          label="Institute Name"
          margin="mb-0"
          formikField={`${element}.instituteName`}
        />
      </div>

      <div className="col-lg-4 col-md-6 col-sm-12">
        <TextInput
          isRequired={false}
          label="Degree/Diploma"
          margin="mb-0"
          formikField={`${element}.degree`}
        />
      </div>

      <div className="col-lg-4 col-md-6 col-sm-12">
        <TextInput
          isRequired={false}
          label="Specialization"
          margin="mb-0"
          formikField={`${element}.specialization`}
        />
      </div>
    </div>

    {/* Row 2: Date Started, Date Completed, Document Upload */}
    <div className="row g-3">
      <div className="col-lg-4 col-md-6 col-sm-12">
        <DateInput
          formikField={`${element}.fromDate`}
          isRequired={false}
          formikProps={formikProps}
          inputLabel="Date Started"
          placeHolder="Date Started"
        />
      </div>

      <div className="col-lg-4 col-md-6 col-sm-12">
        <DateInput
          formikField={`${element}.toDate`}
          isRequired={false}
          formikProps={formikProps}
          inputLabel="Date Completed"
          placeHolder="Date Completed"
        />
      </div>

      {/* File Upload Section */}
      <div className="col-lg-4 col-md-6 col-sm-12">
        <label className="mb-3 fw-bold">Upload Document File</label>

        {!userId && showInfo && (
          <div
            className="alert alert-info d-flex align-items-center p-3 mb-2"
            role="alert"
          >
            <i className="bi bi-info-circle fs-5 me-2"></i>
            <small>
              <strong>Info:</strong> Please save the user details first before
              uploading documents.
            </small>
          </div>
        )}

        {/* Show existing document if available */}
        {userId && formikProps.values[element]?.filePath && (
          <div className="mb-3 p-3 bg-light rounded">
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
              <div>
                <small className="text-muted">Current document:</small>
                <div className="fw-bold text-primary text-break">
                  📎 {getFileNameFromUrl(formikProps.values[element].filePath)}
                </div>
              </div>
              <div className="d-flex gap-2 flex-wrap">
                <a
                  href={formikProps.values[element].filePath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm btn-outline-primary"
                >
                  View
                </a>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  onClick={() =>
                    formikProps.setFieldValue(`${element}.filePath`, '')
                  }
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        )}

        <div
          onClick={() => !userId && setShowInfo(true)}
          style={{ cursor: !userId ? 'not-allowed' : 'auto' }}
        >
          <input
            type="file"
            accept=".doc,.docx,.pdf,.jpg,.jpeg,.png,.xls,.xlsx"
            className="form-control form-control-lg form-control-solid"
            onChange={uploadFile}
            disabled={!userId}
            style={{ pointerEvents: !userId ? 'none' : 'auto' }}
            title={!userId ? 'Please save user details first' : ''}
          />
        </div>
        {formikProps.touched[element]?.filePath &&
          formikProps.errors[element]?.filePath && (
            <div className="fv-plugins-message-container">
              <div className="fv-help-block">
                {formikProps.errors[element].filePath}
              </div>
            </div>
          )}
      </div>
    </div>
  </div>
</div>

  );
}

export default EducationalInfo;
