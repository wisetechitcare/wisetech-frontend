import React, { useState } from "react";
import TextInput from "app/modules/common/inputs/TextInput";
import { uploadUserAsset } from "@services/uploader"; // updated import

function BankInfo({ formikProps, userId }: any) {
    const [showInfo, setShowInfo] = useState(false);

    const uploadFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const {
            target: { files },
        } = event;
        if (files && files.length > 0) {
            const form = new FormData();
            form.append("file", files[0]);
            try {
                const {
                    data: { path },
                } = await uploadUserAsset(form, userId, 'passbook', 'bank-docs');
                formikProps.setFieldValue("bankInfo.filePath", path, true);
                console.log("File uploaded successfully!");
            } catch (error) {
                console.error("Failed to upload file. Please try again.");
            }
        }
    };

    return (
        <div className="d-flex flex-column gap-4">
  {/* Row 1: Account Number, Account Holder Name */}
  <div className="row g-3">
    <div className="col-lg-6 col-md-6 col-sm-12">
      <TextInput
        isRequired={false}
        label="Account Number"
        formikField="bankInfo.accountNumber"
        margin="mb-0"
      />
    </div>

    <div className="col-lg-6 col-md-6 col-sm-12">
      <TextInput
        isRequired={false}
        label="Account Holder Name"
        formikField="bankInfo.accountName"
        margin="mb-0"
      />
    </div>
  </div>

  {/* Row 2: IFSC Code, Attach Document */}
  <div className="row g-3">
    <div className="col-lg-6 col-md-6 col-sm-12">
      <TextInput
        isRequired={false}
        label="IFSC Code"
        formikField="bankInfo.ifscCode"
        margin="mb-0"
      />
    </div>

    <div className="col-lg-6 col-md-6 col-sm-12">
      <label className="d-flex align-items-center fs-6 form-label mb-2">
        <span>Attach Document</span>
      </label>

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

      <div
        onClick={() => !userId && setShowInfo(true)}
        style={{ cursor: !userId ? "not-allowed" : "auto" }}
      >
        <input
          type="file"
          className="form-control form-control-lg form-control-solid mt-n2"
          onChange={uploadFile}
          disabled={!userId}
          style={{ pointerEvents: !userId ? "none" : "auto" }}
          title={!userId ? "Please save user details first" : ""}
        />
      </div>

      {formikProps.touched.filePath && formikProps.errors.filePath && (
        <div className="fv-plugins-message-container">
          <div className="fv-help-block">{formikProps.errors.filePath}</div>
        </div>
      )}
    </div>
  </div>
</div>

    );
}

export default BankInfo;